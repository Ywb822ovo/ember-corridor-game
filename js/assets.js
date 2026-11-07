(function(root){
  'use strict';
  // URL cache is shared across retries and chapter starts; rejected entries are evicted.
  class Loader{
    constructor({ImageClass=root.Image,timeout=15000}={}){
      this.ImageClass=ImageClass;this.timeout=timeout;this.cache=new Map();
    }
    load(src){
      if(this.cache.has(src))return this.cache.get(src);
      const promise=new Promise((resolve,reject)=>{
        const image=new this.ImageClass();
        const timer=setTimeout(()=>{
          reject(new Error('素材加载超时，请检查网络后重试。'));
          // Detach the stalled image so a retry does not share its pending decode.
          image.src='';
        },this.timeout);
        Promise.resolve().then(()=>{image.src=src;return image.decode();}).then(()=>{clearTimeout(timer);resolve(image);},()=>{clearTimeout(timer);reject(new Error('素材加载失败，请检查网络后重试。'));});
      }).catch(error=>{if(this.cache.get(src)===promise)this.cache.delete(src);throw error;});
      this.cache.set(src,promise);return promise;
    }
    async prepare(sources,onProgress=()=>{}){
      let completed=0;onProgress(0,sources.length);
      return Promise.all(sources.map(async src=>{const image=await this.load(src);onProgress(++completed,sources.length);return image;}));
    }
  }
  const api={Loader};if(typeof module==='object'&&module.exports)module.exports=api;else root.DungeonAssets=api;
})(typeof globalThis!=='undefined'?globalThis:this);

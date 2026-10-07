(function(root,factory){
  const api=factory(root);
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.SCDNativeAdapters=api;
})(typeof globalThis==='object'?globalThis:null,function(root){
  'use strict';

  const unavailable=async()=>{throw new Error('NATIVE_ADAPTER_UNAVAILABLE')};

  async function share(payload){
    const nativeShare=root?.Capacitor?.Plugins?.Share;
    if(typeof nativeShare?.share==='function')return nativeShare.share(payload);
    if(typeof root?.navigator?.share==='function')return root.navigator.share(payload);
    const copy=payload?.text||payload?.url||'';
    if(copy&&typeof root?.navigator?.clipboard?.writeText==='function'){
      await root.navigator.clipboard.writeText(copy);
      return {method:'clipboard'};
    }
    return false;
  }

  return Object.freeze({
    share,
    deepLinks:Object.freeze({
      navigate(route){return root?.SCDNextGen?.setView(route)===true}
    }),
    push:Object.freeze({register:unavailable}),
    media:Object.freeze({capture:unavailable}),
    secureStorage:Object.freeze({get:unavailable,set:unavailable,remove:unavailable})
  });
});

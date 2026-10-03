(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.SCDOneRouter=api;
})(typeof globalThis==='object'?globalThis:null,function(){
  'use strict';

  const routeToView=Object.freeze({
    home:'pulse',
    calendar:'calendar',
    teams:'teams',
    social:'social',
    profile:'twin',
    desk:'desk',
    pulse:'pulse',
    twin:'twin'
  });
  const viewToRoute=Object.freeze({
    pulse:'home',
    calendar:'calendar',
    teams:'teams',
    social:'social',
    twin:'profile',
    desk:'desk'
  });
  const canonicalRoutes=Object.freeze(['home','calendar','teams','social','profile','desk']);

  function text(value){return value==null?'':String(value).trim()}
  function canonicalRoute(value){
    const raw=text(value).replace(/^#/,'').toLowerCase();
    if(raw==='pulse')return 'home';
    if(raw==='twin')return 'profile';
    return canonicalRoutes.includes(raw)?raw:null;
  }
  function parseQuery(query=''){
    const params={};
    const raw=text(query).replace(/^\\?/,'');
    if(!raw)return params;
    for(const pair of raw.split('&')){
      if(!pair)continue;
      const [key,...rest]=pair.split('=');
      if(!key)continue;
      try{
        params[decodeURIComponent(key)]=decodeURIComponent(rest.join('=')||'');
      }catch{
        params[key]=rest.join('=')||'';
      }
    }
    return params;
  }
  function parseHash(hash=''){
    const raw=text(hash).replace(/^#/,'');
    const split=raw.split('?');
    const rawRoute=(split.shift()||'home').toLowerCase();
    const route=canonicalRoute(rawRoute)||'home';
    return {
      rawRoute,
      route,
      view:routeToView[route]||'pulse',
      params:parseQuery(split.join('?'))
    };
  }
  function buildHash(route,params={}){
    const canonical=canonicalRoute(route)||'home';
    const pairs=[];
    for(const [key,value] of Object.entries(params||{})){
      const k=text(key),v=text(value);
      if(!k||!v)continue;
      pairs.push(encodeURIComponent(k)+'='+encodeURIComponent(v));
    }
    return '#'+canonical+(pairs.length?'?'+pairs.join('&'):'');
  }
  function teamHash(team){return buildHash('teams',{team:text(team)})}

  return Object.freeze({routeToView,viewToRoute,canonicalRoutes,canonicalRoute,parseHash,buildHash,teamHash});
});

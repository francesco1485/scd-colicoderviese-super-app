const CACHE='scd-r30-upstream-resilience-v1';
const CORE=['./','./index.html','./delete-account.html','./styles.css?v=21.10.0','./ui-r21-11.css?v=21.15.0','./ui-r24-shell.css?v=24.0.0','./ui-r26-pulse.css?v=26.0.0','./app.js?v=30.0.0','./app-r24-router.js?v=28.0.0','./manifest.webmanifest','./assets/logo-scd.png','./assets/hero-colico.webp','./assets/sky.png','./assets/icon-192.png','./assets/icon-512.png'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(CORE)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET')return;
  const u=new URL(e.request.url);
  if(u.pathname.includes('/api/'))return;
  if(['document','script','style','manifest'].includes(e.request.destination)){
    e.respondWith(fetch(e.request,{cache:'no-store'}).catch(()=>caches.match(e.request).then(r=>r||caches.match('./index.html'))));
    return;
  }
  e.respondWith(caches.match(e.request).then(cached=>cached||fetch(e.request).then(r=>{const copy=r.clone();caches.open(CACHE).then(c=>c.put(e.request,copy));return r})));
});
self.addEventListener('notificationclick',event=>{event.notification.close();const url=(event.notification.data&&event.notification.data.url)||'./#/pulse';event.waitUntil(clients.matchAll({type:'window',includeUncontrolled:true}).then(list=>{for(const c of list){if('focus' in c)return c.focus()}return clients.openWindow?clients.openWindow(url):undefined}))});

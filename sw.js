/* Offline application shell only. NEVER cache API predictions as if they were live. */
const CACHE='route91-shell-v5';
const SHELL=['./index.html','./manifest.webmanifest','./icons/icon-180.png','./icons/icon-192.png','./icons/icon-512.png'];
self.addEventListener('install',event=>{
 event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(SHELL)));
 self.skipWaiting();
});
self.addEventListener('activate',event=>{
 event.waitUntil(Promise.all([
  caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key)))),
  self.clients.claim()
 ]));
});
self.addEventListener('fetch',event=>{
 const req=event.request;
 if(req.method!=='GET'||new URL(req.url).origin!==self.location.origin)return;
 const u=new URL(req.url);
 if(u.pathname.endsWith('/index.html')||u.pathname==='/'||u.pathname.endsWith('/')){
  event.respondWith(fetch(req).then(res=>{
   if(res.ok){const copy=res.clone();caches.open(CACHE).then(c=>c.put('./index.html',copy)).catch(()=>{});}
   return res;
  }).catch(()=>caches.match('./index.html')));
  return;
 }
 if(/\.(?:png|webmanifest)$/.test(u.pathname))event.respondWith(caches.match(req).then(r=>r||fetch(req)));
});

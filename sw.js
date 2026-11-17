/* Dhaara service worker: makes the site installable; always tries the network first so updates show at once */
const C="dhaara-v3";
self.addEventListener("install",e=>{self.skipWaiting();e.waitUntil(caches.open(C).then(c=>c.addAll(["./","index.html","intro.jpg","icon-192.png"]).catch(()=>{})))});
self.addEventListener("activate",e=>e.waitUntil(self.clients.claim()));
self.addEventListener("fetch",e=>{const u=new URL(e.request.url);if(e.request.method!=="GET"||u.origin!==location.origin)return;
 const net=(e.request.mode==="navigate"||/\.(html|json)$|\/$/.test(u.pathname))?fetch(u.href,{cache:"no-cache",credentials:"same-origin"}):fetch(e.request);
 e.respondWith(net.then(r=>{if(r.ok&&!u.pathname.includes("/briefs/")){const cp=r.clone();caches.open(C).then(c=>c.put(e.request,cp))}return r}).catch(()=>caches.match(e.request).then(r=>r||caches.match("index.html"))))});

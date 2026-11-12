const CACHE='syn-study-shell-1.4.3';
const ASSETS=['./','./index.html','./styles.css','./app.js','./content.js','./advanced-content.js','./foundation-content.js','./foundation-questions.js','./syllabus.js','./foundation-models.js','./seminar-content.js','./proofs-first-year.js','./proofs-second-year.js','./proofs.js','./reading-ui.js','./cheatsheet.js','./legacy-solutions.js','./legacy-first-year.js','./legacy-second-year.js','./legacy-test.js','./year-two-content.js','./year-two-questions.js','./year-two-models.js','./models.js','./core.js','./icon.svg','./manifest.webmanifest'];
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS.map(url=>new Request(url,{cache:'reload'})))).then(()=>self.skipWaiting()));});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('syn-study-shell-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',event=>{
 if(event.request.method!=='GET'||new URL(event.request.url).origin!==self.location.origin)return;
 event.respondWith(fetch(event.request,{cache:'no-cache'}).then(response=>{
  if(response.ok){const saved=response.clone();event.waitUntil(caches.open(CACHE).then(cache=>cache.put(event.request,saved)));}
  return response;
 }).catch(()=>caches.match(event.request).then(hit=>hit||(event.request.mode==='navigate'?caches.match('./index.html'):Response.error()))));
});

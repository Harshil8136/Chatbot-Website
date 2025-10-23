const CACHE_NAME = 'aurora-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/assets/css/styles.css',
  '/assets/js/main.js',
  '/assets/js/utils/dom.js',
  '/assets/js/utils/dates.js',
  '/assets/js/chatbot/nlu.js',
  '/assets/js/chatbot/knowledge.js',
  '/assets/js/chatbot/engine.js',
  '/assets/images/room-deluxe.svg',
  '/assets/images/room-lakeside.svg',
  '/assets/images/room-loft.svg'
];
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(ASSETS)));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(self.clients.claim());
});
self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((res) => res || fetch(e.request).then((resp) => {
      const copy = resp.clone();
      caches.open(CACHE_NAME).then((c) => c.put(e.request, copy));
      return resp;
    }).catch(() => caches.match('/index.html')))
  );
});
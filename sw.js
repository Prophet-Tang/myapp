// Service Worker：缓存静态资源，让 PWA 能离线打开
// 改代码后记得把 CACHE 版本号 +1，浏览器才会拉新文件
const CACHE = 'fitness-v3';
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './manifest.json',
  './icon.svg',
  './icon-180.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// 网络优先：先联网拿最新文件，拿不到（离线）才用缓存。
// 这样改完代码刷新就能看到新效果，不用每次改版本号。
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);

  // 只管本站的 GET 请求，其他（跨域等）交给浏览器默认处理
  if (e.request.method !== 'GET' || url.origin !== self.location.origin) return;

  e.respondWith(
    fetch(e.request)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(e.request, copy));
        return res;
      })
      .catch(() =>
        // 离线且缓存里也没有时，返回一个错误响应，而不是报错崩溃
        caches.match(e.request).then((cached) => cached || Response.error())
      )
  );
});

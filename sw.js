// 오프라인에서도 열리도록 앱 파일을 캐시합니다.
// 캐시를 먼저 보여주고 백그라운드에서 새 버전을 받아오므로, 배포 후 두 번째 실행부터 새 버전이 보입니다.
const CACHE = 'carejh-v2';
const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/app.css',
  './js/app.js',
  './js/util.js',
  './js/icons.js',
  './js/characters.js',
  './js/score.js',
  './js/constants.js',
  './js/store.js',
  './js/metrics.js',
  './js/sheet.js',
  './js/charts.js',
  './js/views/today.js',
  './js/views/calendar.js',
  './js/views/stats.js',
  './js/views/settings.js',
  './js/views/onboarding.js',
  './fonts/Pretendard-Regular.subset.woff2',
  './fonts/Pretendard-SemiBold.subset.woff2',
  './fonts/Pretendard-Bold.subset.woff2',
  './fonts/Pretendard-ExtraBold.subset.woff2',
  './icons/icon.svg',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const cached = await cache.match(req, { ignoreSearch: true });
      const network = fetch(req)
        .then((res) => {
          if (res.ok) cache.put(req, res.clone());
          return res;
        })
        .catch(() => cached || (req.mode === 'navigate' ? cache.match('./index.html') : undefined));
      return cached || network;
    })
  );
});

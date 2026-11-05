// saves the games on the phone so they work offline.
// new game=change the version number (add its files to PRECACHE).
const CACHE = "mini-games-v4";
const PRECACHE = [
  "./", "index.html", "style.css", "manifest.webmanifest",
  "memory-game/", "memory-game/index.html", "memory-game/style.css", "memory-game/script.js",
  "simon-says/", "simon-says/index.html", "simon-says/style.css", "simon-says/script.js",
  "snake/", "snake/index.html", "snake/style.css", "snake/script.js",
  "whack-a-mole/", "whack-a-mole/index.html", "whack-a-mole/style.css", "whack-a-mole/script.js",
  "icons/icon-192.png", "icons/icon-512.png", "icons/apple-touch-icon.png"
];

// save every file in the list.
self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

// delete old saved versions.
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// show the saved copy right away, and quietly refresh it from the internet.
self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then((cached) => {
      const network = fetch(e.request)
        .then((res) => {
          if (res && (res.ok || res.type === "opaque")) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(e.request, copy));
          }
          return res;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
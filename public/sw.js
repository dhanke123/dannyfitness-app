/* ExerciseOnly service worker.

   The previous version cached every GET network-first, including the app shell and
   (once the backend is wired) every Supabase response. Two bugs fall out of that:
   a deploy doesn't reach anyone still holding a cached index.html, and a member's
   bookings, credits and payments end up sitting in the browser cache where a stale
   copy can be served after a cancellation.

   Strategy now:
     · App shell (HTML)      → network-first, cache as fallback. Always tries fresh.
     · Static build assets   → cache-first. Vite fingerprints filenames, so a cached
                               asset is immutable and a new build gets a new URL.
     · Supabase / any API    → NEVER cached. Network only, no fallback.
     · Everything else       → network, falling back to cache when offline.

   CACHE_VERSION must change on every deploy. Bump the number below whenever
   you push to Vercel. In CI you can automate this:
     sed -i "s/CACHE_VERSION = .*/CACHE_VERSION = \"v$(date +%Y%m%d%H%M)\";/" public/sw.js
   Failing to bump means existing users keep the old cache and never get the update. */

const CACHE_VERSION = "v3";  // bumped 27 Jul 2026 — bump again on next deploy
const SHELL_CACHE = `eo-shell-${CACHE_VERSION}`;
const ASSET_CACHE = `eo-assets-${CACHE_VERSION}`;

// Never cache anything that talks to a backend — this is the important line.
const NEVER_CACHE = [
  /\/auth\/v1\//,        // Supabase auth (tokens, OTP)
  /\/rest\/v1\//,        // PostgREST — bookings, credits, payments
  /\/realtime\/v1\//,
  /\/storage\/v1\//,     // receipts, waivers — private, signed URLs
  /\/functions\/v1\//,   // edge functions (HitPay, notifications)
  /supabase\.co/,
  /hitpay/i,
];

const isApi = (url) => NEVER_CACHE.some((re) => re.test(url));
const isAsset = (url) => /\/assets\/.+\.(js|css|woff2?|png|svg|jpg|webp)$/.test(url);

self.addEventListener("install", (e) => {
  self.skipWaiting(); // a new deploy takes over immediately
  e.waitUntil(caches.open(SHELL_CACHE).then((c) => c.addAll(["/", "/index.html"])).catch(() => {}));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => k !== SHELL_CACHE && k !== ASSET_CACHE).map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;

  const url = req.url;
  if (!url.startsWith("http")) return;

  // 1. Backend traffic: straight to the network, never stored, no offline fallback.
  //    Serving a stale booking or credit balance is worse than showing an error.
  if (isApi(url)) return;

  // 2. Fingerprinted build assets: cache-first, they can't change under a given name.
  if (isAsset(url)) {
    e.respondWith(
      caches.match(req).then((hit) => hit || fetch(req).then((res) => {
        if (res.ok) { const copy = res.clone(); caches.open(ASSET_CACHE).then((c) => c.put(req, copy)).catch(() => {}); }
        return res;
      }))
    );
    return;
  }

  // 3. Navigations / HTML: network-first so a deploy is picked up, cache as the
  //    offline fallback so the installed PWA still opens on a bad connection.
  if (req.mode === "navigate" || (req.headers.get("accept") || "").includes("text/html")) {
    e.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok) { const copy = res.clone(); caches.open(SHELL_CACHE).then((c) => c.put("/index.html", copy)).catch(() => {}); }
          return res;
        })
        .catch(() => caches.match("/index.html").then((r) => r || caches.match("/")))
    );
    return;
  }

  // 4. Anything else (fonts, icons): network, cache as fallback.
  e.respondWith(fetch(req).catch(() => caches.match(req)));
});

/* Let the page trigger an immediate update after a deploy prompt. */
self.addEventListener("message", (e) => {
  if (e.data === "SKIP_WAITING") self.skipWaiting();
});

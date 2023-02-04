const VERSION = "5.2.0"; /* update whenever anything changes */

self.addEventListener("install", event => {
    // console.log("PWA Install: " + VERSION);
    event.waitUntil((async () => {
        const assets = [
            "./",
            "./icon/ArrowGold.png",
            "./icon/character_symbol_annie01.png",
            "./icon/character_symbol_beowulf01.png",
            "./icon/character_symbol_bigband01.png",
            "./icon/character_symbol_blackdahlia01.png",
            "./icon/character_symbol_cerebella01.png",
            "./icon/character_symbol_custom01.png",
            "./icon/character_symbol_double01.png",
            "./icon/character_symbol_eliza01.png",
            "./icon/character_symbol_filia01.png",
            "./icon/character_symbol_fukua01.png",
            "./icon/character_symbol_marie01.png",
            "./icon/character_symbol_msfortune01.png",
            "./icon/character_symbol_painwheel01.png",
            "./icon/character_symbol_parasoul01.png",
            "./icon/character_symbol_peacock01.png",
            "./icon/character_symbol_robofortune01.png",
            "./icon/character_symbol_scribble01.png",
            "./icon/character_symbol_squigly01.png",
            "./icon/character_symbol_umbrella01.png",
            "./icon/character_symbol_valentine01.png",
            "./icon/CheckmarkBad.png",
            "./icon/CheckmarkGood.png",
            "./icon/kofi.png",
            "./icon/notblight.png",
            "./texture/Space.png",
            "./texture/fire.png",
            "./texture/killarainbow.png",
            "./texture/umbrella_veins.png",
            "./texture/water.png"
          ];
        const cache = await caches.open(VERSION);
        cache.addAll(assets);
    })());
});

self.addEventListener("activate", event => {
    // console.log("PWA Activate: " + VERSION);
    event.waitUntil((async () => {
        const keys = await caches.keys();
        keys.forEach(async (key) => {
            if (key !== VERSION) {
                // console.log("PWA Delete: " + key);
                await caches.delete(key);
            }
        });
    })());
});

self.addEventListener("fetch", event => {
    // console.log("PWA Fetch: " + VERSION);
    event.respondWith((async () => {
        const cache = await caches.open(VERSION);
        const cacheResponse = await cache.match(event.request);
        if (cacheResponse) {
            return cacheResponse;
        }
        else {
            try {
                const fetchResponse = await fetch(event.request);
                if (event.request.method === "GET") {
                    cache.put(event.request, fetchResponse.clone());
                }
                return fetchResponse;
            }
            catch (e) {
                // console.warn(e);
            }
        }
    })());
});

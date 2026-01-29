/*! coi-serviceworker v0.1.7 - Guido Zuidhof, licensed under MIT */
let coepCredentialless = false;
if (typeof window === 'undefined') {
  self.addEventListener("install", () => self.skipWaiting());
  self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));
  self.addEventListener("message", (ev) => {
    if (!ev.data) {
      return;
    } else if (ev.data.type === "deregister") {
      self.registration.unregister().then(() => {
        return self.clients.matchAll();
      }).then(clients => {
        clients.forEach(client => client.navigate(client.url));
      });
    } else if (ev.data.type === "coepCredentialless") {
      coepCredentialless = ev.data.value;
    }
  });
  self.addEventListener("fetch", function (event) {
    const r = event.request;
    if (r.cache === "only-if-cached" && r.mode !== "same-origin") {
      return;
    }
    const coepHeaders = new Headers(r.headers);
    if (coepCredentialless) {
      coepHeaders.set("Cross-Origin-Embedder-Policy", "credentialless");
      coepHeaders.set("Origin", self.location.origin);
    }
    event.respondWith(fetch(r, {
      headers: coepHeaders,
    }).then((response) => {
      if (response.status === 0) {
        return response;
      }
      const newHeaders = new Headers(response.headers);
      newHeaders.set("Cross-Origin-Embedder-Policy", coepCredentialless ? "credentialless" : "require-corp");
      if (!coepCredentialless) {
        newHeaders.set("Cross-Origin-Resource-Policy", "cross-origin");
      }
      newHeaders.set("Cross-Origin-Opener-Policy", "same-origin");
      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: newHeaders,
      });
    }).catch((e) => console.error(e)));
  });
} else {
  (() => {
    const reloadedBySelf = window.sessionStorage.getItem("coiReloadedBySelf");
    window.sessionStorage.removeItem("coiReloadedBySelf");
    const coepCredentialless2 = false;
    if (reloadedBySelf) {
      console.log("Coop/Coep Reloaded");
      return;
    }
    const n = navigator;
    if (n.serviceWorker && n.serviceWorker.controller) {
      n.serviceWorker.controller.postMessage({
        type: "coepCredentialless",
        value: coepCredentialless2
      });
      if (n.serviceWorker.controller.state === "activated") {
        return;
      }
    }
    n.serviceWorker.register(window.document.currentScript.src).then((registration) => {
      if (!window.sessionStorage.getItem("coiReloadedBySelf")) {
        window.sessionStorage.setItem("coiReloadedBySelf", "true");
        window.location.reload();
      }
      registration.addEventListener("updatefound", () => {
        window.location.reload();
      });
    });
  })();
}
/* SCD push worker (r67): shows call-up notifications and opens the app on tap. No caching, no fetch handler. */
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = { title: "S.C.D. ColicoDerviese", body: event.data ? event.data.text() : "" };
  }
  const title = typeof data.title === "string" && data.title ? data.title : "S.C.D. ColicoDerviese";
  const url = typeof data.url === "string" && data.url.startsWith("/") ? data.url : "/famiglia";
  const options = { body: typeof data.body === "string" ? data.body : "", icon: "/icon-512.png", badge: "/favicon.png", lang: "it", data: { url } };
  // renotify is only valid together with a tag.
  if (typeof data.tag === "string" && data.tag) {
    options.tag = data.tag;
    options.renotify = true;
  }
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/famiglia";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const c of list) {
        if (new URL(c.url).origin === self.location.origin && "focus" in c) {
          c.navigate(url).catch(() => undefined);
          return c.focus();
        }
      }
      return self.clients.openWindow(url);
    }),
  );
});

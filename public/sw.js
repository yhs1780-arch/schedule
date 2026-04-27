/* SyncNest Service Worker - 백그라운드 알림 지원 */
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", e => e.waitUntil(self.clients.claim()));

/* 스케줄된 알림 저장소 */
const scheduled = new Map(); // id -> timeoutId

self.addEventListener("message", event => {
  const { type, payload } = event.data ?? {};

  if (type === "SCHEDULE_NOTIFICATION") {
    const { id, title, body, delayMs, icon } = payload;
    if (scheduled.has(id)) clearTimeout(scheduled.get(id));
    if (delayMs <= 0) {
      fireNotification(title, body, icon);
      return;
    }
    const tid = setTimeout(() => {
      fireNotification(title, body, icon);
      scheduled.delete(id);
    }, delayMs);
    scheduled.set(id, tid);
  }

  if (type === "CANCEL_NOTIFICATION") {
    const { id } = payload;
    if (scheduled.has(id)) { clearTimeout(scheduled.get(id)); scheduled.delete(id); }
  }

  if (type === "CANCEL_ALL") {
    scheduled.forEach(tid => clearTimeout(tid));
    scheduled.clear();
  }
});

function fireNotification(title, body, icon) {
  self.registration.showNotification(title, {
    body,
    icon: icon ?? "/icon-192.png",
    badge: "/icon-192.png",
    vibrate: [200, 100, 200],
    tag: "syncnest-event",
    renotify: true,
  });
}

self.addEventListener("notificationclick", event => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: "window" }).then(clients => {
      if (clients.length) return clients[0].focus();
      return self.clients.openWindow("/dashboard");
    })
  );
});

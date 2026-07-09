/* eslint-disable no-undef */
// Firebase Cloud Messaging Service Worker
// This runs in the background to receive push notifications

importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: 'AIzaSyCRYDqA-JUOdszXhLDzQlPHoKAIyjvubgo',
  authDomain: 'buxar-news-3e075.firebaseapp.com',
  projectId: 'buxar-news-3e075',
  storageBucket: 'buxar-news-3e075.firebasestorage.app',
  messagingSenderId: '996657792968',
  appId: '1:996657792968:web:0c7f2f0249cfe9f04ca2fd',
});

const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage(function (payload) {
  var data = payload.data || payload.notification || {};
  var title = data.title || 'Buxar News';
  var body = data.body || 'New article published on Buxar News';
  var image = data.image || undefined;
  var clickAction = data.click_action || '/';

  var notificationOptions = {
    body: body,
    icon: '/icon-192.png',
    badge: '/icon-72.png',
    image: image,
    data: { url: clickAction },
    vibrate: [200, 100, 200],
    tag: 'buxar-news-' + Date.now(),
    actions: [
      { action: 'open', title: 'Read Now' },
      { action: 'dismiss', title: 'Dismiss' },
    ],
  };

  return self.registration.showNotification(title, notificationOptions);
});

// Handle notification click
self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  var url = event.notification.data && event.notification.data.url ? event.notification.data.url : '/';

  if (event.action === 'dismiss') {
    return;
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clientList) {
      for (var i = 0; i < clientList.length; i++) {
        var client = clientList[i];
        if (client.url.indexOf(self.location.origin) !== -1 && 'focus' in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      return clients.openWindow(url);
    })
  );
});

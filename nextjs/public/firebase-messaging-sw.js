// public/firebase-messaging-sw.js
importScripts('https://www.gstatic.com/firebasejs/9.6.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.6.1/firebase-messaging-compat.js');

const firebaseConfig = {
  apiKey: 'YOUR_API_KEY',
  authDomain: 'YOUR_AUTH_DOMAIN',
  projectId: 'YOUR_PROJECT_ID',
  storageBucket: 'YOUR_STORAGE_BUCKET',
  messagingSenderId: 'YOUR_MESSAGING_SENDER_ID',
  appId: 'YOUR_APP_ID',
  measurementId: 'YOUR_MEASUREMENT_ID'
};

firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();


messaging.onBackgroundMessage(function (payload) {
  if (!("Notification" in self)) {
    // Check if the browser supports notifications
    console.log("This browser does not support desktop notification");
  } else if (Notification.permission === 'granted') {
    self.registration.showNotification(payload.notification.title, {
      body: payload.notification.body,
      data: { url: payload.data?.deepLink },
      requireInteraction: true,
      actions: [{ action: 'open_url', title: 'Open' }]
    });
  }
});
// Add click handler for the notification
self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  const urlToOpen = event.notification.data?.url;
  if (urlToOpen) {
    clients.openWindow(urlToOpen);
  }
});


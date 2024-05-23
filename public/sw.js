self.addEventListener('push', function(event) {
    const data = event.data.json();
    const options = {
        body: data.body,
        icon: 'avatars/jan_ai_logo.webp', // Path to an icon
        actions: [
            {
                action: 'open',
                title: 'Open Chat',
                icon: 'avatars/jan_ai_logo.webp' // Path to an icon
            }
        ],
        data: {
            url: data.url // Add URL to notification data
        }
    };

    event.waitUntil(
        self.registration.showNotification(data.title, options)
    );
});

self.addEventListener('notificationclick', function(event) {
    event.notification.close();

    event.waitUntil(
        clients.matchAll({ type: 'window' }).then(windowClients => {
            for (let client of windowClients) {
                if (client.url === event.notification.data.url && 'focus' in client) {
                    return client.focus();
                }
            }
            if (clients.openWindow) {
                return clients.openWindow(event.notification.data.url);
            }
        })
    );
});

self.addEventListener('message', function(event) {
    if (event.data.type === 'notify') {
        const options = {
            body: event.data.body,
            icon: 'avatars/jan_ai_logo.webp',
            data: {
                url: location.href // Add URL to notification data
            }
        };
        self.registration.showNotification('New message', options);
    }
});

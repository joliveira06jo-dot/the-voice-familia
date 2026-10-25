// Service Worker mínimo para PWA.
// Não faz cache agressivo (Socket.io precisa de dados frescos sempre).

self.addEventListener('install', (event) => {
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
    // Handler vazio — necessário para o Chrome reconhecer como PWA instalável.
});

// Separate scope; never cache prices, inventory, authenticated pages or purchases.
export function GET(){return new Response("self.addEventListener('install',()=>self.skipWaiting());self.addEventListener('activate',e=>e.waitUntil(self.clients.claim()));",{headers:{'Content-Type':'application/javascript','Cache-Control':'no-store','Service-Worker-Allowed':'/ofertas/saldao-aline'}});}

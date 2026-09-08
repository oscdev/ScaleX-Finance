/** Tiny in-memory event bus for Live Run / offline journey publish hooks. */

const clients = new Set();

export function publish(event) {
  const payload = `data: ${JSON.stringify(event)}\n\n`;
  for (const res of clients) {
    try {
      res.write(payload);
    } catch {
      clients.delete(res);
    }
  }
}

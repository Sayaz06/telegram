const { NewMessage } = require('telegram/events');
const { getClient } = require('../telegramClient');

// Map untuk simpan WebSocket connections per phone
const wsConnections = new Map();

function setupWebSocket(wss) {
  wss.on('connection', async (ws, req) => {
    const url = new URL(req.url, 'http://localhost');
    const phone = url.searchParams.get('phone');

    if (!phone) {
      ws.close(1008, 'Phone required');
      return;
    }

    console.log(`📡 WS connected: ${phone}`);
    wsConnections.set(phone, ws);

    // Subscribe update dari Telegram
    try {
      const client = await getClient(phone);

      // Handler mesej baru
      client.addEventHandler(async (event) => {
        const msg = event.message;
        if (!msg) return;

        const payload = JSON.stringify({
          type: 'new_message',
          data: {
            id: msg.id,
            chatId: msg.chatId?.toString() || msg.peerId?.toString(),
            text: msg.message || '',
            date: msg.date,
            fromId: msg.fromId?.userId?.toString() || '',
            media: msg.media ? { type: msg.media.className } : null,
          }
        });

        if (ws.readyState === 1) ws.send(payload);
      }, new NewMessage({}));

    } catch (err) {
      console.error('WS setup error:', err);
      ws.close(1011, 'Client error');
    }

    ws.on('close', () => {
      console.log(`📡 WS disconnected: ${phone}`);
      wsConnections.delete(phone);
    });

    ws.on('error', (err) => console.error('WS error:', err));

    // Heartbeat
    ws.send(JSON.stringify({ type: 'connected', phone }));
  });
}

function sendToClient(phone, data) {
  const ws = wsConnections.get(phone);
  if (ws && ws.readyState === 1) {
    ws.send(JSON.stringify(data));
  }
}

module.exports = { setupWebSocket, sendToClient };

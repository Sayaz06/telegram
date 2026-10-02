require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const { WebSocketServer } = require('ws');
const { initFirebase } = require('./firebase');
const { setupWebSocket } = require('./routes/realtime');

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

// Middleware
app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));

// Init Firebase
initFirebase();

// Routes
app.use('/auth', require('./routes/auth'));
app.use('/chats', require('./routes/chats'));

// Health check
app.get('/', (req, res) => {
  res.json({ status: 'ok', service: 'Telegram Backend', version: '1.0.0' });
});

// Setup WebSocket untuk realtime
setupWebSocket(wss);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📡 WebSocket ready at ws://localhost:${PORT}/ws`);
});

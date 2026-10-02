const { TelegramClient } = require('telegram');
const { StringSession } = require('telegram/sessions');
const { saveSession, loadSession } = require('./firebase');

const API_ID = parseInt(process.env.TELEGRAM_API_ID);
const API_HASH = process.env.TELEGRAM_API_HASH;

// Store active clients dalam memory
const clients = new Map();

async function getClient(phone) {
  if (clients.has(phone)) {
    const client = clients.get(phone);
    if (client.connected) return client;
  }

  // Load session dari Firebase
  const sessionString = await loadSession(phone);
  const session = new StringSession(sessionString || '');

  const client = new TelegramClient(session, API_ID, API_HASH, {
    connectionRetries: 5,
    useWSS: true,
  });

  await client.connect();
  clients.set(phone, client);
  return client;
}

async function createClient(phone) {
  const session = new StringSession('');
  const client = new TelegramClient(session, API_ID, API_HASH, {
    connectionRetries: 5,
  });
  await client.connect();
  clients.set(phone + '_pending', client);
  return client;
}

async function getPendingClient(phone) {
  return clients.get(phone + '_pending');
}

async function promoteClient(phone) {
  const client = clients.get(phone + '_pending');
  if (!client) throw new Error('No pending client');
  clients.delete(phone + '_pending');
  clients.set(phone, client);

  // Simpan session ke Firebase
  const sessionString = client.session.save();
  await saveSession(phone, sessionString);
  return client;
}

async function disconnectClient(phone) {
  const client = clients.get(phone);
  if (client) {
    await client.disconnect();
    clients.delete(phone);
  }
}

module.exports = { getClient, createClient, getPendingClient, promoteClient, disconnectClient };

const express = require('express');
const router = express.Router();
const { createClient, getPendingClient, promoteClient } = require('../telegramClient');
const { saveSession, saveUserSettings } = require('../firebase');

// Step 1: Minta OTP
router.post('/send-code', async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone) return res.status(400).json({ error: 'Phone required' });

    const client = await createClient(phone);
    const result = await client.sendCode({ apiId: parseInt(process.env.TELEGRAM_API_ID), apiHash: process.env.TELEGRAM_API_HASH }, phone);

    res.json({ success: true, phoneCodeHash: result.phoneCodeHash, message: 'OTP dihantar' });
  } catch (err) {
    console.error('send-code error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Step 2: Verify OTP
router.post('/verify-code', async (req, res) => {
  try {
    const { phone, code, phoneCodeHash } = req.body;
    if (!phone || !code || !phoneCodeHash) return res.status(400).json({ error: 'Missing fields' });

    const client = await getPendingClient(phone);
    if (!client) return res.status(400).json({ error: 'Session expired, hantar OTP semula' });

    await client.signIn({ phoneNumber: phone, phoneCodeHash, phoneCode: code });
    await promoteClient(phone);

    const me = await client.getMe();
    await saveUserSettings(phone, {
      userId: me.id.toString(),
      firstName: me.firstName,
      lastName: me.lastName || '',
      username: me.username || '',
    });

    res.json({
      success: true,
      user: {
        id: me.id.toString(),
        firstName: me.firstName,
        lastName: me.lastName || '',
        username: me.username || '',
        phone,
      }
    });
  } catch (err) {
    // Perlu 2FA password
    if (err.message?.includes('SESSION_PASSWORD_NEEDED')) {
      return res.status(200).json({ success: false, need2fa: true });
    }
    console.error('verify-code error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Step 3 (optional): 2FA password
router.post('/verify-2fa', async (req, res) => {
  try {
    const { phone, password } = req.body;
    if (!phone || !password) return res.status(400).json({ error: 'Missing fields' });

    const client = await getPendingClient(phone);
    if (!client) return res.status(400).json({ error: 'Session expired' });

    await client.signInWithPassword({ apiId: parseInt(process.env.TELEGRAM_API_ID), apiHash: process.env.TELEGRAM_API_HASH }, { password });
    await promoteClient(phone);

    const me = await client.getMe();
    res.json({ success: true, user: { id: me.id.toString(), firstName: me.firstName, phone } });
  } catch (err) {
    console.error('verify-2fa error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Logout
router.post('/logout', async (req, res) => {
  try {
    const { phone } = req.body;
    const client = await require('../telegramClient').getClient(phone);
    await client.invoke(new (require('telegram/tl').functions.auth.LogOutRequest)());
    await require('../telegramClient').disconnectClient(phone);
    await require('../firebase').deleteSession(phone);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

const express = require('express');
const router = express.Router();
const { getClient } = require('../telegramClient');
const { Api } = require('telegram');

// Senarai semua dialog (chat, group, channel)
router.get('/dialogs', async (req, res) => {
  try {
    const { phone } = req.query;
    const client = await getClient(phone);

    const result = await client.getDialogs({ limit: 100 });
    const dialogs = result.map(d => ({
      id: d.id?.toString(),
      name: d.name || d.title || '',
      type: d.isChannel ? 'channel' : d.isGroup ? 'group' : 'private',
      unreadCount: d.unreadCount || 0,
      lastMessage: d.message ? {
        text: d.message.message || '',
        date: d.message.date,
        fromId: d.message.fromId?.userId?.toString() || '',
      } : null,
      photo: null, // fetch separately
    }));

    res.json({ success: true, dialogs });
  } catch (err) {
    console.error('dialogs error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Mesej dalam satu chat
router.get('/messages', async (req, res) => {
  try {
    const { phone, chatId, limit = 50, offsetId = 0 } = req.query;
    const client = await getClient(phone);

    const messages = await client.getMessages(chatId, {
      limit: parseInt(limit),
      offsetId: parseInt(offsetId),
    });

    const result = messages.map(m => ({
      id: m.id,
      text: m.message || '',
      date: m.date,
      fromId: m.fromId?.userId?.toString() || m.fromId?.channelId?.toString() || '',
      replyToMsgId: m.replyTo?.replyToMsgId || null,
      media: m.media ? serializeMedia(m.media) : null,
      sticker: m.sticker ? { emoji: m.sticker.emoji } : null,
    }));

    res.json({ success: true, messages: result });
  } catch (err) {
    console.error('messages error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Hantar mesej teks
router.post('/send', async (req, res) => {
  try {
    const { phone, chatId, text, replyToMsgId } = req.body;
    const client = await getClient(phone);

    const result = await client.sendMessage(chatId, {
      message: text,
      replyTo: replyToMsgId || undefined,
    });

    res.json({ success: true, messageId: result.id });
  } catch (err) {
    console.error('send error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Hantar media (gambar/video/dokumen)
router.post('/send-media', async (req, res) => {
  try {
    const { phone, chatId, caption, fileBase64, fileName, mimeType } = req.body;
    const client = await getClient(phone);

    const buffer = Buffer.from(fileBase64, 'base64');
    const result = await client.sendFile(chatId, {
      file: buffer,
      caption: caption || '',
      attributes: [new Api.DocumentAttributeFilename({ fileName: fileName || 'file' })],
    });

    res.json({ success: true, messageId: result.id });
  } catch (err) {
    console.error('send-media error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Info satu chat/user
router.get('/info', async (req, res) => {
  try {
    const { phone, chatId } = req.query;
    const client = await getClient(phone);

    const entity = await client.getEntity(chatId);
    res.json({ success: true, entity: {
      id: entity.id?.toString(),
      name: entity.firstName || entity.title || '',
      username: entity.username || '',
      type: entity.className,
    }});
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ❌ SEARCH DISABLED - global search dan hashtag search tidak dibenarkan
router.get('/search', async (req, res) => {
  res.status(403).json({ error: 'Carian tidak dibenarkan dalam aplikasi ini', disabled: true });
});

router.get('/search-global', async (req, res) => {
  res.status(403).json({ error: 'Carian global tidak dibenarkan', disabled: true });
});

router.get('/hashtag', async (req, res) => {
  res.status(403).json({ error: 'Carian hashtag tidak dibenarkan', disabled: true });
});

function serializeMedia(media) {
  if (!media) return null;
  const type = media.className || '';
  return { type, hasThumb: !!(media.photo || media.document?.thumbs?.length) };
}

module.exports = router;

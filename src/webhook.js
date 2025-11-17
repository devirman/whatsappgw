// src/webhook.js
const axios = require('axios');

async function handleIncomingMessage(msg) {
  const payload = {
    from: msg.from,
    body: msg.body,
    timestamp: msg.timestamp,
    id: msg.id._serialized,
    author: msg.author || null, // if group message
    isGroupMsg: msg.from && msg.from.endsWith('@g.us') ? true : false
  };

  // kirim ke webhook Anda
  const webhookUrl = process.env.INCOMING_WEBHOOK || 'https://example.com/webhook';
  try {
    await axios.post(webhookUrl, payload, { timeout: 5000 });
  } catch (err) {
    console.error('Webhook POST failed:', err.message || err);
    // Anda bisa juga menyimpan ke DB untuk retry
  }
}

module.exports = { handleIncomingMessage };


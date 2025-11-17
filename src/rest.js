// src/rest.js
import express from "express";
import bodyParser from "body-parser"; 
// const { client } = require('./index'); // pastikan index.js meng-export client

const router = express.Router();
router.use(bodyParser.json());

// kirim text
router.post('/send', async (req, res) => {
  const { number, message } = req.body;
  if (!number || !message) return res.status(400).json({ error: 'number and message required' });

  // format number: '628123456789@c.us' (Indonesia: prefix 62)
  const to = number.includes('@') ? number : `${number}@c.us`;

  try {
    const chat = await client.sendMessage(to, message);
    return res.json({ ok: true, id: chat.id._serialized });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ ok: false, error: err.message || err });
  }
});

// kirim media (multipart/form-data)
// const multer = require('multer');
// const upload = multer({ dest: 'tmp/' });

// router.post('/send-media', upload.single('file'), async (req, res) => {
//   const { number, caption } = req.body;
//   const filePath = req.file.path;
//   const to = number.includes('@') ? number : `${number}@c.us`;
//   const { MessageMedia } = require('whatsapp-web.js');

//   const media = MessageMedia.fromFilePath(filePath);
//   try {
//     const sent = await client.sendMessage(to, media, { caption });
//     // optionally fs.unlinkSync(filePath)
//     return res.json({ ok: true, id: sent.id._serialized });
//   } catch (err) {
//     console.error(err);
//     return res.status(500).json({ ok: false, error: err.message || err });
//   }
// });

module.exports = router;

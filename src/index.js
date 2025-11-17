import express from "express";
import pkg from "whatsapp-web.js";
const { Client, LocalAuth } = pkg;
import http from "http";
import { Server } from "socket.io";
import QRCode from "qrcode"; 
// import router from "./rest.js";
import multer from "multer"; 
import pool from "./db.js";

const upload = multer();
const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.json());

app.use(express.urlencoded({ extended: true }));
app.use(express.static("client")); // folder HTML
let waStatus = "connecting"; // default saat baru start
const client = new Client({
    authStrategy: new LocalAuth()
});


async function saveLog(number, message, status) {
  try {
    const sql = `
      INSERT INTO wa_logs (number, message, status, created_at)
      VALUES (?, ?, ?, NOW())
    `;
    const [result] = await pool.execute(sql, [number, message, status]);

    console.log("Pesan terkirim :", number);
  } catch (err) {
    console.error("DB Insert Error:", err);
  }
}
// view db
async function getLogs() {
  try {
    const sql = "SELECT * FROM wa_logs ORDER BY id DESC";
    const [rows] = await pool.execute(sql);
    return rows;
  } catch (err) {
    console.error("Get Log Error:", err);
    return [];
  }
}


// Saat QR diterima dari WhatsApp
client.on("qr", async qr => {
    console.log("QR diterima, mengirim ke web...");
    const qrImage = await QRCode.toDataURL(qr);   // convert ke base64
    io.emit("qr", qrImage);                       // kirim ke browser
     waStatus = "qr";
});
 console.log("Whatsapp Sedang dikoneksikan");    
// Ketika sudah login
client.on("ready", () => {
    console.log("WhatsApp siap!");
    io.emit("ready");
     waStatus = "ready";
});
client.on("authenticated", () => {
    console.log("Mengautentikasi");    
    waStatus = "Mengautentikasi";
}); 

client.on("auth_failure", () => {
    console.log("Autentikasi Gagal");    
    waStatus = "Autentikasi Gagal";
});

client.on("disconnected", () => {
    console.log("terputus");
  waStatus = "terputus";
});

app.get("/status", (req, res) => {
  res.json({ status: waStatus });
});

// API Kirim WA
app.post("/send",  upload.none(),async (req, res) => {
    if (waStatus !== "ready") {
        await saveLog(number, message, "FAILED: CLIENT NOT READY");
    return res.status(503).json({
      success: false,
      message: "WhatsApp sedang connecting, belum siap mengirim pesan."
    });
  }
  const { number, message } = req.body;

  if (!number || !message) {
    return res.status(400).json({ error: "number dan message wajib diisi" });
  }

  const to = number.includes("@") ? number : `${number}@c.us`;

  try {
    const chat = await client.sendMessage(to, message);
    res.json({
      success: true,
      id: chat.id._serialized
    });
   
    await saveLog(number, message, "success");
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      error: err.message
    });
  
    await saveLog(number, message, "FAILED: ERROR");
  }
}); 

app.get("/logs", async (req, res) => {
  try {
    const logs = await getLogs();   // panggil function async
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: "Failed to load logs", detail: err.message });
  }
});

app.get("/logview", (req, res) => {
  res.send(`
    <h2>Log Kirim Pesan</h2>
    <table border="1" cellspacing="0" cellpadding="5">
      <thead>
        <tr>
          <th>ID</th>
          <th>Nomor</th>
          <th>Pesan</th>
          <th>Status</th>
          <th>Waktu</th>
        </tr>
      </thead>
      <tbody id="logdata"></tbody>
    </table>

    <script>
      async function loadLogs() {
        const res = await fetch('/logs');
        const data = await res.json();
        let html = '';
        data.forEach(row => {
          html += \`
            <tr>
              <td>\${row.id}</td>
              <td>\${row.number}</td>
              <td>\${row.message}</td>
              <td>\${row.status}</td>
              <td>\${row.created_at}</td>
            </tr>
          \`;
        });
        document.getElementById('logdata').innerHTML = html;
      }
      loadLogs();
      setInterval(loadLogs, 5000); // refresh setiap 5 detik
    </script>
  `);
});


server.listen(3000, () => {
    console.log("Server berjalan di port 3000");
});

client.initialize();

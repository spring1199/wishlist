import express from "express";
import cors from "cors";
import multer from "multer";
import sqlite3 from "sqlite3";
import fs from "fs";
import path from "path";

const app = express();
const PORT = process.env.PORT || 4000;
const DB_PATH = process.env.DB_PATH || "./data/db.sqlite";
const UPLOAD_DIR = process.env.UPLOAD_DIR || "./data/uploads";
const AUTH_PIN = process.env.AUTH_PIN || "";               // хүсвэл хоосон байж болно
const CORS_ORIGIN = process.env.CORS_ORIGIN || "*";

// -------- Бэлтгэл --------
for (const p of [path.dirname(DB_PATH), UPLOAD_DIR]) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}
app.use(express.json({ limit: "10mb" }));
app.use(cors({ origin: CORS_ORIGIN === "*" ? true : CORS_ORIGIN.split(",") }));
app.use("/uploads", express.static(UPLOAD_DIR));

// -------- DB --------
const sqlite = sqlite3.verbose();
const db = new sqlite.Database(DB_PATH);
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS wishlist (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    price REAL,
    currency TEXT DEFAULT 'MNT',
    owner TEXT DEFAULT 'Munhu',
    link TEXT,
    image TEXT,
    description TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  )`);
});

// -------- PIN middleware --------
// Frontend-ээс илгээдэг header: x-auth-pin
function requirePin(req, res, next) {
  if (!AUTH_PIN) return next();
  const pin = req.header("x-auth-pin") || req.header("x-pin");
  if (pin && pin === AUTH_PIN) return next();
  return res.status(401).json({ error: "PIN шаардлагатай" });
}

// -------- Upload --------
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ts = Date.now();
    const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
    cb(null, ts + "_" + safe);
  }
});
const upload = multer({ storage });

// -------- Routes --------
const base = "/api";

// Бүх item-ууд
app.get(base + "/items", (_req, res) => {
  db.all("SELECT * FROM wishlist ORDER BY created_at DESC, id DESC", [], (err, rows) => {
    if (err) return res.status(500).json({ error: "DB error" });
    res.json(rows);
  });
});

// Нэмэх (зураг upload дэмжинэ)
app.post(base + "/items", requirePin, upload.single("image"), (req, res) => {
  const { title, price, currency, owner, link, description } = req.body || {};
  if (!title || typeof title !== "string") {
    return res.status(400).json({ error: "Item (гарчиг) заавал хэрэгтэй" });
  }
  const img = req.file ? `/uploads/${req.file.filename}` : null;

  const stmt = db.prepare(
    `INSERT INTO wishlist (title, price, currency, owner, link, image, description)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  );
  stmt.run(
    [title.trim(), price === "" ? null : Number(price), currency || "MNT", owner || "Munhu", link || "", img || "", description || ""],
    function (err2) {
      if (err2) return res.status(500).json({ error: "DB insert failed" });
      db.get("SELECT * FROM wishlist WHERE id = ?", [this.lastID], (e3, row) => {
        if (e3) return res.status(500).json({ error: "DB fetch failed" });
        res.status(201).json(row);
      });
    }
  );
});

// Устгах (хүсвэл – хэрэв frontend-д байгаа бол)
app.delete(base + "/items/:id", requirePin, (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ error: "ID буруу" });
  db.run("DELETE FROM wishlist WHERE id = ?", [id], function (err) {
    if (err) return res.status(500).json({ error: "DB delete failed" });
    res.json({ deleted: this.changes > 0 });
  });
});

app.listen(PORT, () => {
  console.log(`✅ API ready at http://0.0.0.0:${PORT}/api`);
  if (AUTH_PIN) console.log("🔐 PIN хамгаалалт идэвхтэй.");
});

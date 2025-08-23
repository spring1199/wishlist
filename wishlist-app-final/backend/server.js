import express from "express";
import cors from "cors";
import helmet from "helmet";
import sqlite3 from "sqlite3";
import fs from "fs";
import path from "path";
import multer from "multer";
import { stringify as csvStringify } from "csv-stringify/sync";
import { parse as csvParse } from "csv-parse/sync";

const app = express();
const PORT = process.env.PORT || 4000;
const DB_PATH = process.env.DB_PATH || "./data/db.sqlite";
const CORS_ORIGIN = process.env.CORS_ORIGIN || "*";
const AUTH_PIN = process.env.AUTH_PIN || "";
const UPLOAD_DIR = process.env.UPLOAD_DIR || "./data/uploads";

app.use(helmet());
app.use(express.json({ limit: "10mb" }));
app.use(cors({ origin: CORS_ORIGIN === "*" ? true : CORS_ORIGIN.split(",") }));

// ensure dirs
for (const pth of [path.dirname(DB_PATH), UPLOAD_DIR]) {
  if (!fs.existsSync(pth)) fs.mkdirSync(pth, { recursive: true });
}
// static
app.use("/uploads", express.static(UPLOAD_DIR));

// db
const sqlite = sqlite3.verbose();
const db = new sqlite.Database(DB_PATH);
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS wishes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    price REAL,
    currency TEXT DEFAULT 'MNT',
    image TEXT,
    link TEXT,
    owner TEXT DEFAULT 'Munhu',
    bought INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  )`);
});

function requirePin(req, res, next) {
  if (!AUTH_PIN) return next();
  const pin = req.header("x-pin");
  if (pin && pin === AUTH_PIN) return next();
  return res.status(401).json({ error: "PIN шаардлагатай" });
}

function isValidUrl(s) {
  if (!s) return true;
  if (typeof s === "string" && s.startsWith("/uploads/")) return true; // allow relative uploaded paths
  try { new URL(s); return true; } catch (e) { return false; }
}

function cleanWish(row) {
  return {
    id: row.id,
    title: row.title,
    description: row.description ?? "",
    price: row.price ?? null,
    currency: row.currency || "MNT",
    image: row.image ?? "",
    link: row.link ?? "",
    owner: row.owner || "Munhu",
    bought: !!row.bought,
    created_at: row.created_at
  };
}

// upload
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ts = Date.now();
    const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
    cb(null, ts + "_" + safe);
  }
});
const upload = multer({ storage });

const base = "/api";

app.get(base + "/wishes", requirePin, (_req, res) => {
  db.all("SELECT * FROM wishes ORDER BY created_at DESC, id DESC", [], (err, rows) => {
    if (err) return res.status(500).json({ error: "DB error" });
    res.json(rows.map(cleanWish));
  });
});

app.post(base + "/wishes", requirePin, (req, res) => {
  const { title, description, price, currency, image, link, owner } = req.body || {};
  if (!title || typeof title !== "string") return res.status(400).json({ error: "Гарчиг заавал хэрэгтэй" });
  if (!isValidUrl(image) || !isValidUrl(link)) return res.status(400).json({ error: "Зураг/Холбоос URL буруу" });
  const p = (price === undefined || price === null || price === "") ? null : Number(price);
  if (p !== null && Number.isNaN(p)) return res.status(400).json({ error: "Үнэ тоо байх ёстой" });
  const stmt = db.prepare("INSERT INTO wishes (title, description, price, currency, image, link, owner, bought) VALUES (?, ?, ?, ?, ?, ?, ?, 0)");
  stmt.run([title.trim(), description ?? "", p, (currency || "MNT"), (image || ""), (link || ""), (owner || "Munhu")], function(err) {
    if (err) return res.status(500).json({ error: "DB insert failed" });
    db.get("SELECT * FROM wishes WHERE id = ?", [this.lastID], (err2, row) => {
      if (err2) return res.status(500).json({ error: "DB fetch failed" });
      res.status(201).json(cleanWish(row));
    });
  });
});

app.put(base + "/wishes/:id", requirePin, (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ error: "ID буруу" });
  const { title, description, price, currency, image, link, owner, bought } = req.body || {};
  if (image && !isValidUrl(image)) return res.status(400).json({ error: "Зураг URL буруу" });
  if (link && !isValidUrl(link)) return res.status(400).json({ error: "Холбоос URL буруу" });
  const p = (price === undefined || price === null || price === "") ? null : Number(price);
  if (price !== undefined && p !== null && Number.isNaN(p)) return res.status(400).json({ error: "Үнэ тоо байх ёстой" });

  db.run(`UPDATE wishes SET 
    title = COALESCE(?, title),
    description = COALESCE(?, description),
    price = COALESCE(?, price),
    currency = COALESCE(?, currency),
    image = COALESCE(?, image),
    link = COALESCE(?, link),
    owner = COALESCE(?, owner),
    bought = COALESCE(?, bought)
    WHERE id = ?`,
    [
      title ?? null,
      description ?? null,
      (price === undefined ? null : p),
      currency ?? null,
      image ?? null,
      link ?? null,
      owner ?? null,
      (bought === undefined ? null : (bought ? 1 : 0)),
      id
    ], function(err) {
      if (err) return res.status(500).json({ error: "DB update failed" });
      db.get("SELECT * FROM wishes WHERE id = ?", [id], (err2, row) => {
        if (err2 || !row) return res.status(404).json({ error: "Олдсонгүй" });
        res.json(cleanWish(row));
      });
    });
});

app.delete(base + "/wishes/:id", requirePin, (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ error: "ID буруу" });
  db.run("DELETE FROM wishes WHERE id = ?", [id], function(err) {
    if (err) return res.status(500).json({ error: "DB delete failed" });
    res.json({ deleted: this.changes > 0 });
  });
});

app.post(base + "/upload", requirePin, upload.single("file"), (req, res) => {
  const fileUrl = `/uploads/${req.file.filename}`;
  res.status(201).json({ url: fileUrl });
});

app.get(base + "/export/csv", requirePin, (_req, res) => {
  db.all("SELECT * FROM wishes ORDER BY created_at DESC, id DESC", [], (err, rows) => {
    if (err) return res.status(500).json({ error: "DB error" });
    const data = rows.map(r => ({
      id: r.id, title: r.title, description: r.description || "",
      price: r.price ?? "", currency: r.currency || "MNT",
      image: r.image || "", link: r.link || "",
      owner: r.owner || "Munhu", bought: r.bought ? "1" : "0",
      created_at: r.created_at
    }));
    const csv = csvStringify(data, { header: true });
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", "attachment; filename=\"wishlist.csv\"");
    res.send(csv);
  });
});

app.get(base + "/backup/sqlite", requirePin, (_req, res) => {
  if (!fs.existsSync(DB_PATH)) return res.status(404).json({ error: "DB олдсонгүй" });
  res.setHeader("Content-Type", "application/octet-stream");
  res.setHeader("Content-Disposition", "attachment; filename=\"db.sqlite\"");
  fs.createReadStream(DB_PATH).pipe(res);
});

app.post(base + "/restore/csv", requirePin, upload.single("file"), (req, res) => {
  try {
    const content = fs.readFileSync(req.file.path, "utf-8");
    const records = csvParse(content, { columns: true, skip_empty_lines: true });
    const stmt = db.prepare("INSERT INTO wishes (title, description, price, currency, image, link, owner, bought) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
    let added = 0;
    for (const r of records) {
      const title = (r.title || "Untitled").toString();
      const description = (r.description || "").toString();
      const price = r.price === "" ? null : Number(r.price);
      const currency = (r.currency || "MNT").toString();
      const image = (r.image || "").toString();
      const link = (r.link || "").toString();
      const owner = (r.owner || "Munhu").toString();
      const bought = (r.bought === "1" || r.bought === 1) ? 1 : 0;
      stmt.run([title, description, price, currency, image, link, owner, bought]);
      added++;
    }
    stmt.finalize(() => { fs.unlinkSync(req.file.path); res.json({ ok: true, added }); });
  } catch (e) { return res.status(400).json({ error: "CSV уншихад алдаа" }); }
});

app.listen(PORT, () => {
  console.log(`API http://0.0.0.0:${PORT}/api`);
  if (AUTH_PIN) console.log("PIN хамгаалалт идэвхтэй.");
});

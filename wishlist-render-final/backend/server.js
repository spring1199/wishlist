import express from "express";
import cors from "cors";
import multer from "multer";
import sqlite3 from "sqlite3";
import { open } from "sqlite";
import path from "path";
import fs from "fs";

const app = express();
const PORT = process.env.PORT || 4000;
const DB_PATH = process.env.DB_PATH || "./data/db.sqlite";
const UPLOAD_DIR = process.env.UPLOAD_DIR || "./data/uploads";
const AUTH_PIN = process.env.AUTH_PIN || null;
const CORS_ORIGIN = process.env.CORS_ORIGIN || "*";

if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

app.use(express.json());
app.use(cors({ origin: CORS_ORIGIN }));
app.use("/uploads", express.static(UPLOAD_DIR));

const upload = multer({ dest: UPLOAD_DIR });

const db = await open({
  filename: DB_PATH,
  driver: sqlite3.Database
});

await db.exec(`
  CREATE TABLE IF NOT EXISTS wishlist (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT,
    price TEXT,
    currency TEXT,
    owner TEXT,
    link TEXT,
    image TEXT,
    description TEXT
  )
`);

function checkPin(req, res, next) {
  if (!AUTH_PIN) return next();
  const pin = req.headers["x-auth-pin"];
  if (pin !== AUTH_PIN) return res.status(403).json({ error: "Invalid PIN" });
  next();
}

app.get("/api/items", async (req, res) => {
  const items = await db.all("SELECT * FROM wishlist");
  res.json(items);
});

app.post("/api/items", checkPin, upload.single("image"), async (req, res) => {
  const { title, price, currency, owner, link, description } = req.body;
  const image = req.file ? `/uploads/${req.file.filename}` : null;

  await db.run(
    `INSERT INTO wishlist (title, price, currency, owner, link, image, description) 
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [title, price, currency, owner, link, image, description]
  );

  res.json({ message: "Item added" });
});

app.listen(PORT, () => {
  console.log(`✅ Backend running on http://localhost:${PORT}`);
});

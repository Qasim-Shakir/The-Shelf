// server.ts
import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import axios from "axios";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import fs from "fs";
import { pipeline } from "stream/promises";
import multer from "multer";
import { EPub } from "epub";
import nodemailer from "nodemailer";

declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}

dotenv.config({ path: ".env.local" });

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

// ── Storage directories ────────────────────────────────────────────────────────
const STORAGE_DIR = path.join(__dirname, "storage");
const EPUB_DIR    = path.join(STORAGE_DIR, "epub");
const COVERS_DIR  = path.join(STORAGE_DIR, "covers");

[EPUB_DIR, COVERS_DIR].forEach((dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// ── Multer ─────────────────────────────────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, EPUB_DIR),
  filename:    (req, file, cb) => {
    const sanitized = file.originalname.replace(/[^\w\s.-]/g, "").slice(0, 50);
    cb(null, `${Date.now()}-${sanitized}`);
  },
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const epubOk  = file.fieldname === "epub_file"    && (file.mimetype === "application/epub+zip" || file.originalname.endsWith(".epub"));
    const coverOk = file.fieldname === "cover_image"  && file.mimetype.startsWith("image/");
    const coverEditOk = file.fieldname === "cover"    && file.mimetype.startsWith("image/");
    if (epubOk || coverOk || coverEditOk) cb(null, true);
    else cb(new Error("Invalid file type or field name"));
  },
  limits: { fileSize: 500 * 1024 * 1024 },
});

// ── Config ─────────────────────────────────────────────────────────────────────
const MONGODB_URI     = process.env.MONGODB_URI || "mongodb://localhost:27017/the-shelf";
const JWT_SECRET      = process.env.JWT_SECRET  || "your-secret-key";
const SESSION_DURATION = process.env.SESSION_DURATION || "24h";

// =============================================================================
// MongoDB Models
// =============================================================================

const userSchema = new mongoose.Schema({
  username:            { type: String,  required: true },
  email:               { type: String,  required: true, unique: true },
  password:            { type: String,  required: true },
  role:                { type: String,  enum: ["reader", "admin"], default: "reader" },
  createdAt:           { type: Date,    default: Date.now },
  failedLoginAttempts: { type: Number,  default: 0 },
  lockUntil:           { type: Date,    default: null },
  resetToken:          { type: String,  default: null },
  resetTokenExpiry:    { type: Date,    default: null },
});

// FIX: Added `status` (for archive feature) and `publicationYear`
const bookSchema = new mongoose.Schema({
  title:           { type: String, required: true },
  author:          { type: String, required: true },
  category:        { type: String, required: true },
  epubUrl:         { type: String, required: true },
  coverUrl:        { type: String, default: "" },
  description:     { type: String, default: "" },
  language:        { type: String, default: "en" },
  publicationYear: { type: String, default: "" },
  // FIX: `status` field — drives archive feature. Default Active so all
  // existing books remain visible; Archived hides from user-facing routes.
  status:          { type: String, enum: ["Active", "Archived"], default: "Active" },
  gutenbergId:     { type: Number, unique: true, sparse: true },
  ingestedAt:      { type: Date,   default: Date.now },
});

// FIX: Added `adminId` and `type` to activity log model
const adminActivitySchema = new mongoose.Schema({
  type:      { type: String, enum: ["added", "updated", "deleted", "archived", "restored", "scrape"], required: true },
  message:   { type: String, required: true },
  adminId:   { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  adminName: { type: String, default: "Admin" },
  createdAt: { type: Date,   default: Date.now },
});

const progressSchema = new mongoose.Schema({
  userId:       { type: mongoose.Schema.Types.ObjectId, ref: "User",  required: true },
  bookId:       { type: mongoose.Schema.Types.ObjectId, ref: "Book",  required: true },
  last_location:{ type: String,  required: true },
  percentage:   { type: Number,  default: 0 },
  chapter:      { type: String },
  last_read_at: { type: Date,    default: Date.now },
});
// Unique constraint so upsert works cleanly
progressSchema.index({ userId: 1, bookId: 1 }, { unique: true });

const User          = mongoose.model("User",          userSchema);
const Book          = mongoose.model("Book",          bookSchema);
const AdminActivity = mongoose.model("AdminActivity", adminActivitySchema);
const ReadingProgress = mongoose.model("ReadingProgress", progressSchema);

// ── Activity log helper ────────────────────────────────────────────────────────
async function logActivity(
  type: "added" | "updated" | "deleted" | "archived" | "restored" | "scrape",
  message: string,
  adminUser?: { id: string; username?: string; email?: string },
) {
  try {
    await AdminActivity.create({
      type,
      message,
      adminId:   adminUser?.id,
      adminName: adminUser?.username ?? adminUser?.email ?? "Admin",
    });
  } catch (err) {
    console.warn("[Activity] Failed to log:", err);
  }
}

// =============================================================================
// Middleware
// =============================================================================

const verifyToken = (req: any, res: any, next: any) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Access denied" });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(400).json({ error: "Invalid token" });
  }
};

const isAdmin = (req: any, res: any, next: any) => {
  if (req.user?.role !== "admin") return res.status(403).json({ error: "Admin access required" });
  next();
};

// =============================================================================
// Server
// =============================================================================

async function startServer() {
  const app  = express();
  const PORT = 3000;

  app.use((req, res, next) => {
    res.setHeader(
      "Content-Security-Policy",
      "default-src * 'unsafe-inline' 'unsafe-eval' blob: data:; script-src * 'unsafe-inline' 'unsafe-eval' blob:; style-src * 'unsafe-inline' blob:; img-src * blob: data:; font-src * data: blob:; connect-src * ws: wss:; worker-src blob:;"
    );
    next();
  });
  app.use(express.json());

  // ── MongoDB ────────────────────────────────────────────────────────────────
  try {
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS:          45000,
    });
    console.log("Connected to MongoDB");

    // Drop old non-sparse gutenbergId index if it exists
    try {
      await Book.collection.dropIndex("gutenbergId_1");
      console.log("[Index] Dropped old gutenbergId index");
    } catch (err: any) {
      if (err.code !== 27) console.warn("[Index] dropIndex:", err.message);
    }

    await Book.syncIndexes();
    console.log("[Index] Book indexes synced");

    await mongoose.connection.db
      ?.collection("books")
      .updateMany({ status: { $exists: false } }, { $set: { status: "Active" } });
    console.log("[Migration] Backfilled missing status field on existing books");

  } catch (err) {
    console.error("MongoDB connection error:", err);
    process.exit(1);
  }

  // ===========================================================================
  // AUTH ROUTES
  // ===========================================================================

  app.post("/api/auth/signup", async (req, res) => {
    try {
      const { username, email, password } = req.body;
      if (typeof username !== "string" || typeof email !== "string" || typeof password !== "string")
        return res.status(400).json({ error: "Invalid input" });
      if (password.length < 8)
        return res.status(400).json({ error: "Password must be at least 8 characters" });
      const hashed = await bcrypt.hash(password, 10);
      const user   = new User({ username, email, password: hashed });
      await user.save();
      const token  = jwt.sign({ id: user._id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: SESSION_DURATION as any });
      res.json({ token, user: { id: user._id, username: user.username, email: user.email, role: user.role } });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      if (typeof email !== "string" || typeof password !== "string")
        return res.status(400).json({ error: "Invalid input" });
      const user = await User.findOne({ email: { $eq: email } });
      if (!user) return res.status(401).json({ error: "Invalid credentials" });

      if (user.lockUntil && user.lockUntil > new Date()) {
        const mins = Math.ceil((user.lockUntil.getTime() - Date.now()) / 60000);
        return res.status(423).json({ error: `Account locked. Try again in ${mins} minute(s).` });
      }

      const match = await bcrypt.compare(password, user.password);
      if (!match) {
        user.failedLoginAttempts += 1;
        if (user.failedLoginAttempts >= 5) {
          user.lockUntil           = new Date(Date.now() + 15 * 60 * 1000);
          user.failedLoginAttempts = 0;
          await user.save();
          return res.status(423).json({ error: "Too many failed attempts. Account locked for 15 minutes." });
        }
        await user.save();
        return res.status(401).json({ error: `Invalid credentials. ${5 - user.failedLoginAttempts} attempt(s) remaining.` });
      }

      user.failedLoginAttempts = 0;
      user.lockUntil           = null;
      await user.save();
      const token = jwt.sign({ id: user._id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: SESSION_DURATION as any });
      res.json({ token, user: { id: user._id, username: user.username, email: user.email, role: user.role } });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.get("/api/auth/me", verifyToken, async (req, res) => {
    try {
      const user = await User.findById(req.user.id);
      if (!user) return res.status(404).json({ error: "User not found" });
      res.json({ id: user._id, username: user.username, email: user.email, role: user.role });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.post("/api/auth/forgot-password", async (req, res) => {
    try {
      const { email } = req.body;
      const user      = await User.findOne({ email });
      if (!user) return res.json({ message: "If that email is registered, you'll receive a reset link shortly." });
      const token          = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
      user.resetToken      = token;
      user.resetTokenExpiry = new Date(Date.now() + 30 * 60 * 1000);
      await user.save();
      const resetLink = `http://localhost:3000/forgot-password?token=${token}`;
      await transporter.sendMail({
        from:    `"The Shelf" <${process.env.EMAIL_USER}>`,
        to:      email,
        subject: "Password Reset Request",
        html:    `<div style="font-family:Georgia,serif;max-width:480px;margin:auto;padding:40px;background:#FAF6EE;border:1px solid #D9CFC4;border-radius:12px"><h2 style="color:#2C1810">The Shelf</h2><p style="color:#7A6652;font-style:italic">Password Reset</p><p>Click below to reset your password. Expires in <strong>30 minutes</strong>.</p><a href="${resetLink}" style="display:inline-block;margin:24px 0;padding:14px 28px;background:#4A7C59;color:white;text-decoration:none;border-radius:8px;font-weight:bold">Reset Password</a><p style="color:#7A6652;font-size:13px">If you didn't request this, ignore this email.</p></div>`,
      });
      res.json({ message: "If that email is registered, you'll receive a reset link shortly." });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/auth/reset-password", async (req, res) => {
    try {
      const { token, newPassword } = req.body;
      const user = await User.findOne({ resetToken: token, resetTokenExpiry: { $gt: new Date() } });
      if (!user) return res.status(400).json({ error: "Invalid or expired reset token." });
      user.password            = await bcrypt.hash(newPassword, 10);
      user.resetToken          = null;
      user.resetTokenExpiry    = null;
      user.failedLoginAttempts = 0;
      user.lockUntil           = null;
      await user.save();
      res.json({ message: "Password reset successfully. You can now log in." });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ===========================================================================
  // BOOK ROUTES (user-facing)
  // FIX: Filter status === "Active" so archived books are hidden from users
  // ===========================================================================

  app.get("/api/books", async (req, res) => {
    try {
      const page     = Math.max(1, parseInt(req.query.page  as string) || 1);
      const limit    = Math.min(20, parseInt(req.query.limit as string) || 20);
      const skip     = (page - 1) * limit;
      const search   = ((req.query.search   as string) || "").trim().slice(0, 100);
      const category = ((req.query.category as string) || "").trim();
      const sort     = (req.query.sort      as string) || "newest";

      // Always restrict to Active books for the user-facing route
      const filter: any = { status: "Active" };

      // Server-side full-library text search (title + author)
      if (search) {
        filter.$or = [
          { title:  { $regex: search, $options: "i" } },
          { author: { $regex: search, $options: "i" } },
        ];
      }

      // Category filter — case-insensitive contains so "fiction" matches
      // "Classic Fiction", "Science Fiction", "fiction" etc.
      if (category && category !== "All Genres") {
        filter.category = { $regex: category, $options: "i" };
      }

      // Sort mapping from frontend sort strings to Mongo sort objects
      const sortMap: Record<string, any> = {
        newest:      { ingestedAt: -1 },
        oldest:      { ingestedAt:  1 },
        author_asc:  { author:      1 },
        author_desc: { author:     -1 },
        title_asc:   { title:       1 },
        title_desc:  { title:      -1 },
      };
      const mongoSort = sortMap[sort] ?? { ingestedAt: -1 };

      const [books, total] = await Promise.all([
        Book.find(filter).sort(mongoSort).skip(skip).limit(limit).lean(),
        Book.countDocuments(filter),
      ]);

      res.json({
        books: books.map((b) => ({
          id:              b._id,
          title:           b.title,
          author:          b.author,
          category:        b.category,
          epubUrl:         b.epubUrl,
          coverUrl:        b.coverUrl,
          description:     b.description,
          language:        b.language,
          publicationYear: (b as any).publicationYear,
          ingestedAt:      b.ingestedAt,
        })),
        total,
        page,
        total_pages: Math.ceil(total / limit),
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/books/:id", async (req, res) => {
    try {
      const book = await Book.findById(req.params.id);
      if (!book) return res.status(404).json({ error: "Book not found" });
      res.json({
        id:              book._id,
        title:           book.title,
        author:          book.author,
        category:        book.category,
        epubUrl:         book.epubUrl,
        coverUrl:        book.coverUrl,
        description:     book.description,
        language:        book.language,
        publicationYear: book.publicationYear,
        status:          book.status,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Serve local EPUB files
  app.get("/api/books/epub-upload/:filename", (req, res) => {
    const filePath = path.join(EPUB_DIR, req.params.filename);
    if (!filePath.startsWith(EPUB_DIR)) return res.status(403).json({ error: "Access denied" });
    if (!fs.existsSync(filePath))       return res.status(404).json({ error: "File not found" });
    res.setHeader("Content-Type", "application/epub+zip");
    res.setHeader("Accept-Ranges", "bytes");
    res.sendFile(filePath);
  });

  // Serve uploaded cover images
  app.get("/api/books/cover-upload/:filename", (req, res) => {
    const filePath = path.join(COVERS_DIR, req.params.filename);
    if (!filePath.startsWith(COVERS_DIR)) return res.status(403).json({ error: "Access denied" });
    if (!fs.existsSync(filePath))         return res.status(404).json({ error: "File not found" });
    res.setHeader("Content-Type", "image/jpeg");
    res.sendFile(filePath);
  });

  // EPUB proxy (external Gutenberg URLs + local files)
  app.get("/api/books/epub-proxy/:id", async (req, res) => {
    try {
      const book = await Book.findById(req.params.id);
      if (!book) return res.status(404).json({ error: "Book not found" });

      res.setHeader("Content-Type", "application/epub+zip");
      res.setHeader("Access-Control-Allow-Origin", "*");

      if (book.epubUrl.startsWith("/api/books/epub-upload/")) {
        const filename = book.epubUrl.replace("/api/books/epub-upload/", "");
        const filePath = path.join(EPUB_DIR, filename);
        if (!fs.existsSync(filePath)) return res.status(404).json({ error: "EPUB file not found on disk" });
        return res.sendFile(filePath);
      }

      const response = await axios.get(book.epubUrl, { responseType: "stream" });
      response.data.pipe(res);
    } catch (err: any) {
      console.error("EPUB proxy error:", err.message);
      res.status(500).json({ error: "Failed to fetch EPUB file." });
    }
  });

  // ===========================================================================
  // READING PROGRESS ROUTES
  // FIX: Reader.tsx calls PUT /api/progress/:bookId — added that route.
  //      The old POST /api/progress is kept for backwards compatibility.
  // ===========================================================================

  app.get("/api/progress/:bookId", verifyToken, async (req, res) => {
    try {
      const progress = await ReadingProgress.findOne({
        userId: req.user.id,
        bookId: req.params.bookId,
      });
      res.json(progress
        ? { last_location: progress.last_location, percentage: progress.percentage, chapter: progress.chapter }
        : null
      );
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // FIX: Reader.tsx uses PUT /api/progress/:bookId with { last_location, percentage }
  // This is the primary save route. Uses upsert so it creates or updates.
  app.put("/api/progress/:bookId", verifyToken, async (req, res) => {
    try {
      const { last_location, percentage, chapter } = req.body;
      if (!last_location) return res.status(400).json({ error: "last_location is required" });

      await ReadingProgress.findOneAndUpdate(
        { userId: req.user.id, bookId: req.params.bookId },
        { last_location, percentage: percentage ?? 0, chapter, last_read_at: new Date() },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      res.status(204).send();
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Legacy POST — kept for backwards compat
  app.post("/api/progress", verifyToken, async (req, res) => {
    try {
      const { bookId, last_location, percentage, chapter } = req.body;
      await ReadingProgress.findOneAndUpdate(
        { userId: req.user.id, bookId },
        { last_location, percentage, chapter, last_read_at: new Date() },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      res.status(204).send();
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ===========================================================================
  // PROFILE ROUTES
  // ===========================================================================

  app.get("/api/profile/history", verifyToken, async (req, res) => {
    try {
      const history = await ReadingProgress.find({ userId: req.user.id })
        .populate("bookId")
        .sort({ last_read_at: -1 });

      res.json(history
        .filter((h) => h.bookId) // guard against orphaned progress records
        .map((h) => ({
          id:         h._id,
          bookId:     (h.bookId as any)._id,
          percentage: h.percentage,
          lastReadAt: h.last_read_at,
          book: {
            id:       (h.bookId as any)._id,
            title:    (h.bookId as any).title,
            author:   (h.bookId as any).author,
            coverUrl: (h.bookId as any).coverUrl,
          },
        }))
      );
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put("/api/profile", verifyToken, async (req, res) => {
    try {
      const { username } = req.body;
      await User.findByIdAndUpdate(req.user.id, { username });
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put("/api/profile/password", verifyToken, async (req, res) => {
    try {
      const { currentPassword, newPassword } = req.body;
      const user = await User.findById(req.user.id);
      if (!user || !(await bcrypt.compare(currentPassword, user.password)))
        return res.status(401).json({ error: "Invalid current password" });
      user.password = await bcrypt.hash(newPassword, 10);
      await user.save();
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ===========================================================================
  // ADMIN ROUTES
  // ===========================================================================

  // ── FIX: GET /api/admin/stats ──────────────────────────────────────────────
  app.get("/api/admin/stats", verifyToken, isAdmin, async (req, res) => {
    try {
      const [books, archived, users, sessions] = await Promise.all([
        Book.countDocuments({ status: "Active" }),
        Book.countDocuments({ status: "Archived" }),
        User.countDocuments({ role: "reader" }),
        ReadingProgress.countDocuments(),
      ]);
      res.json({ books, archived, users, sessions });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ── FIX: GET /api/admin/activity ──────────────────────────────────────────
  app.get("/api/admin/activity", verifyToken, isAdmin, async (req, res) => {
    try {
      const limit    = Math.min(100, parseInt(req.query.limit as string) || 50);
      const activity = await AdminActivity.find().sort({ createdAt: -1 }).limit(limit).lean();
      res.json(activity.map((a) => ({
        id:        a._id,
        type:      a.type,
        message:   a.message,
        adminName: a.adminName,
        createdAt: a.createdAt,
      })));
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ── FIX: GET /api/admin/activity/export ───────────────────────────────────
  app.get("/api/admin/activity/export", verifyToken, isAdmin, async (req, res) => {
    try {
      const activity = await AdminActivity.find().sort({ createdAt: -1 }).lean();
      const rows     = [
        ["Type", "Message", "Admin", "When"],
        ...activity.map((a) => [
          a.type,
          `"${String(a.message).replace(/"/g, '""')}"`,
          a.adminName ?? "Admin",
          new Date(a.createdAt).toISOString(),
        ]),
      ];
      const csv = rows.map((r) => r.join(",")).join("\n");
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", `attachment; filename="shelf-activity-${new Date().toISOString().slice(0, 10)}.csv"`);
      res.send(csv);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ── FIX: GET /api/admin/books ─────────────────────────────────────────────
  // Returns ALL books including archived (admin-only). User-facing /api/books
  // only returns Active books.
  app.get("/api/admin/books", verifyToken, isAdmin, async (req, res) => {
    try {
      const page   = Math.max(1, parseInt(req.query.page  as string) || 1);
      const limit  = Math.min(100, parseInt(req.query.limit as string) || 100);
      const skip   = (page - 1) * limit;
      const search = req.query.search as string | undefined;
      const status = req.query.status as string | undefined;

      const filter: any = {};
      if (status && ["Active", "Archived"].includes(status)) filter.status = status;
      if (search) {
        filter.$or = [
          { title:  { $regex: search, $options: "i" } },
          { author: { $regex: search, $options: "i" } },
        ];
      }

      const [books, total] = await Promise.all([
        Book.find(filter).sort({ ingestedAt: -1 }).skip(skip).limit(limit).lean(),
        Book.countDocuments(filter),
      ]);

      res.json(books.map((b) => ({
        id:              b._id,
        title:           b.title,
        author:          b.author,
        genre:           b.category,   // frontend ManageBooks uses `genre` field
        category:        b.category,
        publicationYear: b.publicationYear ?? "",
        status:          b.status ?? "Active",
        description:     b.description,
        coverUrl:        b.coverUrl,
        language:        b.language,
      })));
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ── PUT /api/admin/books/:id ───────────────────────────────────────────────
  // FIX: Now handles `status` for archive/restore and `genre`→`category` mapping.
  // Logs activity on status change so the dashboard activity feed updates.
  app.put("/api/admin/books/:id", verifyToken, isAdmin, async (req, res) => {
    try {
      const prev = await Book.findById(req.params.id).lean();
      if (!prev) return res.status(404).json({ error: "Book not found" });

      const {
        title, author, genre, category, description,
        coverUrl, publicationYear, language, status,
      } = req.body;

      const update: any = {};
      if (title           !== undefined) update.title           = title;
      if (author          !== undefined) update.author          = author;
      if (description     !== undefined) update.description     = description;
      if (coverUrl        !== undefined) update.coverUrl        = coverUrl;
      if (publicationYear !== undefined) update.publicationYear = publicationYear;
      if (language        !== undefined) update.language        = language;
      // frontend sends `genre`; schema stores as `category`
      if (genre    !== undefined) update.category = genre;
      if (category !== undefined) update.category = category;
      // FIX: Handle archive/restore status change
      if (status !== undefined && ["Active", "Archived"].includes(status)) {
        update.status = status;
      }

      await Book.findByIdAndUpdate(req.params.id, update);

      // Log activity
      const adminUser = { id: req.user.id, username: req.user.email };
      const bookTitle = title ?? (prev as any).title;
      if (update.status && update.status !== (prev as any).status) {
        if (update.status === "Archived") {
          await logActivity("archived", `"${bookTitle}" archived by admin`, adminUser);
        } else {
          await logActivity("restored", `"${bookTitle}" restored to Active`, adminUser);
        }
      } else {
        await logActivity("updated", `Metadata updated for "${bookTitle}"`, adminUser);
      }

      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ── DELETE /api/admin/books/:id ───────────────────────────────────────────
  app.delete("/api/admin/books/:id", verifyToken, isAdmin, async (req, res) => {
    try {
      const book = await Book.findByIdAndDelete(req.params.id).lean();
      if (!book) return res.status(404).json({ error: "Book not found" });
      await logActivity("deleted", `"${(book as any).title}" permanently deleted`, { id: req.user.id, username: req.user.email });
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ── FIX: POST /api/admin/books/:id/cover ─────────────────────────────────
  // Cover upload from ManageBooks edit modal
  const coverUpload = multer({
    storage: multer.diskStorage({
      destination: (req, file, cb) => cb(null, COVERS_DIR),
      filename:    (req, file, cb) => cb(null, `${Date.now()}-${file.originalname.replace(/[^\w.-]/g, "")}`),
    }),
    fileFilter: (req, file, cb) => {
      if (file.mimetype.startsWith("image/")) cb(null, true);
      else cb(new Error("Only image files allowed"));
    },
    limits: { fileSize: 10 * 1024 * 1024 },
  });

  app.post("/api/admin/books/:id/cover", verifyToken, isAdmin, coverUpload.single("cover"), async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ error: "No file uploaded" });
      const coverUrl = `/api/books/cover-upload/${req.file.filename}`;
      await Book.findByIdAndUpdate(req.params.id, { coverUrl });
      res.json({ coverUrl });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ── POST /api/admin/books/scrape ──────────────────────────────────────────
  app.post("/api/admin/books/scrape", verifyToken, isAdmin, async (req, res) => {
    try {
      const { query } = req.body;
      const response  = await axios.get(`https://gutendex.com/books?search=${encodeURIComponent(query)}`);
      const results   = response.data.results.slice(0, 10);

      let count = 0;
      for (const item of results) {
        const epubUrl = item.formats["application/epub+zip"];
        if (!epubUrl) continue;
        if (await Book.findOne({ gutenbergId: item.id })) continue;
        await Book.create({
          title:       item.title,
          author:      item.authors.map((a: any) => a.name).join(", "),
          category:    item.subjects[0] || "Classic Fiction",
          epubUrl,
          coverUrl:    item.formats["image/jpeg"] || "",
          description: item.summaries?.[0] || "",
          language:    item.languages?.[0] || "en",
          gutenbergId: item.id,
          status:      "Active",
        });
        count++;
      }

      await logActivity("scrape", `Batch scrape: ${count} book(s) ingested from Gutenberg (query: "${query}")`, { id: req.user.id, username: req.user.email });
      res.json({ message: `Scrape complete. ${count} books added.` });
    } catch (err: any) {
      console.error("Scrape error:", err);
      res.status(500).json({ error: "Failed to scrape Gutenberg." });
    }
  });

  // ── EPUB metadata extraction helper ───────────────────────────────────────
  async function extractEpubMetadata(filePath: string) {
    try {
      const epub = new EPub(filePath);
      await epub.parse();
      const meta: any = {
        title:       typeof epub.metadata.title    === "string" ? epub.metadata.title    : undefined,
        author:      typeof epub.metadata.creator  === "string" ? epub.metadata.creator  : undefined,
        description: typeof epub.metadata.description === "string" ? epub.metadata.description : undefined,
        language:    typeof epub.metadata.language === "string" ? epub.metadata.language : undefined,
        coverPath:   undefined as string | undefined,
      };

      const items    = Object.values(epub.manifest || {}) as any[];
      const coverItem = items.find((i) => {
        const mt = typeof i["media-type"] === "string" ? i["media-type"] : "";
        return mt.startsWith("image/") && /cover/i.test(String(i.id) + String(i.href));
      });

      if (coverItem) {
        try {
          const image   = await epub.getImage(coverItem.id);
          const extMap: Record<string, string> = { "image/jpeg": ".jpg", "image/png": ".png", "image/gif": ".gif" };
          const ext     = extMap[image.mimeType] || ".jpg";
          const coverPath = path.join(path.dirname(filePath), `${path.basename(filePath, path.extname(filePath))}_cover${ext}`);
          fs.writeFileSync(coverPath, image.data);
          meta.coverPath = coverPath;
        } catch { /* cover extraction optional */ }
      }
      return meta;
    } catch {
      return {};
    }
  }

  // ── POST /api/admin/books/upload ──────────────────────────────────────────
  app.post("/api/admin/books/upload", verifyToken, isAdmin,
    upload.fields([{ name: "epub_file", maxCount: 1 }, { name: "cover_image", maxCount: 1 }]),
    async (req, res) => {
      const files    = req.files as { [key: string]: Express.Multer.File[] } | undefined;
      const epubFiles = files?.epub_file;
      if (!epubFiles?.length) return res.status(400).json({ error: "EPUB file is required" });

      const epubFile  = epubFiles[0];
      const coverFile = files?.cover_image?.[0];

      try {
        const extracted = await extractEpubMetadata(epubFile.path);
        const { title, author, description = "", genre = "Uploaded", language = "en", gutenberg_id } = req.body;

        const finalTitle  = title  || extracted.title  || epubFile.originalname.replace(/\.epub$/i, "");
        const finalAuthor = author || extracted.author || "Unknown";

        let coverUrl = "";
        if (coverFile) {
          const dest = path.join(COVERS_DIR, coverFile.filename);
          fs.renameSync(coverFile.path, dest);
          coverUrl = `/api/books/cover-upload/${coverFile.filename}`;
        } else if (extracted.coverPath && fs.existsSync(extracted.coverPath)) {
          const fn   = `${epubFile.filename}_cover${path.extname(extracted.coverPath)}`;
          const dest = path.join(COVERS_DIR, fn);
          fs.copyFileSync(extracted.coverPath, dest);
          coverUrl = `/api/books/cover-upload/${fn}`;
        }

        const bookData: any = {
          title:       finalTitle,
          author:      finalAuthor,
          category:    genre,
          epubUrl:     `/api/books/epub-upload/${epubFile.filename}`,
          coverUrl,
          description: description || extracted.description || "",
          language:    language    || extracted.language    || "en",
          status:      "Active",
        };
        if (gutenberg_id?.trim()) bookData.gutenbergId = parseInt(gutenberg_id, 10);

        const book = await Book.create(bookData);
        await logActivity("added", `"${book.title}" by ${book.author} uploaded`, { id: req.user.id, username: req.user.email });

        res.json({ message: "Book uploaded successfully", book: { id: book._id, title: book.title, author: book.author } });
      } catch (err: any) {
        epubFiles.forEach((f) => { try { fs.unlinkSync(f.path); } catch { /**/ } });
        if (coverFile) { try { fs.unlinkSync(coverFile.path); } catch { /**/ } }
        console.error("Upload error:", err);
        res.status(500).json({ error: err.message || "Failed to upload book" });
      }
    }
  );

  // ===========================================================================
  // VITE / STATIC
  // ===========================================================================

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => res.sendFile(path.join(distPath, "index.html")));
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
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
import { createWriteStream } from "fs";
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
const __dirname = path.dirname(__filename);

// ✅ Storage configuration
const STORAGE_DIR = path.join(__dirname, "storage");
const EPUB_DIR = path.join(STORAGE_DIR, "epub");
const COVERS_DIR = path.join(STORAGE_DIR, "covers");

// Ensure directories exist
[EPUB_DIR, COVERS_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// ✅ Multer storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, EPUB_DIR);
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const sanitized = file.originalname.replace(/[^\w\s.-]/g, "").slice(0, 50);
    cb(null, `${timestamp}-${sanitized}`);
  }
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    // Accept both epub and cover image files
    const epubAllowed = file.fieldname === "epub_file" && 
                       (file.mimetype === "application/epub+zip" || file.originalname.endsWith(".epub"));
    const coverAllowed = file.fieldname === "cover_image" && 
                        file.mimetype.startsWith("image/");
    
    if (epubAllowed || coverAllowed) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type or field name"));
    }
  },
  limits: { fileSize: 500 * 1024 * 1024 } // 500MB limit
});

// ✅ Added explicit DB name "the-shelf" in URI
const MONGODB_URI =
  process.env.MONGODB_URI ||
  "mongodb://localhost:27017/the-shelf";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

// ---------------------------------------------------------------------------
// MongoDB Models
// ---------------------------------------------------------------------------

// ✅ Renamed fullName → username to match DB
const userSchema = new mongoose.Schema({
  username: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ["reader", "admin"], default: "reader" },
  createdAt: { type: Date, default: Date.now },
  failedLoginAttempts: { type: Number, default: 0 },
  lockUntil: { type: Date, default: null },
  resetToken: { type: String, default: null },
  resetTokenExpiry: { type: Date, default: null },
});

// ✅ genre → category, removed publicationYear & status, added description & language
const bookSchema = new mongoose.Schema({
  title: { type: String, required: true },
  author: { type: String, required: true },
  category: { type: String, required: true },
  epubUrl: { type: String, required: true },
  coverUrl: { type: String },
  description: { type: String, default: "" },
  language: { type: String, default: "en" },
  gutenbergId: { type: Number, unique: true, sparse: true },
  ingestedAt: { type: Date, default: Date.now },
});

// ✅ cfi → last_location to match DB, kept percentage & chapter as extras
const progressSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  bookId: { type: mongoose.Schema.Types.ObjectId, ref: "Book", required: true },
  last_location: { type: String, required: true },
  percentage: { type: Number, default: 0 },
  chapter: { type: String },
  last_read_at: { type: Date, default: Date.now },
});

const User = mongoose.model("User", userSchema);
const Book = mongoose.model("Book", bookSchema);
const ReadingProgress = mongoose.model("ReadingProgress", progressSchema);

// ✅ Sync indexes to apply schema changes (sparse option for gutenbergId)
Book.syncIndexes().then(() => {
  console.log("[Index] Synced Book indexes with sparse option");
}).catch((err) => {
  console.warn("[Index] Error syncing indexes:", err.message);
});

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------

const verifyToken = (req: any, res: any, next: any) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Access denied" });
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    req.user = decoded;
    next();
  } catch {
    res.status(400).json({ error: "Invalid token" });
  }
};

// ✅ Removed hardcoded email — just use role field in DB
const isAdmin = (req: any, res: any, next: any) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ error: "Admin access required" });
  }
  next();
};

// ---------------------------------------------------------------------------
// Server
// ---------------------------------------------------------------------------

async function startServer() {
  const app = express();
  const PORT = 3000;
  app.use((req, res, next) => {
    res.setHeader(
      "Content-Security-Policy",
      // Look closely at style-src: we added blob: 
      "default-src * 'unsafe-inline' 'unsafe-eval' blob: data:; script-src * 'unsafe-inline' 'unsafe-eval' blob:; style-src * 'unsafe-inline' blob:; img-src * blob: data:; font-src * data: blob:; connect-src * ws: wss:; worker-src blob:;"
    );
    next();
  });
  app.use(express.json());

  try {
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    console.log("Connected to MongoDB");

    // ✅ Fix E11000 error: drop old gutenbergId index to recreate with sparse option
    try {
      await Book.collection.dropIndex("gutenbergId_1");
      console.log("[Index] Dropped old gutenbergId index");
    } catch (err: any) {
      if (err.code !== 27) { // 27 = index not found (expected)
        console.warn("[Index] Error dropping index:", err.message);
      }
    }

    // Let Mongoose automatically recreate indexes with the new schema
    console.log("[Index] Mongoose will recreate indexes with sparse option");
  } catch (err) {
    console.error("MongoDB connection error:", err);
    process.exit(1);
  }

  // -------------------------------------------------------------------------
  // Auth Routes
  // -------------------------------------------------------------------------

  app.post("/api/auth/signup", async (req, res) => {
    try {
      const { username, email, password } = req.body; // ✅ username
      const hashedPassword = await bcrypt.hash(password, 10);
      const user = new User({ username, email, password: hashedPassword });
      await user.save();
      // ✅ JWT now has expiry
      const token = jwt.sign(
        { id: user._id, email: user.email, role: user.role },
        JWT_SECRET,
        { expiresIn: "7d" }
      );
      res.json({
        token,
        user: { id: user._id, username: user.username, email: user.email, role: user.role },
      });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Check if account is locked
    if (user.lockUntil && user.lockUntil > new Date()) {
      const minutesLeft = Math.ceil((user.lockUntil.getTime() - Date.now()) / 60000);
      return res.status(423).json({
        error: `Account locked. Try again in ${minutesLeft} minute(s).`,
      });
    }

    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      user.failedLoginAttempts += 1;
      if (user.failedLoginAttempts >= 5) {
        user.lockUntil = new Date(Date.now() + 15 * 60 * 1000); // lock for 15 minutes
        user.failedLoginAttempts = 0;
        await user.save();
        return res.status(423).json({
          error: "Too many failed attempts. Account locked for 15 minutes.",
        });
      }
      await user.save();
      const attemptsLeft = 5 - user.failedLoginAttempts;
      return res.status(401).json({
        error: `Invalid credentials. ${attemptsLeft} attempt(s) remaining before lockout.`,
      });
    }

    // Successful login — reset counters
    user.failedLoginAttempts = 0;
    user.lockUntil = null;
    await user.save();

    const token = jwt.sign(
      { id: user._id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: "7d" }
    );
    res.json({
      token,
      user: { id: user._id, username: user.username, email: user.email, role: user.role },
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

  app.get("/api/auth/me", verifyToken, async (req, res) => {
    try {
      const user = await User.findById(req.user.id);
      if (!user) return res.status(404).json({ error: "User not found" });
      res.json({ id: user._id, username: user.username, email: user.email, role: user.role });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

app.post("/api/auth/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    // Always return same message to prevent email harvesting
    if (!user) {
      return res.json({ message: "If that email is registered, you'll receive a reset link shortly." });
    }

    // Generate token and set 30 min expiry
    const token = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
    user.resetToken = token;
    user.resetTokenExpiry = new Date(Date.now() + 30 * 60 * 1000);
    await user.save();

    const resetLink = `http://localhost:3000/forgot-password?token=${token}`;

    await transporter.sendMail({
      from: `"The Shelf" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Password Reset Request",
      html: `
        <div style="font-family: Georgia, serif; max-width: 480px; margin: auto; padding: 40px; background: #FAF6EE; border: 1px solid #D9CFC4; border-radius: 12px;">
          <h2 style="color: #2C1810; font-size: 28px; margin-bottom: 8px;">The Shelf</h2>
          <p style="color: #7A6652; font-style: italic; margin-bottom: 32px;">Password Reset Request</p>
          <p style="color: #2C1810;">Click the button below to reset your password. This link expires in <strong>30 minutes</strong>.</p>
          <a href="${resetLink}" style="display: inline-block; margin: 24px 0; padding: 14px 28px; background: #4A7C59; color: white; text-decoration: none; border-radius: 8px; font-weight: bold;">Reset Password</a>
          <p style="color: #7A6652; font-size: 13px;">If you didn't request this, you can safely ignore this email.</p>
          <p style="color: #D9CFC4; font-size: 12px; margin-top: 32px;">If the button doesn't work, copy this link: ${resetLink}</p>
        </div>
      `,
    });

    res.json({ message: "If that email is registered, you'll receive a reset link shortly." });
  } catch (error: any) {
    console.error("Forgot password error:", error);
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/auth/reset-password", async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    const user = await User.findOne({
      resetToken: token,
      resetTokenExpiry: { $gt: new Date() }, // token must not be expired
    });

    if (!user) {
      return res.status(400).json({ error: "Invalid or expired reset token." });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    user.resetToken = null;
    user.resetTokenExpiry = null;
    user.failedLoginAttempts = 0;
    user.lockUntil = null;
    await user.save();

    res.json({ message: "Password reset successfully. You can now log in." });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});
  // -------------------------------------------------------------------------
  // Book Routes
  // -------------------------------------------------------------------------

  app.get("/api/books", async (req, res) => {
    try {
      const books = await Book.find().sort({ ingestedAt: -1 });
      res.json(
        books.map((b) => ({
          id: b._id,
          title: b.title,
          author: b.author,
          category: b.category,        // ✅ was genre
          epubUrl: b.epubUrl,
          coverUrl: b.coverUrl,
          description: b.description,
          language: b.language,
        }))
      );
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/books/:id", async (req, res) => {
    try {
      const book = await Book.findById(req.params.id);
      if (!book) return res.status(404).json({ error: "Book not found" });
      res.json({
        id: book._id,
        title: book.title,
        author: book.author,
        category: book.category,       // ✅ was genre
        epubUrl: book.epubUrl,
        coverUrl: book.coverUrl,
        description: book.description,
        language: book.language,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // -------------------------------------------------------------------------
  // Reading Progress Routes
  // -------------------------------------------------------------------------

  app.get("/api/progress/:bookId", verifyToken, async (req, res) => {
    try {
      const progress = await ReadingProgress.findOne({
        userId: req.user.id,
        bookId: req.params.bookId,
      });
      res.json(
        progress
          ? {
              last_location: progress.last_location,  // ✅ was cfi
              percentage: progress.percentage,
              chapter: progress.chapter,
            }
          : null
      );
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/progress", verifyToken, async (req, res) => {
    try {
      const { bookId, last_location, percentage, chapter } = req.body; // ✅ was cfi
      await ReadingProgress.findOneAndUpdate(
        { userId: req.user.id, bookId },
        { last_location, percentage, chapter, last_read_at: new Date() },
        { upsert: true, new: true }
      );
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // -------------------------------------------------------------------------
  // Profile Routes
  // -------------------------------------------------------------------------

  app.get("/api/profile/history", verifyToken, async (req, res) => {
    try {
      const history = await ReadingProgress.find({ userId: req.user.id })
        .populate("bookId")
        .sort({ last_read_at: -1 });

      res.json(
        history.map((h) => ({
          id: h._id,
          bookId: (h.bookId as any)._id,
          percentage: h.percentage,
          lastReadAt: h.last_read_at,
          book: {
            id: (h.bookId as any)._id,
            title: (h.bookId as any).title,
            author: (h.bookId as any).author,
            coverUrl: (h.bookId as any).coverUrl,
          },
        }))
      );
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.put("/api/profile", verifyToken, async (req, res) => {
    try {
      const { username } = req.body; // ✅ was fullName
      await User.findByIdAndUpdate(req.user.id, { username });
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.put("/api/profile/password", verifyToken, async (req, res) => {
    try {
      const { currentPassword, newPassword } = req.body;
      const user = await User.findById(req.user.id);
      if (!user || !(await bcrypt.compare(currentPassword, user.password))) {
        return res.status(401).json({ error: "Invalid current password" });
      }
      user.password = await bcrypt.hash(newPassword, 10);
      await user.save();
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // -------------------------------------------------------------------------
  // Admin Routes
  // -------------------------------------------------------------------------

  app.post("/api/admin/books/scrape", verifyToken, isAdmin, async (req, res) => {
    try {
      const { query, limit = 10, language = "en" } = req.body;
      const response = await axios.get(
        `https://gutendex.com/books?search=${encodeURIComponent(query)}`
      );
      const results = response.data.results.slice(0, limit);

      let added = 0;
      let skipped_duplicates = 0;
      let failed = 0;
      const books_added = [];

      for (const item of results) {
        const epubUrl = item.formats["application/epub+zip"];
        if (!epubUrl) {
          failed++;
          continue;
        }

        const existingBook = await Book.findOne({ gutenbergId: item.id });
        if (existingBook) {
          skipped_duplicates++;
          continue;
        }

        try {
          const book = new Book({
            title: item.title,
            author: item.authors.map((a: any) => a.name).join(", "),
            category: item.subjects[0] || "Classic Fiction",
            epubUrl,
            coverUrl: item.formats["image/jpeg"] || "",
            description: item.summaries?.[0] || "",
            language: item.languages?.[0] || language,
            gutenbergId: item.id,
          });
          const savedBook = await book.save();
          added++;
          books_added.push({
            book_id: savedBook._id.toString(),
            title: savedBook.title,
            author: savedBook.author,
          });
        } catch (err) {
          console.error("Error saving book:", err);
          failed++;
        }
      }

      res.json({
        message: `Scrape completed. ${added} book${added !== 1 ? "s" : ""} added, ${skipped_duplicates} skipped, ${failed} failed.`,
        added,
        skipped_duplicates,
        failed,
        books_added,
      });
    } catch (error: any) {
      console.error("Scrape error:", error);
      res.status(500).json({ error: "Failed to scrape Gutenberg." });
    }
  });

  // ── EPUB Metadata Extraction ──────────────────────────────────────────────
  async function extractEpubMetadata(filePath: string): Promise<{
    title?: string;
    author?: string;
    description?: string;
    language?: string;
    coverPath?: string;
  }> {
    try {
      const epub = new EPub(filePath);
      await epub.parse();

      const metadata = {
        title: typeof epub.metadata.title === "string" ? epub.metadata.title : undefined,
        author: typeof epub.metadata.creator === "string" ? epub.metadata.creator : undefined,
        description: typeof epub.metadata.description === "string"
          ? epub.metadata.description
          : typeof epub.metadata.subject === "string"
            ? epub.metadata.subject
            : undefined,
        language: typeof epub.metadata.language === "string" ? epub.metadata.language : undefined,
        coverPath: undefined as string | undefined,
      };

      // Extract a cover image if the EPUB manifest includes one
      const manifestItems = Object.values(epub.manifest || {}) as Array<{ id: string; href: string; [key: string]: unknown }>;
      const coverItem = manifestItems.find(item => {
        const mediaType = typeof item["media-type"] === "string" ? item["media-type"] : "";
        const href = typeof item.href === "string" ? item.href : "";
        const id = typeof item.id === "string" ? item.id : "";
        return mediaType.startsWith("image/") && /cover/i.test(id + href);
      });

      if (coverItem) {
        try {
          const image = await epub.getImage(coverItem.id);
          const extMap: Record<string, string> = {
            "image/jpeg": ".jpg",
            "image/jpg": ".jpg",
            "image/png": ".png",
            "image/gif": ".gif",
            "image/svg+xml": ".svg",
          };
          const ext = extMap[image.mimeType] || path.extname(coverItem.href) || ".jpg";
          const coverPath = path.join(path.dirname(filePath), `${path.basename(filePath, path.extname(filePath))}_cover${ext}`);
          fs.writeFileSync(coverPath, image.data);
          metadata.coverPath = coverPath;
        } catch (err) {
          console.warn("Failed to extract cover image from EPUB:", err);
        }
      }

      return metadata;
    } catch (error) {
      console.warn("Failed to parse EPUB metadata:", error);
      return {};
    }
  }

  // ✅ NEW: Upload EPUB file endpoint
  app.post("/api/admin/books/upload", verifyToken, isAdmin, upload.fields([
    { name: "epub_file", maxCount: 1 },
    { name: "cover_image", maxCount: 1 }
  ]), async (req, res) => {
    try {
      const files = req.files as { [key: string]: Express.Multer.File[] } | undefined;
      const epubFiles = files?.epub_file;

      if (!epubFiles || epubFiles.length === 0) {
        return res.status(400).json({ error: "EPUB file is required" });
      }

      const epubFile = epubFiles[0];
      const coverFile = files?.cover_image?.[0];

      // Extract metadata from the EPUB file
      const extractedMetadata = await extractEpubMetadata(epubFile.path);

      // Use provided values or fall back to extracted metadata
      const { title, author, description = "", genre = "Uploaded", language = "en", gutenberg_id } = req.body;

      const finalTitle = title || extractedMetadata.title || epubFile.originalname.replace(/\.epub$/i, "");
      const finalAuthor = author || extractedMetadata.author || "Unknown";
      const finalDescription = description || extractedMetadata.description || "";
      const finalLanguage = language || extractedMetadata.language || "en";

      // For batch uploads, we might not have manual metadata, so use extracted or defaults
      if (!finalTitle || !finalAuthor) {
        // Clean up uploaded files if we still don't have required metadata
        epubFiles.forEach(f => fs.unlinkSync(f.path));
        files?.cover_image?.forEach(f => fs.unlinkSync(f.path));
        return res.status(400).json({ error: "Could not extract title and author from EPUB file. Please provide them manually." });
      }

      const epubRelativePath = `/api/books/epub-upload/${epubFile.filename}`;

      let coverUrl = "";
      // If a cover image was uploaded manually, use it
      if (coverFile) {
        const coverPath = path.join(COVERS_DIR, coverFile.filename);
        try {
          fs.renameSync(coverFile.path, coverPath);
          coverUrl = `/api/books/cover-upload/${coverFile.filename}`;
        } catch (err) {
          console.warn("Failed to move uploaded cover image:", err);
        }
      }
      // Otherwise, try to use extracted cover from EPUB
      else if (extractedMetadata.coverPath && fs.existsSync(extractedMetadata.coverPath)) {
        try {
          const coverFilename = `${epubFile.filename.replace(/\.epub$/i, '')}_cover${path.extname(extractedMetadata.coverPath)}`;
          const coverPath = path.join(COVERS_DIR, coverFilename);
          fs.copyFileSync(extractedMetadata.coverPath, coverPath);
          coverUrl = `/api/books/cover-upload/${coverFilename}`;
        } catch (err) {
          console.warn("Failed to extract cover from EPUB:", err);
        }
      }

      const bookData: any = {
        title: finalTitle,
        author: finalAuthor,
        category: genre,
        epubUrl: epubRelativePath,
        coverUrl,
        description: finalDescription,
        language: finalLanguage,
      };

      // Add gutenberg_id if provided
      if (gutenberg_id && gutenberg_id.trim()) {
        bookData.gutenbergId = parseInt(gutenberg_id, 10);
      }

      const book = new Book(bookData);
      await book.save();

      res.json({
        message: "Book uploaded successfully",
        book: {
          id: book._id,
          title: book.title,
          author: book.author,
          epubUrl: book.epubUrl,
        }
      });
    } catch (error: any) {
      // Clean up files on error
      const files = req.files as { [key: string]: Express.Multer.File[] } | undefined;
      files?.epub_file?.forEach(f => {
        try { fs.unlinkSync(f.path); } catch (e) { /* ignore */ }
      });
      files?.cover_image?.forEach(f => {
        try { fs.unlinkSync(f.path); } catch (e) { /* ignore */ }
      });

      console.error("Upload error:", error);
      res.status(500).json({ error: error.message || "Failed to upload book" });
    }
  });

  // ✅ NEW: Serve uploaded EPUB files
  app.get("/api/books/epub-upload/:filename", (req, res) => {
    try {
      const { filename } = req.params;
      const filePath = path.join(EPUB_DIR, filename);

      // Security: prevent directory traversal
      if (!filePath.startsWith(EPUB_DIR)) {
        return res.status(403).json({ error: "Access denied" });
      }

      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: "File not found" });
      }

      res.setHeader("Content-Type", "application/epub+zip");
      res.setHeader("Accept-Ranges", "bytes");
      res.sendFile(filePath);
    } catch (error: any) {
      console.error("EPUB upload serve error:", error);
      res.status(500).json({ error: "Failed to serve EPUB" });
    }
  });

  // ✅ NEW: Serve uploaded cover images
  app.get("/api/books/cover-upload/:filename", (req, res) => {
    try {
      const { filename } = req.params;
      const filePath = path.join(COVERS_DIR, filename);

      // Security: prevent directory traversal
      if (!filePath.startsWith(COVERS_DIR)) {
        return res.status(403).json({ error: "Access denied" });
      }

      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: "File not found" });
      }

      res.setHeader("Content-Type", "image/jpeg");
      res.sendFile(filePath);
    } catch (error: any) {
      console.error("Cover upload serve error:", error);
      res.status(500).json({ error: "Failed to serve cover" });
    }
  });

  app.delete("/api/admin/books/:id", verifyToken, isAdmin, async (req, res) => {
    try {
      await Book.findByIdAndDelete(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.put("/api/admin/books/:id", verifyToken, isAdmin, async (req, res) => {
    try {
      await Book.findByIdAndUpdate(req.params.id, req.body);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Proxy route — fetches external epub URLs server-side to avoid CORS
app.get("/api/books/epub-proxy/:id", async (req, res) => {
  try {
    const book = await Book.findById(req.params.id);
    if (!book) return res.status(404).json({ error: "Book not found" });

    const epubUrl = book.epubUrl;

    res.setHeader("Content-Type", "application/epub+zip");
    res.setHeader("Access-Control-Allow-Origin", "*");

    // Local uploaded file — serve directly from disk
    if (epubUrl.startsWith("/api/books/epub-upload/")) {
      const filename = epubUrl.replace("/api/books/epub-upload/", "");
      const filePath = path.join(EPUB_DIR, filename);
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: "EPUB file not found on disk" });
      }
      return res.sendFile(filePath);
    }

    // External URL (Gutenberg etc) — proxy it
    const response = await axios.get(epubUrl, { responseType: "stream" });
    response.data.pipe(res);
  } catch (err: any) {
    console.error("EPUB proxy error:", err.message);
    res.status(500).json({ error: "Failed to fetch EPUB file." });
  }
});

  // -------------------------------------------------------------------------
  // Vite / Static
  // -------------------------------------------------------------------------

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import axios from "axios";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}

dotenv.config({ path: ".env.local" });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
  gutenbergId: { type: Number, unique: true },
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

  app.use(express.json());

  try {
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    console.log("Connected to MongoDB");
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
      if (!user || !(await bcrypt.compare(password, user.password))) {
        return res.status(401).json({ error: "Invalid credentials" });
      }
      // ✅ JWT with expiry
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
      const { query } = req.body;
      const response = await axios.get(
        `https://gutendex.com/books?search=${encodeURIComponent(query)}`
      );
      const results = response.data.results.slice(0, 10);

      let ingestedCount = 0;
      for (const item of results) {
        const epubUrl = item.formats["application/epub+zip"];
        if (!epubUrl) continue;

        const existingBook = await Book.findOne({ gutenbergId: item.id });
        if (!existingBook) {
          const book = new Book({
            title: item.title,
            author: item.authors.map((a: any) => a.name).join(", "),
            category: item.subjects[0] || "Classic Fiction", // ✅ was genre
            epubUrl,
            coverUrl: item.formats["image/jpeg"] || "",
            description: item.summaries?.[0] || "",           // ✅ added
            language: item.languages?.[0] || "en",            // ✅ added
            gutenbergId: item.id,
            // ✅ Removed publicationYear (was wrongly storing download_count)
          });
          await book.save();
          ingestedCount++;
        }
      }
      res.json({ message: `Scrape complete. ${ingestedCount} books added.` });
    } catch (error: any) {
      console.error("Scrape error:", error);
      res.status(500).json({ error: "Failed to scrape Gutenberg." });
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
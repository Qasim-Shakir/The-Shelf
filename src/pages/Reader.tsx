// Reader.tsx

import React, { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import ePub, { Rendition, Book } from "epubjs";
import { ChevronLeft, Maximize, Minimize, ChevronRight, List, BookOpen, Moon, Sun } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import axios from "axios";

const PAGE_FLIP_STYLE = `
  @keyframes flipRight {
    0%   { opacity: 0; transform: perspective(800px) rotateY(-25deg) scaleX(0.92); }
    40%  { opacity: 0.18; }
    100% { opacity: 0; transform: perspective(800px) rotateY(0deg) scaleX(1); }
  }
  @keyframes flipLeft {
    0%   { opacity: 0; transform: perspective(800px) rotateY(25deg) scaleX(0.92); }
    40%  { opacity: 0.18; }
    100% { opacity: 0; transform: perspective(800px) rotateY(0deg) scaleX(1); }
  }
  .flip-overlay-right {
    animation: flipRight 0.32s ease-out forwards;
    background: linear-gradient(to left, rgba(0,0,0,0.06) 0%, transparent 60%);
    pointer-events: none;
  }
  .flip-overlay-left {
    animation: flipLeft 0.32s ease-out forwards;
    background: linear-gradient(to right, rgba(0,0,0,0.06) 0%, transparent 60%);
    pointer-events: none;
  }
`;

// ── Theme tokens ──────────────────────────────────────────────────────────────
const LIGHT_THEME = {
  pageBg:        "#F5F0E8",   // Warm Linen
  cardBg:        "#FDFAF5",   // Parchment
  heading:       "#3B2F1E",   // Dark Walnut
  body:          "#7C6147",   // Tan Oak
  border:        "#C5B9A8",   // Dust
  accent:        "#C8A96E",   // Aged Gold
  readerBg:      "#FDFAF5",   // Parchment
  readerText:    "#2C1810",
  readerIframe:  "transparent",
};

const DARK_THEME = {
  pageBg:        "#1C1A17",
  cardBg:        "#242019",
  heading:       "#E8DCC8",
  body:          "#A89880",
  border:        "#3A3528",
  accent:        "#C8A96E",
  readerBg:      "#242019",
  readerText:    "#DDD0B8",
  readerIframe:  "#242019",
};

export default function Reader() {
  const { id }         = useParams();
  const [searchParams] = useSearchParams();
  const navigate       = useNavigate();
  const { user }       = useAuth();

  const viewerRef      = useRef<HTMLDivElement>(null);
  const bookRef        = useRef<Book | null>(null);
  const renditionRef   = useRef<Rendition | null>(null);
  const flipTimerRef   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentCfiRef  = useRef<string | null>(null);
  const initialDisplayDoneRef = useRef(false);
  const maxProgressRef = useRef<{ cfi: string; pct: number; chapter: string } | null>(null);
  const autoSaveTimer  = useRef<ReturnType<typeof setInterval> | null>(null);
  const retryTimer     = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [bookMeta,        setBookMeta]        = useState<any>(null);
  const [isLoading,       setIsLoading]       = useState(true);
  const [progress,        setProgress]        = useState(0);
  const [chapter,         setChapter]         = useState("");
  const [totalPages,      setTotalPages]      = useState(0);
  const [currentPage,     setCurrentPage]     = useState(0);
  const [toc,             setToc]             = useState<any[]>([]);
  const [isSidebarOpen,   setIsSidebarOpen]   = useState(false);
  const [fontSize,        setFontSize]        = useState(18);
  const [isFullscreen,    setIsFullscreen]    = useState(false);
  const [layout,          setLayout]          = useState<"spread" | "single">("spread");
  const [flipDir,         setFlipDir]         = useState<"" | "right" | "left">("");
  const [error,           setError]           = useState("");
  const [isDark,          setIsDark]          = useState(false);
  
  const [pageInputValue,  setPageInputValue]  = useState("");
  const [isEditingPage,   setIsEditingPage]   = useState(false);
  const pageInputRef      = useRef<HTMLInputElement>(null);

  const token  = localStorage.getItem("token");
  const colors = isDark ? DARK_THEME : LIGHT_THEME;

  // ── THE BULLETPROOF SYNC REF ──
  // This guarantees our event listener always has the absolute latest ID and Token
  const syncRef = useRef({ id, token });
  useEffect(() => {
    syncRef.current = { id, token };
  }, [id, token]);

  useEffect(() => {
    if (document.getElementById("shelf-flip-style")) return;
    const style       = document.createElement("style");
    style.id          = "shelf-flip-style";
    style.textContent = PAGE_FLIP_STYLE;
    document.head.appendChild(style);
  }, []);

  // ── Save progress ─────────────────────────────────────────────────────────
const saveProgress = useCallback(async (cfi: string, pct: number, currentChapter: string, isRetry = false) => {
    const { id: activeId, token: activeToken } = syncRef.current;
    if (!activeToken || activeToken === "null" || !activeId || !cfi) return;

    try {
      await axios.post(
        `/api/progress`,
        {
          bookId: activeId,
          last_location: cfi,
          percentage: Math.round(pct),
          chapter: currentChapter || "Unknown Chapter",
          last_read_at: new Date().toISOString(),
        },
        { headers: { Authorization: `Bearer ${activeToken}` } }
      );
      console.log(`✅ Progress saved — ${Math.round(pct)}%`);
      if (retryTimer.current) { clearTimeout(retryTimer.current); retryTimer.current = null; }
    } catch (err) {
      console.error("❌ Save error:", err);
      if (!isRetry) {
        retryTimer.current = setTimeout(() => {
          const snap = maxProgressRef.current;
          if (snap) saveProgress(snap.cfi, snap.pct, snap.chapter, true);
        }, 30000);
      }
    }
  }, []);

  // Only save if this position is further than what we've saved before
  const saveIfFurther = useCallback((cfi: string, pct: number, chapter: string) => {
    const prev = maxProgressRef.current;
    if (!prev || pct >= prev.pct) {
      maxProgressRef.current = { cfi, pct, chapter };
      saveProgress(cfi, pct, chapter);
    }
  }, [saveProgress]);

  // ── Mount a rendition ────────────────────────────────────────────────────
  const mountRendition = useCallback((
    book:            Book,
    container:       HTMLDivElement,
    spreadMode:      "spread" | "single",
    resumeCfi:       string | null,
    currentFontSize: number,
    dark:            boolean,
  ) => {
    if (renditionRef.current) {
      try { renditionRef.current.destroy(); } catch { /* ignore */ }
      renditionRef.current = null;
    }

    initialDisplayDoneRef.current = false;
    const c = dark ? DARK_THEME : LIGHT_THEME;

    const rendition = book.renderTo(container, {
      width:                "100%",
      height:               "100%",
      flow:                 "paginated",
      spread:               spreadMode === "spread" ? "always" : "none",
      minSpreadWidth:       spreadMode === "spread" ? 600 : 9999,
      manager:              "default",
      allowScriptedContent: true,
    });
    renditionRef.current = rendition;

    const injectStyle = (selector: string, rules: Record<string, string>) =>
      (rendition.themes as any).override(selector, rules);

    injectStyle("body", {
      "color":       c.readerText,
      "background":  c.readerBg,
      "font-family": "Georgia, 'Times New Roman', serif",
      "font-size":   `${currentFontSize}px`,
      "line-height": "1.85",
      "padding":     spreadMode === "spread" ? "2rem 2.5rem" : "2rem 4rem",
      "max-width":   "100%",
      "box-sizing":  "border-box",
    });
    injectStyle("p", { "margin": "0 0 1.2em 0", "text-align": "justify", "text-indent": "1.5em", "hyphens": "auto" });
    injectStyle("h1, h2, h3", { "font-family": "Georgia, serif", "text-align": "center", "margin-bottom": "1.5em", "color": dark ? "#C8A96E" : "#2C1810" });
    injectStyle("img", { "max-width": "100%", "height": "auto", "display": "block", "margin": "1rem auto" });

    rendition.themes.fontSize(`${currentFontSize}px`);

    rendition.on("relocated", (location: any) => {
      const cfi = location.start.cfi;
      currentCfiRef.current = cfi;

      const pct     = (book.locations.percentageFromCfi(cfi) ?? 0) * 100;
      const loc     = book.locations.locationFromCfi(cfi);
      const pageNum = typeof loc === "number" ? loc : 0;
      
      // Extract the new chapter directly so we don't rely on stale React state
      const navItem = book.navigation?.get(cfi);
      const newChapter = navItem?.label || "";

      setProgress(pct);
      setCurrentPage(pageNum);
      setChapter(newChapter);
      setIsLoading(false);

      console.log(`📖 Flipped to page ${pageNum}`);

      if (!initialDisplayDoneRef.current) {
        console.log("🚧 Skipping save for initial load.");
        initialDisplayDoneRef.current = true;
        return; 
      }

      saveIfFurther(cfi, pct, newChapter);
    });

    rendition.display(resumeCfi ?? undefined);
    return rendition;
  }, [saveProgress]);

  // ── Initial load ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!id || !user || !viewerRef.current) return;

    let epubBook: Book | null = null;

    const initReader = async () => {
      try {
        const bookRes = await axios.get(`/api/books/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setBookMeta(bookRes.data);

        if (!bookRes.data.epubUrl) {
          setError("No EPUB file found for this book.");
          setIsLoading(false);
          return;
        }

        const epubRes = await axios.get(`/api/books/epub-proxy/${id}`, {
          responseType: "arraybuffer",
          headers: { Authorization: `Bearer ${token}` },
        });

        epubBook        = ePub(epubRes.data);
        bookRef.current = epubBook;

        epubBook.loaded.navigation.then((nav: any) => {
          const toc = nav?.toc ?? nav?.landmarks ?? [];
          if (toc.length > 0) { setToc(toc); return; }
          // fallback: build TOC from spine items
          // fallback: build TOC from spine items
          const spine = (epubBook as any).spine;
          const items = spine?.items ?? spine?.spineItems ?? [];
          const fallback = items
            .filter((item: any) => item.href)
            .map((item: any, i: number) => ({
              label: item.label || item.idref || `Section ${i + 1}`,
              href:  item.href,
            }));
          setToc(fallback);
        });

        await epubBook.ready;
        await epubBook.locations.generate(1600);
        setTotalPages(epubBook.locations.length());

        let savedCfi: string | null = null;
        try {
          const pRes = await axios.get(`/api/progress/${id}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (pRes.data?.last_location) savedCfi = pRes.data.last_location;
        } catch { /* no saved progress */ }

        const reset = searchParams.get("reset") === "true";
        currentCfiRef.current = savedCfi && !reset ? savedCfi : null;

        mountRendition(epubBook, viewerRef.current!, layout, currentCfiRef.current, fontSize, isDark);

        // Auto-save every 5 seconds
        if (autoSaveTimer.current) clearInterval(autoSaveTimer.current);
        autoSaveTimer.current = setInterval(() => {
          const snap = maxProgressRef.current;
          if (snap) saveProgress(snap.cfi, snap.pct, snap.chapter);
        }, 5000);

      } catch (err: any) {
        console.error("Reader init failed:", err);
        setError(err.response?.data?.error ?? "Failed to load the book. Please try again.");
        setIsLoading(false);
      }
    };

    initReader();

    return () => {
      if (flipTimerRef.current) clearTimeout(flipTimerRef.current);
      if (autoSaveTimer.current) clearInterval(autoSaveTimer.current);
      if (retryTimer.current) clearTimeout(retryTimer.current);
      // Final save on unmount
      const snap = maxProgressRef.current;
      if (snap) saveProgress(snap.cfi, snap.pct, snap.chapter);
      if (epubBook) epubBook.destroy();
    };
  }, [id, user]);

  // ── Save on tab close / browser close ────────────────────────────────────
  useEffect(() => {
    const handleUnload = () => {
      const snap = maxProgressRef.current;
      const { id: activeId, token: activeToken } = syncRef.current;
      if (!snap || !activeId || !activeToken) return;
      // Use sendBeacon for guaranteed delivery on page close
      navigator.sendBeacon(
        `/api/progress`,
        new Blob([JSON.stringify({
          bookId: activeId,
          last_location: snap.cfi,
          percentage: Math.round(snap.pct),
          chapter: snap.chapter,
          last_read_at: new Date().toISOString(),
        })], { type: "application/json" })
      );
    };
    window.addEventListener("beforeunload", handleUnload);
    return () => window.removeEventListener("beforeunload", handleUnload);
  }, []);


  // ── Keyboard navigation ──────────────────────────────────────────────────
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (isEditingPage) return;
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;

      if (e.key === "ArrowRight" || e.key === "ArrowDown" || e.key === " ") {
        e.preventDefault();
        triggerFlip("right", () => renditionRef.current?.next());
      } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        e.preventDefault();
        triggerFlip("left", () => renditionRef.current?.prev());
      }
    };

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [isEditingPage]);

  // ── Layout switch ────────────────────────────────────────────────────────
  const switchLayout = useCallback((newLayout: "spread" | "single") => {
    const book      = bookRef.current;
    const container = viewerRef.current;
    if (!book || !container) return;

    setLayout(newLayout);
    setIsLoading(true);

    mountRendition(book, container, newLayout, currentCfiRef.current, fontSize, isDark);
  }, [fontSize, isDark, mountRendition]);

  const toggleDark = useCallback(() => {
    const book      = bookRef.current;
    const container = viewerRef.current;
    const newDark   = !isDark;
    setIsDark(newDark);
    if (!book || !container) return;
    setIsLoading(true);
    mountRendition(book, container, layout, currentCfiRef.current, fontSize, newDark);
  }, [isDark, layout, fontSize, mountRendition]);

  // ── Flip animation ───────────────────────────────────────────────────────
  const triggerFlip = useCallback((dir: "right" | "left", action: () => void) => {
    action();
    setFlipDir(dir);
    if (flipTimerRef.current) clearTimeout(flipTimerRef.current);
    flipTimerRef.current = setTimeout(() => setFlipDir(""), 350);
  }, []);

  const handlePrev = () => triggerFlip("left",  () => renditionRef.current?.prev());
  const handleNext = () => triggerFlip("right", () => renditionRef.current?.next());

  // ── Page jump ────────────────────────────────────────────────────────────
  const openPageInput = () => {
    setPageInputValue(String(currentPage));
    setIsEditingPage(true);
    setTimeout(() => pageInputRef.current?.select(), 0);
  };

  const commitPageJump = () => {
    const book = bookRef.current;
    const n    = parseInt(pageInputValue, 10);
    setIsEditingPage(false);

    if (!book || isNaN(n) || n < 1 || n > totalPages) return;

    const cfi = book.locations.cfiFromLocation(n);
    if (cfi) renditionRef.current?.display(cfi);
  };

  const handlePageInputKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter")  commitPageJump();
    if (e.key === "Escape") setIsEditingPage(false);
  };

  const changeFontSize = (delta: number) => {
    const newSize = Math.max(12, Math.min(32, fontSize + delta));
    setFontSize(newSize);
    renditionRef.current?.themes.fontSize(`${newSize}px`);
    (renditionRef.current?.themes as any)?.override("body", { "font-size": `${newSize}px` });
  };

  const jumpTo = (href: string) => {
    renditionRef.current?.display(href);
    setIsSidebarOpen(false);
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const controlBtn = `px-2 py-1.5 hover:opacity-80 text-sm font-bold transition-colors`;

  return (
    <div
      className="fixed inset-0 flex flex-col z-[100]"
      style={{ background: colors.pageBg, color: colors.body }}
    >
      {/* Loading overlay */}
      {isLoading && !error && (
        <div
          className="absolute inset-0 z-[200] flex flex-col items-center justify-center gap-4"
          style={{ background: colors.pageBg }}
        >
          <div
            className="w-10 h-10 border-2 rounded-full animate-spin"
            style={{ borderColor: colors.border, borderTopColor: colors.accent }}
          />
          <p className="font-serif italic text-lg" style={{ color: colors.body }}>
            {bookMeta ? `Opening ${bookMeta.title}…` : "Loading…"}
          </p>
          <p className="text-xs" style={{ color: colors.border }}>This may take a moment for larger books</p>
        </div>
      )}

      {/* Error overlay */}
      {error && (
        <div
          className="absolute inset-0 z-[200] flex flex-col items-center justify-center gap-4"
          style={{ background: colors.pageBg }}
        >
          <p className="text-xl font-serif font-bold text-center px-8" style={{ color: colors.heading }}>{error}</p>
          <button
            onClick={() => navigate(`/book/${id}`)}
            className="text-sm underline"
            style={{ color: colors.body }}
          >
            ← Back to book
          </button>
        </div>
      )}

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <header
        className="h-14 flex items-center justify-between px-4 md:px-6 shrink-0 z-10 border-b"
        style={{ background: colors.pageBg, borderColor: colors.border }}
      >
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => navigate(`/book/${id}`)}
            className="flex items-center gap-1 transition-colors shrink-0"
            style={{ color: colors.body }}
          >
            <ChevronLeft size={20} />
            <span className="text-xs font-bold uppercase tracking-widest hidden sm:inline">Back</span>
          </button>
          <h1
            className="text-sm md:text-base font-serif font-bold truncate"
            style={{ color: colors.heading }}
          >
            {bookMeta ? `${bookMeta.title} — ${bookMeta.author}` : ""}
          </h1>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Layout toggle */}
          <div
            className="hidden sm:flex items-center rounded-lg overflow-hidden border"
            style={{ borderColor: colors.border, background: colors.cardBg }}
          >
            <button
              onClick={() => layout !== "single" && switchLayout("single")}
              className={`px-3 py-1.5 text-xs font-bold transition-colors border-r`}
              style={{
                borderColor:      colors.border,
                background:       layout === "single" ? colors.heading : "transparent",
                color:            layout === "single" ? colors.cardBg  : colors.body,
              }}
            >
              1 Page
            </button>
            <button
              onClick={() => layout !== "spread" && switchLayout("spread")}
              className={`px-3 py-1.5 text-xs font-bold transition-colors flex items-center gap-1`}
              style={{
                background: layout === "spread" ? colors.heading : "transparent",
                color:      layout === "spread" ? colors.cardBg  : colors.body,
              }}
            >
              <BookOpen size={13} /> 2 Pages
            </button>
          </div>

          {/* Font size */}
          <div
            className="flex items-center rounded-lg overflow-hidden border"
            style={{ borderColor: colors.border, background: colors.cardBg }}
          >
            <button
              onClick={() => changeFontSize(-2)}
              className={`${controlBtn} border-r`}
              style={{ borderColor: colors.border, color: colors.body }}
            >A-</button>
            <button
              onClick={() => changeFontSize(+2)}
              className={controlBtn}
              style={{ color: colors.body }}
            >A+</button>
          </div>

          {/* Dark mode toggle */}
          <button
            onClick={toggleDark}
            className="p-1.5 rounded-lg border transition-colors"
            style={{ borderColor: colors.border, background: colors.cardBg, color: colors.body }}
            title={isDark ? "Switch to light mode" : "Switch to dark mode"}
          >
            {isDark ? <Sun size={16} /> : <Moon size={16} />}
          </button>

          {/* Fullscreen */}
          <button
            onClick={toggleFullscreen}
            className="p-1.5 rounded-lg border transition-colors"
            style={{ borderColor: colors.border, background: colors.cardBg, color: colors.body }}
          >
            {isFullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
          </button>

          {/* Table of Contents */}
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-1.5 rounded-lg border transition-colors"
            style={{ borderColor: colors.border, background: colors.cardBg, color: colors.body }}
            title="Toggle table of contents"
          >
            <List size={16} />
          </button>
        </div>
      </header>

      {/* ── Progress strip ──────────────────────────────────────────────── */}
      <div
        className="h-9 flex items-center justify-between px-4 md:px-6 text-[9px] font-bold uppercase tracking-widest border-b shrink-0"
        style={{ background: colors.cardBg, borderColor: colors.border, color: colors.border }}
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className="truncate max-w-[140px] md:max-w-xs" style={{ color: colors.body }}>
            {chapter || "—"}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <div
  className="w-24 md:w-48 h-1 rounded-full overflow-hidden cursor-pointer"
  style={{ background: colors.border }}
  onClick={(e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    const book = bookRef.current;
    if (!book) return;
    const cfi = book.locations.cfiFromPercentage(pct);
    if (cfi) renditionRef.current?.display(cfi);
  }}
>
  <div
    className="h-full transition-all duration-300"
    style={{ width: `${progress}%`, background: colors.accent }}
  />
</div>
          <span style={{ color: colors.body }}>{Math.round(progress)}%</span>
        </div>
      </div>

      {/* ── Main reading area ────────────────────────────────────────────── */}
      <div className="flex-1 flex relative overflow-hidden">
        {/* TOC Sidebar */}
        <div
          className={`absolute inset-y-0 left-0 w-72 z-50 transform transition-transform duration-300 ease-in-out shadow-2xl border-r
            ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"}`}
          style={{ background: colors.cardBg, borderColor: colors.border }}
        >
          <div className="p-6 h-full flex flex-col">
            <div className="flex items-center justify-between mb-6">
              <h2
                className="text-[9px] font-bold uppercase tracking-widest"
                style={{ color: colors.border }}
              >Table of Contents</h2>
              <button
                onClick={() => setIsSidebarOpen(false)}
                className="text-lg leading-none"
                style={{ color: colors.border }}
              >✕</button>
            </div>
            <div className="flex-1 overflow-y-auto space-y-0.5">
              {toc.length === 0
                ? <p className="text-sm italic" style={{ color: colors.border }}>No chapters available.</p>
                : toc.map((item, i) => (
                    <button
                      key={i}
                      onClick={() => jumpTo(item.href)}
                      className="w-full text-left px-3 py-2.5 text-sm font-serif font-medium rounded-md transition-all"
                      style={{ color: colors.body }}
                      onMouseEnter={e => (e.currentTarget.style.background = colors.pageBg)}
                      onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                    >
                      {item.label}
                    </button>
                  ))
              }
            </div>
          </div>
        </div>

        {isSidebarOpen && (
          <div className="absolute inset-0 z-40 bg-black/20" onClick={() => setIsSidebarOpen(false)} />
        )}

        {/* ── Book viewport ──────────────────────────────────────────────── */}
        <div
          className="flex-1 flex items-stretch justify-center overflow-hidden relative"
          style={{ background: isDark ? "#161412" : "#E8E0D0" }}
        >
          {flipDir && (
            <div className={`absolute inset-0 z-30 ${flipDir === "right" ? "flip-overlay-right" : "flip-overlay-left"}`} />
          )}

          <div
            className={`relative flex-1 mx-auto flex flex-col ${layout === "spread" ? "max-w-5xl" : "max-w-2xl"}`}
            style={{
              boxShadow: layout === "spread"
                ? "0 0 60px rgba(0,0,0,0.22)"
                : "0 0 40px rgba(0,0,0,0.18)",
            }}
          >
            {layout === "spread" && (
              <div
                className="absolute inset-y-0 left-1/2 w-[2px] -translate-x-px z-20 pointer-events-none"
                style={{ background: "linear-gradient(to right, rgba(0,0,0,0.12), rgba(0,0,0,0.04), rgba(0,0,0,0.12))" }}
              />
            )}

            <div
              ref={viewerRef}
              className="flex-1"
              style={{ minHeight: "500px", background: colors.readerBg }}
            />
          </div>
        </div>
      </div>

      {/* ── Footer navigation ────────────────────────────────────────────── */}
      <footer
        className="h-16 border-t flex items-center justify-between px-4 md:px-8 shrink-0"
        style={{ background: colors.pageBg, borderColor: colors.border }}
      >
        <button
          onClick={handlePrev}
          className="flex items-center gap-2 px-5 md:px-8 py-3 border rounded-lg font-bold text-sm transition-all active:scale-95 shadow-sm"
          style={{ borderColor: colors.border, background: colors.cardBg, color: colors.body }}
        >
          <ChevronLeft size={18} />
          <span className="hidden sm:inline">Previous</span>
        </button>

        <div
          className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest"
          style={{ color: colors.border }}
        >
          {isEditingPage ? (
            <input
              ref={pageInputRef}
              type="number"
              min={1}
              max={totalPages}
              value={pageInputValue}
              onChange={e => setPageInputValue(e.target.value)}
              onKeyDown={handlePageInputKey}
              onBlur={commitPageJump}
              className="w-16 text-center text-sm font-bold rounded-md px-2 py-1 outline-none border"
              style={{
                background:  colors.cardBg,
                color:       colors.heading,
                borderColor: colors.accent,
              }}
              autoFocus
            />
          ) : (
            <button
              onClick={openPageInput}
              title="Click to jump to a page"
              className="flex items-center gap-1 transition-colors group"
            >
              <span className="group-hover:underline underline-offset-2" style={{ color: colors.body }}>
                {currentPage > 0 ? currentPage : "—"}
              </span>
              <span style={{ color: colors.border }}>/ {totalPages || "—"}</span>
            </button>
          )}
        </div>

        <button
          onClick={handleNext}
          className="flex items-center gap-2 px-5 md:px-8 py-3 border rounded-lg font-bold text-sm transition-all active:scale-95 shadow-sm"
          style={{ borderColor: colors.border, background: colors.cardBg, color: colors.body }}
        >
          <span className="hidden sm:inline">Next</span>
          <ChevronRight size={18} />
        </button>
      </footer>
    </div>
  );
}
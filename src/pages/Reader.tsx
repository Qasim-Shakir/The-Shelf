import React, { useEffect, useRef, useState } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import ePub, { Rendition, Book } from "epubjs";
import { ChevronLeft, Maximize, Minimize, ChevronRight, List, BookOpen } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import axios from "axios";

export default function Reader() {
  const { id }           = useParams();
  const [searchParams]   = useSearchParams();
  const navigate         = useNavigate();
  const { user }         = useAuth();

  const viewerRef        = useRef<HTMLDivElement>(null);
  const bookRef          = useRef<Book | null>(null);
  const renditionRef     = useRef<Rendition | null>(null);
  const saveTimerRef     = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [bookMeta,      setBookMeta]      = useState<any>(null);
  const [progress,      setProgress]      = useState(0);
  const [chapter,       setChapter]       = useState("");
  const [totalPages,    setTotalPages]    = useState(0);
  const [currentPage,   setCurrentPage]   = useState(0);
  const [toc,           setToc]           = useState<any[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [fontSize,      setFontSize]      = useState(18);
  const [isFullscreen,  setIsFullscreen]  = useState(false);
  const [error,         setError]         = useState("");
  const [phase,         setPhase]         = useState<"cover" | "loading" | "reading">("cover");
  const [savedCfi,      setSavedCfi]      = useState<string | null>(null);

  const token = localStorage.getItem("token");

  // Check browser compatibility
  useEffect(() => {
    if (typeof window === "undefined" || !window.CSS) {
      setError("Your browser does not support EPUB reading. Please use a modern browser.");
    }
  }, []);

  // Step 1: fetch book metadata + saved progress, show cover page
  useEffect(() => {
    if (!id || !user) return;
    const fetchMeta = async () => {
      try {
        const bookRes = await axios.get(`/api/books/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setBookMeta(bookRes.data);

        try {
          const progressRes = await axios.get(`/api/progress/${id}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (progressRes.data?.last_location) {
            setSavedCfi(progressRes.data.last_location);
          }
        } catch {
          // no saved progress, that's fine
        }
      } catch (err: any) {
        setError("Book is currently unavailable. Please try again later.");
      }
    };
    fetchMeta();
  }, [id, user]);

  // Step 2: called when user clicks "Start Reading"
  const startReading = async () => {
    if (!bookMeta) return;
    setPhase("reading");

    await new Promise(resolve => setTimeout(resolve, 50));

    try {
      const epubResponse = await axios.get(`/api/books/epub-proxy/${id}`, {
      responseType: "arraybuffer",
      headers: { Authorization: `Bearer ${token}` },
    });
    const epubBook = ePub(epubResponse.data);
      bookRef.current = epubBook;

      if (!viewerRef.current) return;
      const rendition = epubBook.renderTo(viewerRef.current, {        width:   "100%",
        height:  "100%",
        flow:    "paginated",
        manager: "default",
        allowScriptedContent: true,
      });
      renditionRef.current = rendition;

    (rendition.themes as any).override("body", {
      "color": "#2C1810",
      "background": "#FAF6EE",
      "font-family": "Georgia, serif",
      "padding": "20px 40px",
      "line-height": "1.8",
    });

      epubBook.loaded.navigation.then((nav) => {
        setToc(nav.toc ?? []);
      });

      epubBook.ready
        .then(() => epubBook.locations.generate(1600))
        .then(() => setTotalPages(epubBook.locations.length()));

      const reset = searchParams.get("reset") === "true";
      if (savedCfi && !reset) {
        rendition.display(savedCfi);
      } else {
        rendition.display();
      }

      rendition.on("relocated", (location: any) => {
        const cfi     = location.start.cfi;
        const pct     = (epubBook.locations.percentageFromCfi(cfi) ?? 0) * 100;
        const pageNum = epubBook.locations.locationFromCfi(cfi) ?? 0;

        setProgress(pct);
        setCurrentPage(Number(pageNum) || 0);
        const navItem = epubBook.navigation?.get(cfi);
        if (navItem?.label) setChapter(navItem.label);

        if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
        saveTimerRef.current = setTimeout(() => {
          axios.post(
            `/api/progress`,
            { bookId: id, last_location: cfi, percentage: pct },
            { headers: { Authorization: `Bearer ${token}` } }
          ).catch((err) => console.error("Progress save failed:", err));
        }, 2000);
      });

      rendition.themes.fontSize(`${fontSize}px`);

    } catch (err: any) {
      console.error("Reader init failed:", err);
      setError("Book is currently unavailable. Please try again later.");
    }
  };

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      if (bookRef.current) bookRef.current.destroy();
    };
  }, []);

  const handlePrev = () => renditionRef.current?.prev();
  const handleNext = () => renditionRef.current?.next();

  const changeFontSize = (delta: number) => {
    const newSize = Math.max(12, Math.min(32, fontSize + delta));
    setFontSize(newSize);
    renditionRef.current?.themes.fontSize(`${newSize}px`);
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

  // Error screen
  if (error) return (
    <div className="flex flex-col items-center justify-center h-screen gap-4 text-tan-oak">
      <p className="text-xl font-serif font-bold text-center px-8">{error}</p>
      <button onClick={() => navigate(`/book/${id}`)} className="text-sm underline hover:text-dark-walnut">
        ← Return to Library
      </button>
    </div>
  );

  // Cover page — shown while metadata loads and before reading starts
  if (phase === "cover" && bookMeta) return (
    <div className="fixed inset-0 bg-warm-linen flex flex-col items-center justify-center z-[100] p-8">
      <div className="max-w-md w-full bg-parchment border border-dust rounded-2xl shadow-2xl overflow-hidden">
        {bookMeta.coverUrl && (
          <div className="w-full h-72 overflow-hidden">
            <img
              src={bookMeta.coverUrl}
              alt={bookMeta.title}
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          </div>
        )}
        <div className="p-10 text-center">
          <h1 className="text-3xl font-serif font-bold text-dark-walnut mb-2">{bookMeta.title}</h1>
          <p className="text-tan-oak font-medium italic mb-2">{bookMeta.author}</p>
          {bookMeta.category && (
            <p className="text-[10px] font-bold uppercase tracking-widest text-dust mb-8">{bookMeta.category}</p>
          )}
          {savedCfi && (
            <p className="text-sm text-library-green font-medium mb-6">
              You have a saved position — pick up where you left off!
            </p>
          )}
          <div className="flex flex-col gap-3">
            <button
              onClick={startReading}
              className="w-full bg-library-green text-white py-4 rounded-lg font-bold hover:bg-[#3D5A4C] transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2"
            >
              <BookOpen size={18} />
              {savedCfi ? "Continue Reading" : "Start Reading"}
            </button>
            {savedCfi && (
              <button
                onClick={() => { setSavedCfi(null); startReading(); }}
                className="w-full border border-dust text-tan-oak py-3 rounded-lg font-bold hover:bg-warm-linen transition-all text-sm"
              >
                Start from Beginning
              </button>
            )}
            <button
              onClick={() => navigate(`/book/${id}`)}
              className="w-full border border-dust text-tan-oak py-3 rounded-lg font-bold hover:bg-warm-linen transition-all text-sm"
            >
              ← Back to Book Details
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  // Fetching metadata still
  if (phase === "cover" && !bookMeta) return (
    <div className="flex items-center justify-center h-screen text-tan-oak">
      <p className="font-serif italic text-xl animate-pulse">Fetching book details…</p>
    </div>
  );

  // Loading epub after Start Reading clicked
  if (phase === "loading") return (
  <div className="flex flex-col items-center justify-center h-screen text-tan-oak gap-4">
    <p className="font-serif italic text-xl animate-pulse">Opening {bookMeta?.title}…</p>
    <p className="text-sm text-dust">This may take a moment for larger books</p>
  </div>
);

  // Reading view
  return (
    <div className="fixed inset-0 bg-warm-linen flex flex-col z-[100]">

      {/* Header */}
      <header className="h-16 border-b border-dust flex items-center justify-between px-6 bg-warm-linen shrink-0">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(`/book/${id}`)}
            className="flex items-center gap-1 text-tan-oak hover:text-dark-walnut transition-colors"
          >
            <ChevronLeft size={20} />
            <span className="text-sm font-bold uppercase tracking-widest">Back</span>
          </button>
          <h1 className="text-lg font-serif font-bold truncate max-w-md text-dark-walnut">
            {bookMeta.title} — {bookMeta.author}
          </h1>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center border border-dust rounded-lg overflow-hidden bg-parchment">
            <button onClick={() => changeFontSize(-2)}
              className="px-3 py-1.5 hover:bg-warm-linen border-r border-dust text-sm font-bold text-tan-oak">A-</button>
            <button onClick={() => changeFontSize(2)}
              className="px-3 py-1.5 hover:bg-warm-linen text-sm font-bold text-tan-oak">A+</button>
          </div>
          <button onClick={toggleFullscreen}
            className="p-2 text-tan-oak hover:text-dark-walnut border border-dust rounded-lg bg-parchment transition-colors">
            {isFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
          </button>
        </div>
      </header>

      {/* Progress bar */}
      <div className="h-10 bg-parchment border-b border-dust flex items-center justify-between px-6 text-[10px] font-bold uppercase tracking-widest text-dust shrink-0">
        <div className="flex items-center gap-4">
          <span className="text-tan-oak truncate max-w-xs">{chapter || "—"}</span>
          <span>|</span>
          <span>Page {currentPage} of {totalPages}</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="w-48 h-1 bg-dust rounded-full overflow-hidden">
            <div className="h-full bg-aged-gold transition-all duration-300" style={{ width: `${progress}%` }} />
          </div>
          <span className="text-tan-oak">{Math.round(progress)}% complete</span>
        </div>
      </div>

      <div className="flex-1 flex relative overflow-hidden">

        {/* TOC Sidebar */}
        <div className={`absolute inset-y-0 left-0 w-80 bg-parchment border-r border-dust z-50 transform transition-transform duration-300 ease-in-out shadow-2xl
          ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
          <div className="p-8 h-full flex flex-col">
            <h2 className="text-[10px] font-bold uppercase tracking-widest text-dust mb-8">Table of Contents</h2>
            <div className="flex-1 overflow-y-auto space-y-1">
              {toc.length === 0
                ? <p className="text-sm text-dust italic">No chapters available.</p>
                : toc.map((item, i) => (
                    <button key={i} onClick={() => jumpTo(item.href)}
                      className="w-full text-left p-4 text-sm font-serif font-medium text-tan-oak hover:text-dark-walnut hover:bg-warm-linen rounded-lg transition-all border-b border-warm-linen last:border-0">
                      {item.label}
                    </button>
                  ))
              }
            </div>
          </div>
        </div>

        {/* EPUB Viewport */}
        <div className="flex-1 flex flex-col items-center justify-center bg-warm-linen p-4 md:p-12">
          <div className="w-full max-w-3xl h-full bg-parchment shadow-2xl relative border border-dust rounded-sm overflow-hidden">
            <div ref={viewerRef} className="w-full h-full relative z-10" style={{ minHeight: "600px" }} />
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="absolute left-6 top-6 p-3 bg-parchment/80 backdrop-blur border border-dust rounded-lg shadow-sm hover:bg-parchment transition-all z-20 text-tan-oak hover:text-dark-walnut"
            >
              <List size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* Footer Navigation */}
      <footer className="h-24 border-t border-dust flex items-center justify-center gap-16 bg-warm-linen shrink-0">
        <button onClick={handlePrev}
          className="flex items-center gap-3 px-10 py-4 border border-dust rounded-lg font-bold text-sm text-tan-oak hover:bg-parchment hover:text-dark-walnut transition-all active:scale-95 shadow-sm">
          <ChevronLeft size={20} /> Previous
        </button>
        <button onClick={handleNext}
          className="flex items-center gap-3 px-10 py-4 border border-dust rounded-lg font-bold text-sm text-tan-oak hover:bg-parchment hover:text-dark-walnut transition-all active:scale-95 shadow-sm">
          Next <ChevronRight size={20} />
        </button>
      </footer>
    </div>
  );
}
import React, { useEffect, useRef, useState } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import ePub, { Rendition, Book } from "epubjs";
import { ChevronLeft, Type, Maximize, Minimize, ChevronRight, List } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import axios from "axios";

export default function Reader() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const viewerRef = useRef<HTMLDivElement>(null);
  const bookRef = useRef<Book | null>(null);
  const renditionRef = useRef<Rendition | null>(null);
  
  const [bookMeta, setBookMeta] = useState<any>(null);
  const [progress, setProgress] = useState(0);
  const [chapter, setChapter] = useState("");
  const [totalPages, setTotalPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(0);
  const [toc, setToc] = useState<any[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [fontSize, setFontSize] = useState(18);

  useEffect(() => {
    let epubBook: Book | null = null;

    const initReader = async () => {
      if (!id || !user) return;
      try {
        const bookResponse = await axios.get(`/api/books/${id}`);
        const bookData = bookResponse.data;
        setBookMeta(bookData);

        epubBook = ePub(bookData.epubUrl);
        bookRef.current = epubBook;

        const rendition = epubBook.renderTo(viewerRef.current!, {
          width: "100%",
          height: "100%",
          flow: "paginated",
          manager: "default",
        });
        renditionRef.current = rendition;

        // Load TOC
        epubBook.loaded.navigation.then((nav) => {
          setToc(nav.toc);
        });

        // Load Locations for progress
        epubBook.ready.then(() => {
          return epubBook!.locations.generate(1600);
        }).then(() => {
          setTotalPages(epubBook!.locations.length());
        });

        // Fetch existing progress
        const progressResponse = await axios.get(`/api/progress/${id}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
        });
        const existingProgress = progressResponse.data;

        const reset = searchParams.get("reset");
        if (existingProgress?.cfi && reset !== "true") {
          rendition.display(existingProgress.cfi);
        } else {
          rendition.display();
        }

        rendition.on("relocated", (location: any) => {
          const cfi = location.start.cfi;
          const percentage = epubBook!.locations.percentageFromCfi(cfi) * 100 || 0;
          setProgress(percentage);
          setCurrentPage(epubBook!.locations.locationFromCfi(cfi));

          // Get current chapter name
          const item = epubBook!.navigation.get(cfi);
          if (item) setChapter(item.label);

          // Sync progress to API
          axios.post("/api/progress", {
            bookId: id,
            cfi,
            percentage,
            chapter: item ? item.label : "Unknown Chapter",
          }, {
            headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
          }).catch(err => console.error("Failed to sync progress", err));
        });

        // Apply initial font size
        rendition.themes.fontSize(`${fontSize}px`);

      } catch (err) {
        console.error("Failed to initialize reader", err);
      }
    };

    initReader();

    return () => {
      if (epubBook) epubBook.destroy();
    };
  }, [id, user]);

  const handlePrev = () => renditionRef.current?.prev();
  const handleNext = () => renditionRef.current?.next();
  
  const changeFontSize = (delta: number) => {
    const newSize = Math.max(12, Math.min(32, fontSize + delta));
    setFontSize(newSize);
    renditionRef.current?.themes.fontSize(`${newSize}px`);
  };

  const jumpTo = (cfi: string) => {
    renditionRef.current?.display(cfi);
    setIsSidebarOpen(false);
  };

  if (!bookMeta) return <div className="flex items-center justify-center h-screen">Loading EPUB...</div>;

  return (
    <div className="fixed inset-0 bg-warm-linen flex flex-col z-[100]">
      {/* Header */}
      <header className="h-16 border-b border-dust flex items-center justify-between px-6 bg-warm-linen">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(`/book/${id}`)} className="flex items-center gap-1 text-tan-oak hover:text-dark-walnut transition-colors">
            <ChevronLeft size={20} />
            <span className="text-sm font-bold uppercase tracking-widest">back</span>
          </button>
          <h1 className="text-lg font-serif font-bold truncate max-w-md text-dark-walnut">
            {bookMeta.title} – {bookMeta.author}
          </h1>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center border border-dust rounded-lg overflow-hidden bg-parchment">
            <button onClick={() => changeFontSize(-2)} className="px-3 py-1.5 hover:bg-warm-linen border-r border-dust text-sm font-bold text-tan-oak">A-</button>
            <button onClick={() => changeFontSize(2)} className="px-3 py-1.5 hover:bg-warm-linen text-sm font-bold text-tan-oak">A+</button>
          </div>
          <button className="p-2 text-tan-oak hover:text-dark-walnut border border-dust rounded-lg bg-parchment transition-colors">
            <Maximize size={18} />
          </button>
        </div>
      </header>

      {/* Sub-header Info */}
      <div className="h-10 bg-parchment border-b border-dust flex items-center justify-between px-6 text-[10px] font-bold uppercase tracking-widest text-dust">
        <div className="flex items-center gap-4">
          <span className="text-tan-oak">{chapter || "Loading..."}</span>
          <span className="text-dust">|</span>
          <span>Page {currentPage} of {totalPages}</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="w-48 h-1 bg-dust rounded-full overflow-hidden">
            <div className="h-full bg-aged-gold" style={{ width: `${progress}%` }} />
          </div>
          <span className="text-tan-oak">{Math.round(progress)}% complete</span>
        </div>
      </div>

      <div className="flex-1 flex relative overflow-hidden">
        {/* Sidebar TOC */}
        <div className={`absolute inset-y-0 left-0 w-80 bg-parchment border-r border-dust z-50 transform transition-transform duration-500 ease-in-out ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"} shadow-2xl`}>
          <div className="p-8 h-full flex flex-col">
            <h2 className="text-[10px] font-bold uppercase tracking-widest text-dust mb-8">Table of contents</h2>
            <div className="flex-1 overflow-y-auto space-y-1 custom-scrollbar">
              {toc.map((item, i) => (
                <button
                  key={i}
                  onClick={() => jumpTo(item.href)}
                  className="w-full text-left p-4 text-sm font-serif font-medium text-tan-oak hover:text-dark-walnut hover:bg-warm-linen rounded-lg transition-all border-b border-warm-linen last:border-0"
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col items-center justify-center bg-warm-linen p-4 md:p-12">
          <div className="w-full max-w-3xl h-full bg-parchment shadow-2xl relative border border-dust rounded-sm overflow-hidden">
            <div className="absolute inset-0 ruled-surface opacity-10 pointer-events-none" />
            <div ref={viewerRef} className="w-full h-full relative z-10" />
            
            {/* TOC Toggle Button */}
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
      <footer className="h-24 border-t border-dust flex items-center justify-center gap-16 bg-warm-linen">
        <button
          onClick={handlePrev}
          className="flex items-center gap-3 px-10 py-4 border border-dust rounded-lg font-bold text-sm text-tan-oak hover:bg-parchment hover:text-dark-walnut transition-all active:scale-95 shadow-sm"
        >
          <ChevronLeft size={20} />
          Previous
        </button>
        <button
          onClick={handleNext}
          className="flex items-center gap-3 px-10 py-4 border border-dust rounded-lg font-bold text-sm text-tan-oak hover:bg-parchment hover:text-dark-walnut transition-all active:scale-95 shadow-sm"
        >
          Next
          <ChevronRight size={20} />
        </button>
      </footer>
    </div>
  );
}

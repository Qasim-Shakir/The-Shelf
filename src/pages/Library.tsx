// Library.tsx
import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Search, ChevronLeft, ChevronRight, SlidersHorizontal, X } from "lucide-react";
import axios from "axios";

interface Book {
  id:         string;
  title:      string;
  author:     string;
  coverUrl:   string;
  category:   string;
  ingestedAt: string;
}

// Sort option label → server-side sort key
const SORT_OPTIONS: { label: string; value: string }[] = [
  { label: "Date (Newest)",  value: "newest"      },
  { label: "Date (Oldest)",  value: "oldest"      },
  { label: "Author (A–Z)",   value: "author_asc"  },
  { label: "Author (Z–A)",   value: "author_desc" },
  { label: "Title (A–Z)",    value: "title_asc"   },
  { label: "Title (Z–A)",    value: "title_desc"  },
];

// These are the genre options shown in the UI.
// They are sent as `category` query param to the server, which does a
// case-insensitive $regex match, so "Fiction" matches "Classic Fiction" too.
const GENRE_OPTIONS = [
  "All Genres",
  "Fiction",
  "Non-fiction",
  "Mystery",
  "Sci-fi",
  "Classic Fiction",
  "Poetry",
  "History",
  "Biography",
];

export default function Library() {
  const [books,       setBooks]       = useState<Book[]>([]);
  const [search,      setSearch]      = useState("");
  const [genre,       setGenre]       = useState("All Genres");
  const [sort,        setSort]        = useState("newest");
  const [page,        setPage]        = useState(1);
  const [totalPages,  setTotalPages]  = useState(1);
  const [totalBooks,  setTotalBooks]  = useState(0);
  const [loading,     setLoading]     = useState(true);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const navigate = useNavigate();
  const token    = localStorage.getItem("token");

  // ── Server-side fetch ──────────────────────────────────────────────────────
  // All filtering, sorting and pagination happen in MongoDB.
  // The frontend just sends the current UI state as query params.
  const fetchBooks = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, any> = { page, limit: 20, sort };
      if (search.trim())           params.search   = search.trim().slice(0, 100);
      if (genre !== "All Genres")  params.category = genre;

      const res  = await axios.get("/api/books", {
        headers: { Authorization: `Bearer ${token}` },
        params,
      });

      const data  = res.data;
      const list: Book[] = Array.isArray(data) ? data : (data.books ?? []);

      setBooks(list);
      setTotalPages(data.total_pages ?? 1);
      setTotalBooks(data.total       ?? list.length);
    } catch (err) {
      console.error("Failed to fetch books:", err);
      setBooks([]);
    } finally {
      setLoading(false);
    }
  }, [search, genre, sort, page, token]);

  // Debounce search input; fire immediately for other param changes
  useEffect(() => {
    const delay = search ? 400 : 0;
    const t = setTimeout(fetchBooks, delay);
    return () => clearTimeout(t);
  }, [fetchBooks]);

  // Reset to page 1 whenever search/genre/sort changes
  const handleSearch = (v: string) => { setSearch(v); setPage(1); };
  const handleGenre  = (v: string) => { setGenre(v);  setPage(1); setFiltersOpen(false); };
  const handleSort   = (v: string) => { setSort(v);   setPage(1); setFiltersOpen(false); };

  const sortLabel = SORT_OPTIONS.find((o) => o.value === sort)?.label ?? "Date (Newest)";

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-12">

      {/* Header */}
      <div className="text-center mb-8 sm:mb-16">
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-serif font-bold mb-3 tracking-tight text-dark-walnut">
          The Shelf
        </h1>
        <p className="text-tan-oak font-medium italic text-base sm:text-lg">Browse your library</p>
      </div>

      {/* ── Search + filter bar ────────────────────────────────────────────── */}
      <div className="flex gap-3 mb-4 sm:mb-6">

        {/* Search input */}
        <div className="relative flex-1">
          <Search className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 text-dust" size={18} />
          <input
            type="text"
            placeholder="Search by title or author…"
            className="w-full bg-parchment border border-dust rounded-lg pl-10 sm:pl-12 pr-10 py-3 sm:py-4 text-sm sm:text-base focus:outline-none focus:border-tan-oak transition-colors text-dark-walnut placeholder:text-dust"
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
          />
          {search && (
            <button
              onClick={() => handleSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-dust hover:text-tan-oak transition-colors"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* Mobile filter toggle */}
        <button
          onClick={() => setFiltersOpen(!filtersOpen)}
          className="sm:hidden flex items-center gap-2 px-4 py-3 bg-parchment border border-dust rounded-lg text-sm font-bold text-tan-oak"
        >
          <SlidersHorizontal size={16} />
          {(genre !== "All Genres" || sort !== "newest") && (
            <span className="w-2 h-2 rounded-full bg-aged-gold" />
          )}
        </button>

        {/* Desktop filter selects */}
        <div className="hidden sm:flex gap-3">
          <select
            className="bg-parchment border border-dust rounded-lg px-4 py-3 sm:py-4 text-sm font-bold text-tan-oak focus:outline-none focus:border-tan-oak appearance-none cursor-pointer"
            value={genre}
            onChange={(e) => handleGenre(e.target.value)}
          >
            {GENRE_OPTIONS.map((g) => <option key={g}>{g}</option>)}
          </select>
          <select
            className="bg-parchment border border-dust rounded-lg px-4 py-3 sm:py-4 text-sm font-bold text-tan-oak focus:outline-none focus:border-tan-oak appearance-none cursor-pointer"
            value={sort}
            onChange={(e) => handleSort(e.target.value)}
          >
            {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
      </div>

      {/* Mobile filter drawer */}
      {filtersOpen && (
        <div className="sm:hidden flex flex-col gap-4 mb-6 p-4 bg-parchment border border-dust rounded-xl">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-dust mb-2">Genre</p>
            <select
              className="w-full bg-warm-linen border border-dust rounded-lg px-4 py-3 text-sm font-bold text-tan-oak focus:outline-none appearance-none"
              value={genre}
              onChange={(e) => handleGenre(e.target.value)}
            >
              {GENRE_OPTIONS.map((g) => <option key={g}>{g}</option>)}
            </select>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-dust mb-2">Sort by</p>
            <select
              className="w-full bg-warm-linen border border-dust rounded-lg px-4 py-3 text-sm font-bold text-tan-oak focus:outline-none appearance-none"
              value={sort}
              onChange={(e) => handleSort(e.target.value)}
            >
              {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        </div>
      )}

      {/* Active filter pills */}
      {(genre !== "All Genres" || search) && (
        <div className="flex flex-wrap gap-2 mb-5">
          {genre !== "All Genres" && (
            <button
              onClick={() => handleGenre("All Genres")}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-parchment border border-dust rounded-full text-[10px] font-bold uppercase tracking-widest text-tan-oak hover:border-tan-oak transition-colors"
            >
              {genre} <X size={11} />
            </button>
          )}
          {search && (
            <button
              onClick={() => handleSearch("")}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-parchment border border-dust rounded-full text-[10px] font-bold uppercase tracking-widest text-tan-oak hover:border-tan-oak transition-colors"
            >
              "{search}" <X size={11} />
            </button>
          )}
        </div>
      )}

      {/* Count row */}
      <div className="flex justify-between items-center mb-6 sm:mb-8 text-[10px] font-bold uppercase tracking-widest text-dust">
        <p>
          {loading ? "Loading…" : `${totalBooks.toLocaleString()} book${totalBooks !== 1 ? "s" : ""} found`}
          {genre !== "All Genres" ? ` · ${genre}` : ""}
          {sort !== "newest" ? ` · ${sortLabel}` : ""}
        </p>
        {totalPages > 1 && <p>Page {page} of {totalPages}</p>}
      </div>

      {/* ── Grid ──────────────────────────────────────────────────────────── */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5 sm:gap-8 lg:gap-10">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="aspect-[2/3] bg-parchment mb-3 rounded-lg border border-dust" />
              <div className="h-4 bg-parchment rounded w-3/4 mb-2" />
              <div className="h-3 bg-parchment rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : books.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 sm:py-32 gap-4 text-tan-oak">
          <p className="text-xl sm:text-2xl font-serif font-bold">No books found</p>
          <p className="text-sm">Try a different search term or genre filter.</p>
          {(search || genre !== "All Genres") && (
            <button
              onClick={() => { handleSearch(""); handleGenre("All Genres"); }}
              className="mt-2 text-[10px] font-bold uppercase tracking-widest text-library-green border border-library-green/30 px-5 py-2.5 rounded-lg hover:bg-library-green/5 transition-colors"
            >
              Clear all filters
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5 sm:gap-8 lg:gap-10">
          {books.map((book) => {
            if (!book.id) return null;
            return (
              <div
                key={book.id}
                className="group cursor-pointer"
                onClick={() => navigate(`/book/${book.id}`)}
              >
                <div className="aspect-[2/3] bg-parchment mb-3 rounded-lg overflow-hidden border border-dust transition-all duration-500 group-hover:-translate-y-2 group-hover:shadow-xl group-hover:border-tan-oak">
                  <img
                    src={book.coverUrl || "https://placehold.co/300x450/FDFAF5/C5B9A8?text=No+Cover"}
                    alt={book.title}
                    className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity"
                    referrerPolicy="no-referrer"
                    loading="lazy"
                  />
                </div>
                <h3 className="font-serif font-bold text-sm sm:text-base mb-1 line-clamp-2 text-dark-walnut group-hover:text-library-green transition-colors">
                  {book.title}
                </h3>
                <p className="text-xs sm:text-sm text-tan-oak font-medium italic line-clamp-1">
                  {book.author}
                </p>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Pagination ────────────────────────────────────────────────────── */}
      {totalPages > 1 && (
        <div className="mt-10 sm:mt-16 flex justify-center items-center gap-3">
          <button
            className="p-2 border border-dust rounded-full text-tan-oak hover:bg-parchment disabled:opacity-30 transition-colors"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            <ChevronLeft size={20} />
          </button>

          {/* Page number buttons — show up to 7 */}
          <div className="flex gap-1">
            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
              const p =
                totalPages <= 7 ? i + 1 :
                i === 0         ? 1 :
                i === 6         ? totalPages :
                page <= 4       ? i + 1 :
                page >= totalPages - 3 ? totalPages - 6 + i :
                page - 3 + i;
              return (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`w-9 h-9 rounded-full text-sm font-bold transition-all ${
                    p === page
                      ? "bg-dark-walnut text-parchment"
                      : "text-tan-oak hover:bg-parchment border border-dust"
                  }`}
                >
                  {p}
                </button>
              );
            })}
          </div>

          <button
            className="p-2 border border-dust rounded-full text-tan-oak hover:bg-parchment disabled:opacity-30 transition-colors"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            <ChevronRight size={20} />
          </button>
        </div>
      )}
    </div>
  );
}
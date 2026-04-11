// Library.tsx — fully responsive

import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, ChevronLeft, ChevronRight, SlidersHorizontal, X } from "lucide-react";
import axios from "axios";

interface Book {
  _id?:       string;
  id?:        string;
  title:      string;
  author:     string;
  coverUrl:   string;
  category:   string;
  ingestedAt: string;
}

// Helper: get the real id regardless of API shape
const getBookId = (book: Book) => book._id ?? book.id ?? "";

export default function Library() {
  const [books,        setBooks]        = useState<Book[]>([]);
  const [search,       setSearch]       = useState("");
  const [genre,        setGenre]        = useState("All Genres");
  const [sort,         setSort]         = useState("Date (Newest)");
  const [page,         setPage]         = useState(1);
  const [totalPages,   setTotalPages]   = useState(1);
  const [totalBooks,   setTotalBooks]   = useState(0);
  const [loading,      setLoading]      = useState(true);
  const [filtersOpen,  setFiltersOpen]  = useState(false);
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  const fetchBooks = async () => {
    setLoading(true);
    try {
      const response = await axios.get("/api/books", {
        headers: { Authorization: `Bearer ${token}` },
        params:  { page, limit: 20 },
      });
      const data = response.data;
      let list: Book[] = Array.isArray(data)
        ? data
        : Array.isArray(data.books) ? data.books : [];

      setTotalPages(data.total_pages ?? 1);
      setTotalBooks(data.total      ?? list.length);

      if (genre !== "All Genres") {
        list = list.filter((b) =>
          (b.category ?? "").toLowerCase().includes(genre.toLowerCase())
        );
      }
      if (search.trim()) {
        const q = search.toLowerCase();
        list = list.filter((b) =>
          b.title.toLowerCase().includes(q) || b.author.toLowerCase().includes(q)
        );
      }
      if (sort === "Date (Oldest)") {
        list.sort((a, b) => new Date(a.ingestedAt).getTime() - new Date(b.ingestedAt).getTime());
      } else if (sort === "Date (Newest)") {
        list.sort((a, b) => new Date(b.ingestedAt).getTime() - new Date(a.ingestedAt).getTime());
      } else if (sort === "Author (A-Z)") {
        list.sort((a, b) => a.author.localeCompare(b.author));
      } else if (sort === "Author (Z-A)") {
        list.sort((a, b) => b.author.localeCompare(a.author));
      }

      setBooks(list);
    } catch (err) {
      console.error("Failed to fetch books", err);
      setBooks([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(fetchBooks, search ? 400 : 0);
    return () => clearTimeout(timer);
  }, [search, genre, sort, page]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-12">

      {/* Header */}
      <div className="text-center mb-8 sm:mb-16">
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-serif font-bold mb-3 tracking-tight text-dark-walnut">
          The Shelf
        </h1>
        <p className="text-tan-oak font-medium italic text-base sm:text-lg">Browse your library</p>
      </div>

      {/* ── Search bar + mobile filter button ── */}
      <div className="flex gap-3 mb-4 sm:mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 text-dust" size={18} />
          <input
            type="text"
            placeholder="Search by title or author…"
            className="w-full bg-parchment border border-dust rounded-lg pl-10 sm:pl-12 pr-4 py-3 sm:py-4 text-sm sm:text-base focus:outline-none focus:border-tan-oak transition-colors text-dark-walnut placeholder:text-dust"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>

        <button
          onClick={() => setFiltersOpen(!filtersOpen)}
          className="sm:hidden flex items-center gap-2 px-4 py-3 bg-parchment border border-dust rounded-lg text-sm font-bold text-tan-oak"
        >
          <SlidersHorizontal size={16} />
          {filtersOpen ? <X size={16} /> : null}
        </button>

        <div className="hidden sm:flex gap-3">
          <select
            className="bg-parchment border border-dust rounded-lg px-4 py-3 sm:py-4 text-sm font-bold text-tan-oak focus:outline-none focus:border-tan-oak appearance-none cursor-pointer"
            value={genre}
            onChange={(e) => { setGenre(e.target.value); setPage(1); }}
          >
            <option>All Genres</option>
            <option>Fiction</option>
            <option>Non-fiction</option>
            <option>Mystery</option>
            <option>Sci-fi</option>
            <option>Classic Fiction</option>
          </select>
          <select
            className="bg-parchment border border-dust rounded-lg px-4 py-3 sm:py-4 text-sm font-bold text-tan-oak focus:outline-none focus:border-tan-oak appearance-none cursor-pointer"
            value={sort}
            onChange={(e) => { setSort(e.target.value); setPage(1); }}
          >
            <option>Date (Newest)</option>
            <option>Date (Oldest)</option>
            <option>Author (A-Z)</option>
            <option>Author (Z-A)</option>
          </select>
        </div>
      </div>

      {/* Mobile filter drawer */}
      {filtersOpen && (
        <div className="sm:hidden flex flex-col gap-3 mb-6 p-4 bg-parchment border border-dust rounded-xl">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-dust mb-1.5">Genre</p>
            <select
              className="w-full bg-white border border-dust rounded-lg px-4 py-3 text-sm font-bold text-tan-oak focus:outline-none appearance-none"
              value={genre}
              onChange={(e) => { setGenre(e.target.value); setPage(1); setFiltersOpen(false); }}
            >
              <option>All Genres</option>
              <option>Fiction</option>
              <option>Non-fiction</option>
              <option>Mystery</option>
              <option>Sci-fi</option>
              <option>Classic Fiction</option>
            </select>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-dust mb-1.5">Sort by</p>
            <select
              className="w-full bg-white border border-dust rounded-lg px-4 py-3 text-sm font-bold text-tan-oak focus:outline-none appearance-none"
              value={sort}
              onChange={(e) => { setSort(e.target.value); setPage(1); setFiltersOpen(false); }}
            >
              <option>Date (Newest)</option>
              <option>Date (Oldest)</option>
              <option>Author (A-Z)</option>
              <option>Author (Z-A)</option>
            </select>
          </div>
        </div>
      )}

      {/* Count row */}
      <div className="flex justify-between items-center mb-6 sm:mb-8 text-[10px] font-bold uppercase tracking-widest text-dust">
        <p>{totalBooks} books found</p>
        <p>Page {page} of {totalPages}</p>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5 sm:gap-8 lg:gap-10">
          {[...Array(10)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="aspect-[2/3] bg-parchment mb-3 rounded-lg border border-dust" />
              <div className="h-4 bg-parchment rounded w-3/4 mb-2" />
              <div className="h-3 bg-parchment rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : books.length === 0 ? (
        <div className="text-center py-16 sm:py-24 text-tan-oak">
          <p className="text-xl sm:text-2xl font-serif font-bold mb-2">No books found</p>
          <p className="text-sm">Try a different search or genre filter.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5 sm:gap-8 lg:gap-10">
          {books.map((book) => {
            const bookId = getBookId(book);
            if (!bookId) return null; // skip books with no id to avoid broken navigation
            return (
              <div
                key={bookId}
                className="group cursor-pointer"
                onClick={() => navigate(`/book/${bookId}`)}
              >
                <div className="aspect-[2/3] bg-parchment mb-3 rounded-lg overflow-hidden border border-dust transition-all duration-500 transform group-hover:-translate-y-2 group-hover:shadow-xl group-hover:border-tan-oak">
                  <img
                    src={book.coverUrl || "https://via.placeholder.com/300x450?text=No+Cover"}
                    alt={book.title}
                    className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <h3 className="font-serif font-bold text-sm sm:text-base lg:text-lg mb-1 line-clamp-2 text-dark-walnut group-hover:text-library-green transition-colors">
                  {book.title}
                </h3>
                <p className="text-xs sm:text-sm text-tan-oak font-medium italic line-clamp-1">{book.author}</p>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      <div className="mt-10 sm:mt-16 flex justify-center items-center gap-4 sm:gap-6">
        <button
          className="p-2 border border-gray-200 rounded-full hover:bg-gray-50 disabled:opacity-30 transition-colors"
          disabled={page <= 1}
          onClick={() => setPage((p) => p - 1)}
        >
          <ChevronLeft size={20} />
        </button>
        <span className="text-sm font-medium">Page {page} of {totalPages}</span>
        <button
          className="p-2 border border-gray-200 rounded-full hover:bg-gray-50 disabled:opacity-30 transition-colors"
          disabled={page >= totalPages}
          onClick={() => setPage((p) => p + 1)}
        >
          <ChevronRight size={20} />
        </button>
      </div>
    </div>
  );
}
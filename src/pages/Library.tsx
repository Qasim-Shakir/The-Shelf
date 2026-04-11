import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, ChevronLeft, ChevronRight } from "lucide-react";
import axios from "axios";

interface Book {
  id: string;
  title: string;
  author: string;
  coverUrl: string;
  genre: string;
}

export default function Library() {
  const [books, setBooks] = useState<Book[]>([]);
  const [search, setSearch] = useState("");
  const [genre, setGenre] = useState("All Genres");
  const [sort, setSort] = useState("Date (Newest)");
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchBooks = async () => {
    setLoading(true);
    try {
      const response = await axios.get("/api/books");
      let fetchedBooks = response.data;

      if (genre !== "All Genres") {
        fetchedBooks = fetchedBooks.filter((b: any) => b.genre === genre);
      }

      if (sort === "Date (Oldest)") {
        fetchedBooks.sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      } else if (sort === "Author (A-Z)") {
        fetchedBooks.sort((a: any, b: any) => a.author.localeCompare(b.author));
      } else if (sort === "Author (Z-A)") {
        fetchedBooks.sort((a: any, b: any) => b.author.localeCompare(a.author));
      }

      if (search) {
        fetchedBooks = fetchedBooks.filter((b: any) => 
          b.title.toLowerCase().includes(search.toLowerCase()) || 
          b.author.toLowerCase().includes(search.toLowerCase())
        );
      }

      setBooks(fetchedBooks);
    } catch (err) {
      console.error("Failed to fetch books", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBooks();
  }, [search, genre, sort]);

  return (
    <div className="max-w-7xl mx-auto px-6 py-12">
      <div className="text-center mb-16">
        <h1 className="text-6xl font-serif font-bold mb-4 tracking-tight text-dark-walnut">The Shelf</h1>
        <p className="text-tan-oak font-medium italic text-lg">Browse your library</p>
      </div>

      <div className="flex flex-col md:flex-row gap-6 mb-16">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-dust" size={20} />
          <input
            type="text"
            placeholder="Search by title or author ..."
            className="w-full bg-parchment border border-dust rounded-lg pl-12 pr-6 py-4 focus:outline-none focus:border-tan-oak transition-colors text-dark-walnut placeholder:text-dust"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-4">
          <select
            className="bg-parchment border border-dust rounded-lg px-6 py-4 text-sm font-bold text-tan-oak focus:outline-none focus:border-tan-oak appearance-none cursor-pointer"
            value={genre}
            onChange={(e) => setGenre(e.target.value)}
          >
            <option>All Genres</option>
            <option>Fiction</option>
            <option>Non-fiction</option>
            <option>Mystery</option>
            <option>Sci-fi</option>
            <option>Classic Fiction</option>
          </select>
          <select
            className="bg-parchment border border-dust rounded-lg px-6 py-4 text-sm font-bold text-tan-oak focus:outline-none focus:border-tan-oak appearance-none cursor-pointer"
            value={sort}
            onChange={(e) => setSort(e.target.value)}
          >
            <option>Date (Newest)</option>
            <option>Date (Oldest)</option>
            <option>Author (A-Z)</option>
            <option>Author (Z-A)</option>
          </select>
        </div>
      </div>

      <div className="flex justify-between items-center mb-8 text-[10px] font-bold uppercase tracking-widest text-dust">
        <p>{books.length} books found</p>
        <p>Showing 1-{Math.min(books.length, 20)}</p>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-10">
          {[...Array(10)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="aspect-[2/3] bg-parchment mb-4 rounded-lg border border-dust" />
              <div className="h-4 bg-parchment rounded w-3/4 mb-2" />
              <div className="h-3 bg-parchment rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-10">
          {books.map((book) => (
            <div
              key={book.id}
              className="group cursor-pointer"
              onClick={() => navigate(`/book/${book.id}`)}
            >
              <div className="aspect-[2/3] bg-parchment mb-4 rounded-lg overflow-hidden border border-dust transition-all duration-500 transform group-hover:-translate-y-2 group-hover:shadow-xl group-hover:border-tan-oak">
                <img
                  src={book.coverUrl || "https://via.placeholder.com/300x450?text=No+Cover"}
                  alt={book.title}
                  className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity"
                  referrerPolicy="no-referrer"
                />
              </div>
              <h3 className="font-serif font-bold text-lg mb-1 line-clamp-1 text-dark-walnut group-hover:text-library-green transition-colors">{book.title}</h3>
              <p className="text-sm text-tan-oak font-medium italic">{book.author}</p>
            </div>
          ))}
        </div>
      )}

      <div className="mt-16 flex justify-center items-center gap-6">
        <button className="p-2 border border-gray-200 rounded-full hover:bg-gray-50 disabled:opacity-50" disabled>
          <ChevronLeft size={20} />
        </button>
        <span className="text-sm font-medium">Page 1 of 10</span>
        <button className="p-2 border border-gray-200 rounded-full hover:bg-gray-50">
          <ChevronRight size={20} />
        </button>
      </div>
    </div>
  );
}

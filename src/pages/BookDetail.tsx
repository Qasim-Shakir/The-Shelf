// BookDetail.tsx — fully responsive

import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { ChevronLeft, BookOpen, RotateCcw } from "lucide-react";
import axios from "axios";
import { cn } from "../lib/utils";

interface Book {
  _id:         string;
  title:       string;
  author:      string;
  description: string;
  category:    string;
  language:    string;
  coverUrl:    string;
  epubUrl:     string;
  gutenbergId: number;
  ingestedAt:  string;
}

interface Progress {
  last_location: string;
  percentage:    number;
}

export default function BookDetail() {
  const { id }   = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [book,     setBook]     = useState<Book | null>(null);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [loading,  setLoading]  = useState(true);
  const token = localStorage.getItem("token");

  // Guard: if id is missing or literally "undefined", bail out immediately
  useEffect(() => {
    if (!id || id === "undefined") {
      console.error("BookDetail: no valid id in URL params. Redirecting to library.");
      navigate("/library", { replace: true });
      return;
    }

    if (!user) return;

    const fetchData = async () => {
      try {
        const bookRes = await axios.get(`/api/books/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        // Normalise: API may return id or _id
        const raw = bookRes.data;
        if (!raw._id && raw.id) raw._id = raw.id;
        setBook(raw);
      } catch (err) {
        console.error("Failed to fetch book", err);
      }

      try {
        const progressRes = await axios.get(`/api/progress/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (progressRes.status === 200 && progressRes.data?.last_location) {
          setProgress(progressRes.data);
        }
      } catch (err: any) {
        if (err.response?.status !== 204) console.warn("No progress:", err.message);
      }

      setLoading(false);
    };

    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]); // intentionally omit `user` to avoid re-fetch on every auth re-render

  if (loading) return (
    <div className="flex items-center justify-center h-screen">
      <p className="font-serif italic text-lg sm:text-xl text-tan-oak animate-pulse">Loading…</p>
    </div>
  );

  if (!book) return (
    <div className="p-8 text-center">
      <p className="text-xl sm:text-2xl font-serif font-bold text-dark-walnut">Book not found</p>
    </div>
  );

  const tags = (book.category ?? "").split(/[,;]/).map((s) => s.trim()).filter(Boolean);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12">

      {/* Back button */}
      <button
        onClick={() => navigate("/library")}
        className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-black mb-8 sm:mb-12 transition-colors"
      >
        <ChevronLeft size={16} />
        Library
      </button>

      <div className="flex flex-col md:flex-row gap-8 sm:gap-12 lg:gap-16">

        {/* Cover */}
        <div className="w-full md:w-2/5 lg:w-1/3 shrink-0">
          <div className="aspect-[2/3] max-w-[260px] sm:max-w-sm md:max-w-none mx-auto md:mx-0 bg-parchment rounded-xl overflow-hidden shadow-xl border border-dust">
            <img
              src={book.coverUrl || "https://via.placeholder.com/400x600?text=No+Cover"}
              alt={book.title}
              className="w-full h-full object-cover opacity-95"
              referrerPolicy="no-referrer"
            />
          </div>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-serif font-bold mb-3 sm:mb-4 tracking-tight leading-tight text-dark-walnut">
            {book.title}
          </h1>
          <p className="text-lg sm:text-xl lg:text-2xl text-tan-oak font-serif italic mb-6 sm:mb-10">
            {book.author}
          </p>

          {tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-6 sm:mb-10">
              {tags.map((g) => (
                <span
                  key={g}
                  className="bg-parchment text-tan-oak border border-dust px-3 sm:px-4 py-1 sm:py-1.5 text-[9px] sm:text-[10px] font-bold uppercase tracking-widest rounded-full"
                >
                  {g}
                </span>
              ))}
            </div>
          )}

          <p className="text-base sm:text-lg lg:text-xl text-tan-oak leading-relaxed mb-10 sm:mb-16 font-medium">
            {book.description || "No description available for this book."}
          </p>

          <div className="flex flex-col sm:flex-row flex-wrap gap-3 sm:gap-6 mb-10 sm:mb-16">
            <button
              onClick={() => navigate(`/read/${book._id}`)}
              className={cn(
                "flex items-center justify-center gap-3 px-6 sm:px-10 py-4 sm:py-5 rounded-lg font-bold transition-all shadow-lg hover:shadow-xl active:scale-95 text-sm sm:text-base w-full sm:w-auto",
                progress
                  ? "bg-aged-gold text-white hover:bg-[#B8985E]"
                  : "bg-library-green text-white hover:bg-[#3D5A4C]"
              )}
            >
              <BookOpen size={18} />
              {progress
                ? `Resume · ${Math.round(progress.percentage ?? 0)}% complete`
                : "Read Now"}
            </button>

            {progress && (
              <button
                onClick={() => navigate(`/read/${book._id}?reset=true`)}
                className="flex items-center justify-center gap-3 border border-dust px-6 sm:px-10 py-4 sm:py-5 rounded-lg font-bold hover:bg-parchment transition-all text-tan-oak text-sm sm:text-base w-full sm:w-auto"
              >
                <RotateCcw size={18} />
                Start from beginning
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 gap-y-6 sm:gap-y-10 gap-x-8 sm:gap-x-16 pt-8 sm:pt-12 border-t border-dust">
            {[
              { label: "Category", value: book.category || "—"              },
              { label: "Language", value: book.language || "English"         },
              { label: "Source",   value: book.gutenbergId ? "Project Gutenberg" : "Manual Upload" },
              { label: "Format",   value: "EPUB"                             },
            ].map(({ label, value }) => (
              <div key={label}>
                <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-dust mb-2 sm:mb-3">{label}</p>
                <p className="font-serif font-bold text-dark-walnut text-sm sm:text-base capitalize leading-snug">{value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
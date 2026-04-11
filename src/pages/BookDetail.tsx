import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { ChevronLeft, BookOpen, RotateCcw } from "lucide-react";
import axios from "axios";
import { cn } from "../lib/utils";

interface Book {
  id: string;
  title: string;
  author: string;
  publicationYear: string;
  genre: string;
  description: string;
  coverUrl: string;
}

interface Progress {
  cfi: string;
  percentage: number;
  chapter: string;
}

export default function BookDetail() {
  const { id } = useParams();
  const [book, setBook] = useState<Book | null>(null);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      if (!id || !user) return;
      try {
        const bookResponse = await axios.get(`/api/books/${id}`);
        setBook(bookResponse.data);

        const progressResponse = await axios.get(`/api/progress/${id}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
        });
        if (progressResponse.data) {
          setProgress(progressResponse.data);
        }
      } catch (err) {
        console.error("Failed to fetch book details", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id, user]);

  if (loading) return <div className="flex items-center justify-center h-screen">Loading...</div>;
  if (!book) return <div className="p-8 text-center">Book not found</div>;

  return (
    <div className="max-w-5xl mx-auto px-6 py-12">
      <button
        onClick={() => navigate("/library")}
        className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-black mb-12 transition-colors"
      >
        <ChevronLeft size={16} />
        Library
      </button>

      <div className="flex flex-col md:flex-row gap-16">
        <div className="w-full md:w-1/3">
          <div className="aspect-[2/3] bg-parchment rounded-xl overflow-hidden shadow-xl border border-dust">
            <img
              src={book.coverUrl || "https://via.placeholder.com/400x600?text=No+Cover"}
              alt={book.title}
              className="w-full h-full object-cover opacity-95"
              referrerPolicy="no-referrer"
            />
          </div>
        </div>

        <div className="flex-1">
          <h1 className="text-6xl font-serif font-bold mb-4 tracking-tight leading-tight text-dark-walnut">{book.title}</h1>
          <p className="text-2xl text-tan-oak font-serif italic mb-10">
            {book.author} <span className="mx-2 text-dust">·</span> {book.publicationYear}
          </p>

          <div className="flex gap-2 mb-10">
            {book.genre.split(",").map((g) => (
              <span key={g} className="bg-parchment text-tan-oak border border-dust px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest rounded-full">
                {g.trim()}
              </span>
            ))}
          </div>

          <p className="text-xl text-tan-oak leading-relaxed mb-16 font-medium">
            {book.description || "No description available for this book."}
          </p>

          <div className="flex flex-wrap gap-6 mb-16">
            <button
              onClick={() => navigate(`/read/${book.id}`)}
              className={cn(
                "flex items-center gap-3 px-10 py-5 rounded-lg font-bold transition-all shadow-lg hover:shadow-xl active:scale-95",
                progress ? "bg-aged-gold text-white hover:bg-[#B8985E]" : "bg-library-green text-white hover:bg-[#3D5A4C]"
              )}
            >
              <BookOpen size={20} />
              {progress ? `Resume reading : ${progress.chapter || "Chapter 1"} · ${Math.round(progress.percentage)}%` : "Read Now"}
            </button>
            
            {progress && (
              <button
                onClick={() => navigate(`/read/${book.id}?reset=true`)}
                className="flex items-center gap-3 border border-dust px-10 py-5 rounded-lg font-bold hover:bg-parchment transition-all text-tan-oak"
              >
                <RotateCcw size={20} />
                Start from the beginning
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 gap-y-10 gap-x-16 pt-12 border-t border-dust">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-dust mb-3">Genre</p>
              <p className="font-serif font-bold text-dark-walnut">{book.genre}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-dust mb-3">Language</p>
              <p className="font-serif font-bold text-dark-walnut">English</p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-dust mb-3">Source</p>
              <p className="font-serif font-bold text-dark-walnut">Project Gutenberg</p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-dust mb-3">Format</p>
              <p className="font-serif font-bold text-dark-walnut">EPUB</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

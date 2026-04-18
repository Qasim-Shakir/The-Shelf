// CoverPage.tsx

import React from "react";
import { useNavigate } from "react-router-dom";
import { BookOpen, RotateCcw, ChevronLeft } from "lucide-react";

interface CoverPageProps {
  bookMeta:     any;
  savedCfi:     string | null;
  onStart:      () => void;
  onStartFresh: () => void;
}

export default function CoverPage({ bookMeta, savedCfi, onStart, onStartFresh }: CoverPageProps) {
  const navigate = useNavigate();

  return (
    // overflow-y-auto ensures the card scrolls on short viewports
    // so the buttons are never clipped off the bottom
    <div className="fixed inset-0 z-[100] bg-warm-linen overflow-y-auto">
      <div className="min-h-full flex items-center justify-center p-6">
        <div className="w-full max-w-sm bg-parchment border border-dust rounded-2xl shadow-2xl overflow-hidden">

          {/* Cover image */}
          {bookMeta.coverUrl && (
            <div className="w-full h-64 overflow-hidden">
              <img
                src={bookMeta.coverUrl}
                alt={bookMeta.title}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
          )}

          {/* Card body */}
          <div className="p-8 text-center">
            <h1 className="text-2xl font-serif font-bold text-dark-walnut mb-1 leading-tight">
              {bookMeta.title}
            </h1>
            <p className="text-tan-oak font-medium italic mb-1">{bookMeta.author}</p>

            {bookMeta.category && (
              <p className="text-[9px] font-bold uppercase tracking-widest text-dust mb-6">
                {bookMeta.category}
              </p>
            )}

            {savedCfi && (
              <p className="text-sm text-library-green font-medium mb-5">
                You have a saved position — pick up where you left off!
              </p>
            )}

            <div className="flex flex-col gap-3">
              <button
                onClick={onStart}
                className="w-full flex items-center justify-center gap-2 bg-library-green text-white py-4 rounded-lg font-bold hover:bg-[#3D5A4C] transition-all shadow-md active:scale-95 text-sm"
              >
                <BookOpen size={16} />
                {savedCfi ? "Continue Reading" : "Start Reading"}
              </button>

              {savedCfi && (
                <button
                  onClick={onStartFresh}
                  className="w-full flex items-center justify-center gap-2 border border-dust text-tan-oak py-3 rounded-lg font-bold hover:bg-warm-linen transition-all text-sm"
                >
                  <RotateCcw size={14} />
                  Start from Beginning
                </button>
              )}

              <button
                onClick={() => navigate(`/book/${bookMeta.id ?? bookMeta._id}`)}
                className="w-full flex items-center justify-center gap-2 border border-dust text-tan-oak py-3 rounded-lg font-bold hover:bg-warm-linen transition-all text-sm"
              >
                <ChevronLeft size={14} />
                Back to Book Details
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
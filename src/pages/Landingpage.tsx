import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

/* ─── Open Library free cover CDN ───────────────────────────────── */
const COVER = (isbn: string) =>
  `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg`;

/* ─── Data ───────────────────────────────────────────────────────── */
const GRID_BOOKS = [
  { title: "Moby-Dick",          author: "Melville",   isbn: "9780142437247", bg: "#3d2810" },
  { title: "1984",               author: "Orwell",     isbn: "9780451524935", bg: "#1e3328" },
  { title: "Dracula",            author: "Stoker",     isbn: "9780141439846", bg: "#2d1f10" },
  { title: "Pride & Prejudice",  author: "Austen",     isbn: "9780141439518", bg: "#162415" },
  { title: "Frankenstein",       author: "Shelley",    isbn: "9780141439471", bg: "#281a0e" },
  { title: "The Odyssey",        author: "Homer",      isbn: "9780140268867", bg: "#1a1018" },
  { title: "Jane Eyre",          author: "Brontë",     isbn: "9780141441146", bg: "#0e1e18" },
  { title: "The Great Gatsby",   author: "Fitzgerald", isbn: "9780743273565", bg: "#241508" },
  { title: "Crime & Punishment", author: "Dostoevsky", isbn: "9780140449136", bg: "#1a1a10" },
  { title: "Brave New World",    author: "Huxley",     isbn: "9780060850524", bg: "#1e2830" },
  { title: "Wuthering Heights",  author: "Brontë",     isbn: "9780141439556", bg: "#2a1a0c" },
  { title: "Animal Farm",        author: "Orwell",     isbn: "9780451526342", bg: "#121810" },
];

const MARQUEE = [
  "Pride and Prejudice","Moby-Dick","Frankenstein","The Odyssey",
  "Crime and Punishment","Jane Eyre","Wuthering Heights","The Great Gatsby",
  "Dracula","Brave New World","1984","The Hobbit","Anna Karenina",
  "Don Quixote","War and Peace","Middlemarch","Great Expectations",
];

const FEATURES = [
  {
    n: "01",
    icon: <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><rect x="3" y="2" width="10" height="16" rx="1" stroke="#C8A96E" strokeWidth="0.75"/><line x1="5" y1="7" x2="11" y2="7" stroke="#C8A96E" strokeWidth="0.75"/><line x1="5" y1="10" x2="11" y2="10" stroke="#C8A96E" strokeWidth="0.75"/><line x1="5" y1="13" x2="8" y2="13" stroke="#C8A96E" strokeWidth="0.75"/></svg>,
    name: "In-browser EPUB reader",
    desc: "Read directly in your browser — no downloads, no plugins. epub.js renders every book with full typography preserved.",
  },
  {
    n: "02",
    icon: <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="7" stroke="#C8A96E" strokeWidth="0.75"/><polyline points="10,6 10,10 13,12" stroke="#C8A96E" strokeWidth="0.75" strokeLinecap="round"/></svg>,
    name: "Progress that remembers",
    desc: "Pick up exactly where you left off — across devices, across sessions. Your chapter, your page, your moment.",
  },
  {
    n: "03",
    icon: <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M4 16 L10 4 L16 16" stroke="#C8A96E" strokeWidth="0.75" fill="none" strokeLinecap="round"/><line x1="6.5" y1="12" x2="13.5" y2="12" stroke="#C8A96E" strokeWidth="0.75"/></svg>,
    name: "Distraction-free design",
    desc: "The interface recedes. The chrome disappears. Only the text and the reader remain — as it should be.",
  },
  {
    n: "04",
    icon: <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><circle cx="8" cy="8" r="5" stroke="#C8A96E" strokeWidth="0.75"/><line x1="12" y1="12" x2="16" y2="16" stroke="#C8A96E" strokeWidth="0.75" strokeLinecap="round"/></svg>,
    name: "Search by title or author",
    desc: "Regex-powered partial matching. Type three letters and the library responds. Filter by genre, sort by era.",
  },
  {
    n: "05",
    icon: <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><rect x="2" y="5" width="16" height="11" rx="1" stroke="#C8A96E" strokeWidth="0.75"/><line x1="2" y1="8" x2="18" y2="8" stroke="#C8A96E" strokeWidth="0.75"/></svg>,
    name: "Public-domain catalog",
    desc: "Sourced from Project Gutenberg. Every title legally free, ethically clear, and beautifully presented.",
  },
  {
    n: "06",
    icon: <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M10 3 L10 14 M6 10 L10 14 L14 10" stroke="#C8A96E" strokeWidth="0.75" fill="none" strokeLinecap="round" strokeLinejoin="round"/><line x1="3" y1="17" x2="17" y2="17" stroke="#C8A96E" strokeWidth="0.75" strokeLinecap="round"/></svg>,
    name: "Reading history",
    desc: "A personal record of every page turned, every book finished — visible on your profile in one glance.",
  },
];

const SHELF_BOOKS = [
  { title: "Pride and Prejudice", author: "Jane Austen",     isbn: "9780141439518", bg: "#162415", progress: 31  },
  { title: "1984",                author: "George Orwell",   isbn: "9780451524935", bg: "#1e3328", progress: 100 },
  { title: "The Odyssey",         author: "Homer",           isbn: "9780140268867", bg: "#1a1018", progress: 0   },
  { title: "Frankenstein",        author: "Mary Shelley",    isbn: "9780141439471", bg: "#281a0e", progress: 0   },
  { title: "Moby-Dick",           author: "Herman Melville", isbn: "9780142437247", bg: "#3d2810", progress: 0   },
  { title: "Dracula",             author: "Bram Stoker",     isbn: "9780141439846", bg: "#2d1f10", progress: 0   },
];

const TESTIMONIALS = [
  { quote: "It feels like someone finally understood that reading is a private act. No distractions. Just the page.", highlight: "reading is a private act.", author: "Zainab H.", since: "member since 2026" },
  { quote: "The progress tracking is invisible in the best way. I didn't notice it saving. I just opened my book and there I was.", highlight: "there I was.", author: "Qasim S.", since: "member since 2026" },
  { quote: "I've read more classics in two months on The Shelf than in the previous five years. The design gets out of the way.", highlight: "The design gets out of the way.", author: "Hamdan A.", since: "member since 2026" },
];

/* ─── Hooks ──────────────────────────────────────────────────────── */
function useInView(threshold = 0.1) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, visible };
}

function useBreakpoint() {
  const [w, setW] = useState(typeof window !== "undefined" ? window.innerWidth : 1200);
  useEffect(() => {
    const handler = () => setW(window.innerWidth);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);
  return {
    isMobile: w < 640,
    isTablet: w >= 640 && w < 1024,
    isDesktop: w >= 1024,
    w,
  };
}

/* ─── BookCover ──────────────────────────────────────────────────── */
interface BookCoverProps {
  isbn: string; title: string; author: string; bg: string;
  width?: number; height?: number; fontSize?: number; fillContainer?: boolean;
}
function BookCover({ isbn, title, author, bg, width = 160, height = 220, fontSize = 14, fillContainer = false }: BookCoverProps) {
  const [loaded, setLoaded] = useState(false);
  const [errored, setErrored] = useState(false);
  const style: React.CSSProperties = fillContainer
    ? { position: "absolute", inset: 0, width: "100%", height: "100%", borderRadius: 3, overflow: "hidden", background: bg }
    : { width, height, borderRadius: 3, overflow: "hidden", background: bg, flexShrink: 0, border: "0.5px solid rgba(197,185,168,0.15)", position: "relative" };
  return (
    <div style={style}>
      {!errored && (
        <img src={COVER(isbn)} alt={title} loading="lazy"
          onLoad={() => setLoaded(true)} onError={() => setErrored(true)}
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: "center top", opacity: loaded ? 1 : 0, transition: "opacity 0.5s ease" }}
        />
      )}
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 7, padding: "0 12px", opacity: loaded && !errored ? 0 : 1, transition: "opacity 0.4s", pointerEvents: "none" }}>
        <div style={{ fontSize, color: "rgba(245,240,232,0.75)", textAlign: "center", lineHeight: 1.3, fontFamily: "Georgia,serif" }}>{title}</div>
        <div style={{ width: 20, height: "0.5px", background: "rgba(197,185,168,0.25)" }} />
        <div style={{ fontSize: 10, color: "rgba(197,185,168,0.45)", fontFamily: "sans-serif" }}>{author.split(" ").pop()}</div>
      </div>
    </div>
  );
}

/* ─── Shared small components ────────────────────────────────────── */
function NavBtn({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  const [hov, setHov] = useState(false);
  return (
    <button onClick={onClick} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ padding: "9px 16px", background: "none", border: "none", fontSize: 13, color: hov ? "#C8A96E" : "#8a7a68", fontFamily: "sans-serif", cursor: "pointer", transition: "color 0.2s" }}>
      {children}
    </button>
  );
}

function SectionLabel({ children, visible }: { children: React.ReactNode; visible: boolean }) {
  return (
    <div style={{ fontSize: 11, color: "#C8A96E", letterSpacing: "0.14em", textTransform: "uppercase", fontFamily: "sans-serif", marginBottom: 16, display: "flex", alignItems: "center", gap: 10, opacity: visible ? 1 : 0, transition: "opacity 0.8s" }}>
      <span style={{ width: 24, height: "0.5px", background: "#C8A96E", display: "inline-block" }} />
      {children}
    </div>
  );
}

/* ─── Main Component ─────────────────────────────────────────────── */
export default function LandingPage() {
  const navigate = useNavigate();
  const { isMobile, isTablet, isDesktop } = useBreakpoint();
  const [menuOpen, setMenuOpen] = useState(false);

  const heroRef   = useInView(0.05);
  const featRef   = useInView(0.07);
  const readerRef = useInView(0.07);
  const shelfRef  = useInView(0.07);
  const testiRef  = useInView(0.07);
  const ctaRef    = useInView(0.07);

  const px = isMobile ? "20px" : isTablet ? "32px" : "52px";
  const sectionPad = isMobile ? "64px 20px" : isTablet ? "80px 32px" : "100px 52px";

  return (
    <div style={{ background: "#2A1F13", fontFamily: "Georgia,'Times New Roman',serif", overflowX: "hidden" }}>

      {/* ── NAV ──────────────────────────────────────────────────── */}
      <nav style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: `18px ${px}`, borderBottom: "0.5px solid rgba(197,185,168,0.15)", position: "sticky", top: 0, zIndex: 100, background: "rgba(42,31,19,0.96)", backdropFilter: "blur(14px)" }}>
        <span style={{ fontSize: 18, color: "#F5F0E8", letterSpacing: "0.04em" }}>The Shelf</span>

        {/* Desktop nav */}
        {!isMobile && (
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <NavBtn onClick={() => navigate("/library")}>Browse</NavBtn>
            <NavBtn onClick={() => navigate("/login")}>Log in</NavBtn>
            <button onClick={() => navigate("/signup")}
              style={{ padding: "9px 22px", background: "#4A6B5B", border: "none", borderRadius: 3, fontSize: 13, color: "#FDFAF5", fontFamily: "sans-serif", cursor: "pointer", transition: "background 0.2s", letterSpacing: "0.02em" }}
              onMouseEnter={e => (e.currentTarget.style.background = "#3d5a4c")}
              onMouseLeave={e => (e.currentTarget.style.background = "#4A6B5B")}>
              Sign up — free
            </button>
          </div>
        )}

        {/* Mobile hamburger */}
        {isMobile && (
          <button onClick={() => setMenuOpen(o => !o)}
            style={{ background: "none", border: "none", cursor: "pointer", padding: 4, display: "flex", flexDirection: "column", gap: 5 }}>
            {[0, 1, 2].map(i => (
              <span key={i} style={{ display: "block", width: 22, height: "0.5px", background: menuOpen ? "#C8A96E" : "#8a7a68", transition: "background 0.2s", transformOrigin: "center",
                transform: menuOpen ? (i === 0 ? "rotate(45deg) translate(4px,4px)" : i === 2 ? "rotate(-45deg) translate(4px,-4px)" : "scaleX(0)") : "none" }} />
            ))}
          </button>
        )}
      </nav>

      {/* Mobile dropdown menu */}
      {isMobile && menuOpen && (
        <div style={{ background: "rgba(42,31,19,0.98)", borderBottom: "0.5px solid rgba(197,185,168,0.12)", padding: "16px 20px", display: "flex", flexDirection: "column", gap: 4, position: "sticky", top: 55, zIndex: 99 }}>
          {[
            { label: "Browse", path: "/library" },
            { label: "Log in", path: "/login" },
          ].map(({ label, path }) => (
            <button key={label} onClick={() => { navigate(path); setMenuOpen(false); }}
              style={{ padding: "12px 0", background: "none", border: "none", fontSize: 15, color: "#8a7a68", fontFamily: "sans-serif", cursor: "pointer", textAlign: "left", borderBottom: "0.5px solid rgba(197,185,168,0.08)" }}>
              {label}
            </button>
          ))}
          <button onClick={() => { navigate("/signup"); setMenuOpen(false); }}
            style={{ marginTop: 8, padding: "13px", background: "#4A6B5B", border: "none", borderRadius: 3, fontSize: 14, color: "#FDFAF5", fontFamily: "sans-serif", cursor: "pointer" }}>
            Sign up — free
          </button>
        </div>
      )}

      {/* ── HERO ─────────────────────────────────────────────────── */}
      <section style={{ display: "grid", gridTemplateColumns: isDesktop ? "1fr 1fr" : "1fr", minHeight: isDesktop ? "91vh" : "auto", position: "relative" }}>
        {/* Copy */}
        <div style={{ padding: isMobile ? "60px 20px 48px" : isTablet ? "72px 32px 60px" : "80px 52px", display: "flex", flexDirection: "column", justifyContent: "center", zIndex: 2, position: "relative" }}>
          <div style={{ fontSize: 11, color: "#C8A96E", letterSpacing: "0.16em", textTransform: "uppercase", fontFamily: "sans-serif", marginBottom: 24, display: "flex", alignItems: "center", gap: 10, opacity: 0, animation: "fadeUp 0.8s 0.1s forwards" }}>
            <span style={{ width: 24, height: "0.5px", background: "#C8A96E", display: "inline-block" }} />
            Public domain · EPUB · Free forever
          </div>
          <h1 style={{ fontSize: isMobile ? "clamp(38px,10vw,52px)" : "clamp(44px,5.5vw,70px)", lineHeight: 1.04, color: "#F5F0E8", fontWeight: 400, marginBottom: 24, letterSpacing: "-0.02em", opacity: 0, animation: "fadeUp 0.8s 0.25s forwards" }}>
            Where great<br />books<br /><em style={{ color: "#C8A96E", fontStyle: "italic" }}>live again.</em>
          </h1>
          <p style={{ fontSize: isMobile ? 15 : 16, color: "#8a7a68", lineHeight: 1.85, fontFamily: "sans-serif", maxWidth: 400, marginBottom: 40, opacity: 0, animation: "fadeUp 0.8s 0.4s forwards" }}>
            A curated digital library of public-domain literature. Read in your browser — no downloads, no accounts required to browse.
          </p>
          <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", gap: 12, alignItems: isMobile ? "stretch" : "center", opacity: 0, animation: "fadeUp 0.8s 0.55s forwards" }}>
            <button onClick={() => navigate("/signup")}
              style={{ padding: "14px 32px", background: "#4A6B5B", border: "none", borderRadius: 3, fontSize: 14, color: "#FDFAF5", fontFamily: "sans-serif", cursor: "pointer", transition: "background 0.2s", letterSpacing: "0.02em", textAlign: "center" }}
              onMouseEnter={e => (e.currentTarget.style.background = "#3d5a4c")}
              onMouseLeave={e => (e.currentTarget.style.background = "#4A6B5B")}>
              Start reading
            </button>
            <button onClick={() => navigate("/library")}
              style={{ padding: "14px 24px", border: "none", background: "none", fontSize: 14, color: "#8a7a68", fontFamily: "sans-serif", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: isMobile ? "center" : "flex-start", gap: 8, transition: "color 0.2s" }}
              onMouseEnter={e => (e.currentTarget.style.color = "#C8A96E")}
              onMouseLeave={e => (e.currentTarget.style.color = "#8a7a68")}>
              Browse the library <span style={{ fontSize: 16 }}>→</span>
            </button>
          </div>
        </div>

        {/* Book grid — only on tablet+ */}
        {!isMobile && (
          <div ref={heroRef.ref} style={{ position: "relative", overflow: "hidden", minHeight: isTablet ? 400 : undefined }}>
            <div style={{ position: "absolute", inset: 0, display: "grid", gridTemplateColumns: "repeat(3,1fr)", gridTemplateRows: "repeat(4,1fr)", gap: 4, padding: 16, transform: "rotate(6deg) scale(1.22) translateY(-20px)", opacity: heroRef.visible ? 0.9 : 0, transition: "opacity 1.4s ease" }}>
              {GRID_BOOKS.map((b, i) => (
                <div key={i} style={{ gridRow: [0, 3, 5].includes(i) ? "span 2" : undefined, position: "relative", overflow: "hidden", borderRadius: 3, transform: heroRef.visible ? "none" : "translateY(18px)", transition: `transform 0.9s ${i * 0.05}s ease` }}>
                  <BookCover isbn={b.isbn} title={b.title} author={b.author} bg={b.bg} fillContainer fontSize={9} />
                </div>
              ))}
            </div>
            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to right,#2A1F13 0%,transparent 30%,transparent 70%,#2A1F13 100%)", pointerEvents: "none" }} />
            <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 200, background: "linear-gradient(to top,#2A1F13,transparent)", pointerEvents: "none" }} />
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 120, background: "linear-gradient(to bottom,#2A1F13,transparent)", pointerEvents: "none" }} />
          </div>
        )}

        {/* Mobile: horizontal scroll of covers instead */}
        {isMobile && (
          <div style={{ overflowX: "auto", display: "flex", gap: 10, padding: "0 20px 32px", scrollbarWidth: "none" }}>
            {GRID_BOOKS.slice(0, 6).map((b, i) => (
              <BookCover key={i} isbn={b.isbn} title={b.title} author={b.author} bg={b.bg} width={100} height={148} fontSize={8} />
            ))}
          </div>
        )}
      </section>

      {/* ── MARQUEE ──────────────────────────────────────────────── */}
      <div style={{ overflow: "hidden", padding: "22px 0", borderTop: "0.5px solid rgba(197,185,168,0.12)", borderBottom: "0.5px solid rgba(197,185,168,0.12)", background: "#1a100a" }}>
        <div style={{ display: "flex", gap: 40, whiteSpace: "nowrap", animation: "marquee 34s linear infinite" }}>
          {[...MARQUEE, ...MARQUEE].map((t, i) => (
            <span key={i} style={{ fontSize: 11, color: "#5a4a3a", fontFamily: "sans-serif", letterSpacing: "0.07em", textTransform: "uppercase", display: "inline-flex", alignItems: "center", gap: 16 }}>
              {t}<span style={{ width: 3, height: 3, borderRadius: "50%", background: "#C8A96E", display: "inline-block" }} />
            </span>
          ))}
        </div>
      </div>

      {/* ── STATS ────────────────────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4,1fr)", background: "#211710", borderBottom: "0.5px solid rgba(197,185,168,0.1)" }}>
        {[
          { pre: "1", suf: "k+", label: "Books in library" },
          { pre: "0",   suf: "$",  label: "Cost to read"     },
          { pre: "100", suf: "%",  label: "Public domain"    },
          { pre: "∞",   suf: "",   label: "Hours of reading" },
        ].map((s, i) => (
          <div key={i} style={{ padding: isMobile ? "24px 20px" : "30px 40px", borderRight: (!isMobile && i < 3) ? "0.5px solid rgba(197,185,168,0.1)" : "none", borderBottom: (isMobile && i < 2) ? "0.5px solid rgba(197,185,168,0.1)" : "none" }}>
            <div style={{ fontSize: isMobile ? 30 : 36, color: "#F5F0E8", fontWeight: 400, marginBottom: 4 }}>
              {s.pre}<span style={{ fontSize: isMobile ? 18 : 22, color: "#C8A96E" }}>{s.suf}</span>
            </div>
            <div style={{ fontSize: 11, color: "#8a7a68", fontFamily: "sans-serif", letterSpacing: "0.05em" }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* ── FEATURES ─────────────────────────────────────────────── */}
      <section ref={featRef.ref} style={{ padding: sectionPad, background: "#211710" }}>
        <div style={{ marginBottom: isMobile ? 48 : 72 }}>
          <SectionLabel visible={featRef.visible}>What makes it different</SectionLabel>
          <h2 style={{ fontSize: isMobile ? "clamp(26px,7vw,36px)" : "clamp(30px,4vw,46px)", color: "#F5F0E8", fontWeight: 400, lineHeight: 1.15, maxWidth: 520, opacity: featRef.visible ? 1 : 0, transform: featRef.visible ? "none" : "translateY(24px)", transition: "opacity 0.8s 0.1s,transform 0.8s 0.1s" }}>
            Built for <em style={{ color: "#C8A96E", fontStyle: "italic" }}>reading,</em><br />not for browsing.
          </h2>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : isTablet ? "repeat(2,1fr)" : "repeat(3,1fr)", gap: 1, background: "rgba(197,185,168,0.1)", border: "0.5px solid rgba(197,185,168,0.1)" }}>
          {FEATURES.map((f, i) => (
            <div key={i}
              style={{ padding: isMobile ? "28px 24px" : "38px 32px", background: "#211710", position: "relative", overflow: "hidden", opacity: featRef.visible ? 1 : 0, transform: featRef.visible ? "none" : "translateY(28px)", transition: `opacity 0.7s ${i * 0.07}s,transform 0.7s ${i * 0.07}s,background 0.2s` }}
              onMouseEnter={e => (e.currentTarget.style.background = "#281e12")}
              onMouseLeave={e => (e.currentTarget.style.background = "#211710")}>
              <div style={{ position: "absolute", top: 16, right: 20, fontSize: 48, color: "rgba(197,185,168,0.05)", fontFamily: "Georgia,serif", lineHeight: 1, pointerEvents: "none" }}>{f.n}</div>
              <div style={{ width: 38, height: 38, border: "0.5px solid rgba(197,185,168,0.25)", borderRadius: 2, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 20 }}>{f.icon}</div>
              <div style={{ fontSize: 15, color: "#F5F0E8", marginBottom: 10 }}>{f.name}</div>
              <div style={{ fontSize: 13, color: "#6a5a4a", fontFamily: "sans-serif", lineHeight: 1.8 }}>{f.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── READER MOCKUP ────────────────────────────────────────── */}
      <section ref={readerRef.ref} style={{ padding: isMobile ? "64px 20px 0" : isTablet ? "80px 32px 0" : "80px 52px 0" }}>
        <SectionLabel visible={readerRef.visible}>The reading experience</SectionLabel>
        <h2 style={{ fontSize: isMobile ? "clamp(26px,7vw,36px)" : "clamp(30px,4vw,46px)", color: "#F5F0E8", fontWeight: 400, lineHeight: 1.15, marginBottom: 40, opacity: readerRef.visible ? 1 : 0, transform: readerRef.visible ? "none" : "translateY(20px)", transition: "opacity 0.8s,transform 0.8s" }}>
          A reader that <em style={{ color: "#C8A96E", fontStyle: "italic" }}>disappears.</em>
        </h2>
        <div style={{ background: "#1a100a", border: "0.5px solid rgba(197,185,168,0.15)", borderRadius: 4, overflow: "hidden", opacity: readerRef.visible ? 1 : 0, transform: readerRef.visible ? "none" : "translateY(40px)", transition: "opacity 0.9s 0.2s,transform 0.9s 0.2s" }}>
          {/* toolbar */}
          <div style={{ background: "#3B2F1E", padding: "12px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "0.5px solid rgba(197,185,168,0.12)" }}>
            <span style={{ fontSize: 12, color: "#8a7a68", fontFamily: "sans-serif" }}>← Pride and Prejudice</span>
            <div style={{ display: "flex", gap: 14 }}>
              {(["A−","A","A+"] as const).map((a, i) => (
                <span key={i} style={{ fontSize: 11 + i * 2, color: i === 2 ? "#F5F0E8" : "#6a5a4a", fontFamily: "sans-serif", cursor: "pointer" }}>{a}</span>
              ))}
            </div>
          </div>
          {/* body — hide TOC on mobile */}
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "170px 1fr", minHeight: isMobile ? 200 : 300 }}>
            {!isMobile && (
              <div style={{ borderRight: "0.5px solid rgba(197,185,168,0.1)", padding: "22px 16px" }}>
                <div style={{ fontSize: 9, color: "#5a4a3a", letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: "sans-serif", marginBottom: 12 }}>Contents</div>
                {["Chapter 1","Chapter 2","Chapter 3","Chapter 4","Chapter 5"].map((c, i) => (
                  <div key={i} style={{ fontSize: 12, color: i === 2 ? "#C8A96E" : "#5a4a3a", fontFamily: "sans-serif", padding: "5px 0", borderBottom: "0.5px solid rgba(197,185,168,0.06)" }}>{c}</div>
                ))}
                <div style={{ fontSize: 12, color: "#3a2a1a", fontFamily: "sans-serif", padding: "5px 0" }}>· · · 56 more</div>
              </div>
            )}
            <div style={{ padding: isMobile ? "28px 20px" : "40px 52px" }}>
              <div style={{ fontSize: 9, color: "#C8A96E", letterSpacing: "0.14em", textTransform: "uppercase", fontFamily: "sans-serif", marginBottom: 18 }}>Chapter III</div>
              <p style={{ fontSize: isMobile ? 14 : 16, color: "#C5B9A8", lineHeight: isMobile ? 1.9 : 2.05, letterSpacing: "0.01em" }}>
                Not all that Mrs. Bennet, however, with the assistance of her five daughters, could ask on the subject was sufficient to draw from her husband any satisfactory description of Mr. Bingley. They attacked him in various ways — with barefaced questions,{" "}
                <em style={{ color: "#F5F0E8" }}>ingenious suppositions,</em> and distant surmises; but he eluded the skill of them all.
              </p>
            </div>
          </div>
          {/* footer */}
          <div style={{ padding: "12px 20px", borderTop: "0.5px solid rgba(197,185,168,0.1)", display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 18, color: "#5a4a3a", cursor: "pointer", fontFamily: "sans-serif" }}>←</span>
            {!isMobile && <span style={{ fontSize: 11, color: "#5a4a3a", fontFamily: "sans-serif", whiteSpace: "nowrap" }}>Page 45 of 423</span>}
            <div style={{ flex: 1, height: 2, background: "rgba(197,185,168,0.12)", borderRadius: 1 }}>
              <div style={{ width: "31%", height: "100%", background: "#C8A96E", borderRadius: 1 }} />
            </div>
            <span style={{ fontSize: 11, color: "#C8A96E", fontFamily: "sans-serif" }}>31%</span>
            <span style={{ fontSize: 18, color: "#5a4a3a", cursor: "pointer", fontFamily: "sans-serif" }}>→</span>
          </div>
        </div>
      </section>

      {/* ── SHELF ────────────────────────────────────────────────── */}
      <section ref={shelfRef.ref} style={{ padding: sectionPad }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: isMobile ? 32 : 48 }}>
          <div>
            <SectionLabel visible={shelfRef.visible}>From the library</SectionLabel>
            <h2 style={{ fontSize: isMobile ? "clamp(22px,6vw,30px)" : "clamp(26px,3.5vw,38px)", color: "#F5F0E8", fontWeight: 400 }}>Titles waiting for you.</h2>
          </div>
          <button onClick={() => navigate("/library")}
            style={{ fontSize: 12, color: "#C8A96E", fontFamily: "sans-serif", background: "none", border: "none", cursor: "pointer", whiteSpace: "nowrap" }}>
            Browse all →
          </button>
        </div>
        <div style={{ display: "flex", gap: isMobile ? 14 : 20, overflowX: "auto", paddingBottom: 10, scrollbarWidth: "none" }}>
          {SHELF_BOOKS.map((b, i) => {
            const cardW = isMobile ? 130 : 162;
            const cardH = isMobile ? 180 : 226;
            return (
              <div key={i}
                style={{ flexShrink: 0, width: cardW, cursor: "pointer", opacity: shelfRef.visible ? 1 : 0, transform: shelfRef.visible ? "none" : "translateY(28px)", transition: `opacity 0.7s ${i * 0.09}s,transform 0.7s ${i * 0.09}s` }}
                onClick={() => navigate("/library")}>
                <div style={{ transition: "transform 0.25s" }}
                  onMouseEnter={e => ((e.currentTarget as HTMLDivElement).style.transform = "translateY(-5px)")}
                  onMouseLeave={e => ((e.currentTarget as HTMLDivElement).style.transform = "none")}>
                  <BookCover isbn={b.isbn} title={b.title} author={b.author} bg={b.bg} width={cardW} height={cardH} />
                </div>
                <div style={{ marginTop: 10, fontSize: isMobile ? 12 : 14, color: "#C5B9A8", lineHeight: 1.3, marginBottom: 3 }}>{b.title}</div>
                <div style={{ fontSize: 11, color: "#5a4a3a", fontFamily: "sans-serif" }}>{b.author}</div>
                <div style={{ height: 2, background: "rgba(197,185,168,0.1)", borderRadius: 1, marginTop: 7 }}>
                  {b.progress > 0 && <div style={{ width: `${b.progress}%`, height: "100%", borderRadius: 1, background: b.progress === 100 ? "#4A6B5B" : "#C8A96E" }} />}
                </div>
                {b.progress > 0 && (
                  <div style={{ fontSize: 10, color: b.progress === 100 ? "#4A6B5B" : "#C8A96E", fontFamily: "sans-serif", marginTop: 3 }}>
                    {b.progress === 100 ? "Finished" : `${b.progress}% complete`}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* ── TESTIMONIALS ─────────────────────────────────────────── */}
      <section ref={testiRef.ref} style={{ padding: sectionPad, background: "#211710" }}>
        <div style={{ marginBottom: isMobile ? 40 : 60 }}>
          <SectionLabel visible={testiRef.visible}>Readers say</SectionLabel>
          <h2 style={{ fontSize: isMobile ? "clamp(24px,7vw,34px)" : "clamp(28px,3.5vw,44px)", color: "#F5F0E8", fontWeight: 400, lineHeight: 1.2 }}>
            A room full of<br /><em style={{ color: "#C8A96E", fontStyle: "italic" }}>quiet voices.</em>
          </h2>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : isTablet ? "1fr 1fr" : "repeat(3,1fr)", gap: 1, background: "rgba(197,185,168,0.08)", border: "0.5px solid rgba(197,185,168,0.08)" }}>
          {TESTIMONIALS.map((t, i) => {
            // On tablet show only first 2
            if (isTablet && i === 2) return null;
            const [before, after] = t.quote.split(t.highlight);
            return (
              <div key={i} style={{ padding: isMobile ? "28px 20px" : "38px 30px", background: "#211710", opacity: testiRef.visible ? 1 : 0, transform: testiRef.visible ? "none" : "translateY(24px)", transition: `opacity 0.7s ${i * 0.12}s,transform 0.7s ${i * 0.12}s` }}>
                <p style={{ fontSize: isMobile ? 14 : 15, color: "#8a7a68", lineHeight: 1.9, marginBottom: 20, fontStyle: "italic" }}>
                  "{before}<em style={{ color: "#C5B9A8", fontStyle: "normal" }}>{t.highlight}</em>{after}"
                </p>
                <div style={{ fontSize: 11, color: "#5a4a3a", fontFamily: "sans-serif" }}>
                  — {t.author} · <span style={{ color: "#3a2a1a" }}>{t.since}</span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────── */}
      <section ref={ctaRef.ref} style={{ padding: isMobile ? "80px 20px" : "120px 52px", textAlign: "center", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", fontSize: isMobile ? 100 : 200, color: "rgba(197,185,168,0.025)", whiteSpace: "nowrap", pointerEvents: "none", letterSpacing: "-0.04em", userSelect: "none" }}>Read</div>
        <h2 style={{ fontSize: isMobile ? "clamp(30px,8vw,44px)" : "clamp(38px,5.5vw,64px)", color: "#F5F0E8", fontWeight: 400, lineHeight: 1.1, marginBottom: 18, position: "relative", zIndex: 1, opacity: ctaRef.visible ? 1 : 0, transform: ctaRef.visible ? "none" : "translateY(24px)", transition: "opacity 0.8s,transform 0.8s" }}>
          Your next chapter<br /><em style={{ color: "#C8A96E", fontStyle: "italic" }}>is already here.</em>
        </h2>
        <p style={{ fontSize: 14, color: "#6a5a4a", fontFamily: "sans-serif", marginBottom: 40, position: "relative", zIndex: 1, lineHeight: 1.7, opacity: ctaRef.visible ? 1 : 0, transition: "opacity 0.8s 0.15s" }}>
          Free. Always. Public domain literature, beautifully read.
        </p>
        <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", justifyContent: "center", gap: 12, position: "relative", zIndex: 1, alignItems: "center" }}>
          <button onClick={() => navigate("/signup")}
            style={{ padding: "14px 36px", background: "#4A6B5B", border: "none", borderRadius: 3, fontSize: 14, color: "#FDFAF5", fontFamily: "sans-serif", cursor: "pointer", transition: "background 0.2s", width: isMobile ? "100%" : "auto" }}
            onMouseEnter={e => (e.currentTarget.style.background = "#3d5a4c")}
            onMouseLeave={e => (e.currentTarget.style.background = "#4A6B5B")}>
            Create a free account
          </button>
          <button onClick={() => navigate("/login")}
            style={{ padding: "14px 24px", border: "none", background: "none", fontSize: 14, color: "#8a7a68", fontFamily: "sans-serif", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, transition: "color 0.2s", width: isMobile ? "100%" : "auto" }}
            onMouseEnter={e => (e.currentTarget.style.color = "#C8A96E")}
            onMouseLeave={e => (e.currentTarget.style.color = "#8a7a68")}>
            Log in →
          </button>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────────── */}
      <footer style={{ padding: isMobile ? "28px 20px" : "32px 52px", borderTop: "0.5px solid rgba(197,185,168,0.12)" }}>
        {isMobile ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 20, alignItems: "center", textAlign: "center" }}>
            <span style={{ fontSize: 16, color: "#3a2a1a" }}>The Shelf</span>
            <div style={{ display: "flex", gap: 20, flexWrap: "wrap", justifyContent: "center" }}>
              {["Library","About","Project Gutenberg","Privacy"].map(l => (
                <span key={l} style={{ fontSize: 12, color: "#3a2a1a", fontFamily: "sans-serif", cursor: "pointer" }}>{l}</span>
              ))}
            </div>
            <span style={{ fontSize: 11, color: "#3a2a1a", fontFamily: "sans-serif" }}>© 2026 Nexus Archives</span>
          </div>
        ) : (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 16, color: "#3a2a1a" }}>The Shelf</span>
            <div style={{ display: "flex", gap: 24 }}>
              {["Library","About","Project Gutenberg","Privacy"].map(l => (
                <span key={l} style={{ fontSize: 12, color: "#3a2a1a", fontFamily: "sans-serif", cursor: "pointer" }}>{l}</span>
              ))}
            </div>
            <span style={{ fontSize: 12, color: "#3a2a1a", fontFamily: "sans-serif" }}>© 2026 Nexus Archives</span>
          </div>
        )}
      </footer>

      <style>{`
        @keyframes fadeUp  { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes marquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 0; height: 0; }
      `}</style>
    </div>
  );
}
import React, { useState, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import {
  Upload, Search, Check, AlertCircle, Loader2,
  BookOpen, X, ChevronRight, Globe, FileUp, Layers,
  CheckCircle2, XCircle, SkipForward
} from "lucide-react";
import axios from "axios";

/* ─── Types ──────────────────────────────────────────────── */
type Method = "manual" | "batch" | "gutenberg";

interface ScrapeResult {
  message: string;
  added: number;
  skipped_duplicates: number;
  failed: number;
  books_added: { book_id: string; title: string }[];
}

interface BatchFile {
  file: File;
  status: "pending" | "uploading" | "done" | "error";
  error?: string;
}

/* ─── Sub-components ──────────────────────────────────────── */

function TabBar({ method, setMethod }: { method: Method; setMethod: (m: Method) => void }) {
  const tabs: { id: Method; icon: React.ReactNode; label: string }[] = [
    { id: "manual",    icon: <FileUp size={15} />,  label: "Upload Manually"       },
    { id: "batch",     icon: <Layers size={15} />,  label: "Batch Upload"          },
    { id: "gutenberg", icon: <Globe size={15} />,   label: "Project Gutenberg"     },
  ];
  return (
    <div className="flex gap-2 mb-10">
      {tabs.map(t => (
        <button
          key={t.id}
          onClick={() => setMethod(t.id)}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold border transition-all duration-200
            ${method === t.id
              ? "bg-slate-900 text-white border-slate-900 shadow-md shadow-slate-200"
              : "bg-white text-slate-500 border-slate-200 hover:border-slate-400 hover:text-slate-700"}`}
        >
          {t.icon} {t.label}
        </button>
      ))}
    </div>
  );
}

function DropZone({
  onFiles, multiple = false, label = "Drop EPUB file here"
}: { onFiles: (files: File[]) => void; multiple?: boolean; label?: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const handle = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const files = Array.from(e.dataTransfer.files).filter(f => f.name.endsWith(".epub"));
    if (files.length) onFiles(files);
  };

  return (
    <div
      onDragOver={e => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handle}
      className={`border-2 border-dashed rounded-2xl p-14 flex flex-col items-center justify-center text-center transition-all duration-200 cursor-pointer
        ${dragging ? "border-slate-900 bg-slate-50" : "border-slate-200 bg-slate-50/40 hover:border-slate-400"}`}
      onClick={() => inputRef.current?.click()}
    >
      <div className={`p-4 rounded-full mb-4 transition-colors ${dragging ? "bg-slate-900" : "bg-slate-100"}`}>
        <Upload className={dragging ? "text-white" : "text-slate-400"} size={28} />
      </div>
      <p className="text-base font-semibold text-slate-700 mb-1">{label}</p>
      <p className="text-sm text-slate-400 mb-6">or click to browse</p>
      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
        EPUB only · Max 100 MB{multiple ? " · Multiple files" : ""}
      </span>
      <input
        ref={inputRef}
        type="file"
        accept=".epub"
        multiple={multiple}
        className="hidden"
        onChange={e => {
          const files = Array.from(e.target.files ?? []);
          if (files.length) onFiles(files);
          e.target.value = "";
        }}
      />
    </div>
  );
}

/* ─── Manual Upload ───────────────────────────────────────── */
function ManualUpload({ token }: { token: string | null }) {
  const [file, setFile]           = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [form, setForm]           = useState({ title: "", author: "", description: "", genre: "", language: "en", gutenberg_id: "" });
  const [loading, setLoading]     = useState(false);
  const [result, setResult]       = useState<{ ok: boolean; msg: string } | null>(null);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const submit = async () => {
    if (!file) return;
    setLoading(true);
    setResult(null);
    try {
      const fd = new FormData();
      fd.append("epub_file",   file);
      // Only send manual metadata if provided, let server auto-extract otherwise
      if (form.title)       fd.append("title",       form.title);
      if (form.author)      fd.append("author",      form.author);
      if (form.description) fd.append("description", form.description);
      if (form.genre)       fd.append("genre",       form.genre);
      if (form.language)    fd.append("language",    form.language);
      if (form.gutenberg_id) fd.append("gutenberg_id", form.gutenberg_id);
      if (coverFile)         fd.append("cover_image",  coverFile);

      const res = await axios.post("/api/admin/books/upload", fd, {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "multipart/form-data" }
      });
      setResult({ ok: true, msg: res.data.message || "Book added successfully." });
      setFile(null); setCoverFile(null);
      setForm({ title: "", author: "", description: "", genre: "", language: "en", gutenberg_id: "" });
    } catch (err: any) {
      const msg = err.response?.data?.error ?? err.response?.data?.message ?? "Upload failed.";
      setResult({ ok: false, msg });
    } finally {
      setLoading(false);
    }
  };

  const canSubmit = file && !loading;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
      {/* Left – file drop */}
      <div className="space-y-4">
        {file ? (
          <div className="border-2 border-green-200 bg-green-50 rounded-2xl p-8 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <BookOpen className="text-green-600" size={24} />
              <div>
                <p className="font-semibold text-slate-800 text-sm">{file.name}</p>
                <p className="text-xs text-slate-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
              </div>
            </div>
            <button onClick={() => setFile(null)} className="text-slate-400 hover:text-red-500 transition-colors">
              <X size={18} />
            </button>
          </div>
        ) : (
          <DropZone onFiles={([f]) => setFile(f)} label="Drop your EPUB file here" />
        )}

        {/* Cover image */}
        <div className="border border-slate-200 rounded-xl p-4 flex items-center justify-between bg-white">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-0.5">Cover Image</p>
            <p className="text-sm text-slate-600">{coverFile ? coverFile.name : "Optional — JPG or PNG"}</p>
          </div>
          <label className="cursor-pointer bg-slate-100 hover:bg-slate-200 transition-colors px-4 py-2 rounded-lg text-sm font-semibold text-slate-700">
            Browse
            <input type="file" accept=".jpg,.jpeg,.png" className="hidden"
              onChange={e => setCoverFile(e.target.files?.[0] ?? null)} />
          </label>
        </div>
      </div>

      {/* Right – metadata */}
      <div className="space-y-5">
        <h3 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-3">Book Metadata</h3>
        <p className="text-sm text-slate-600 mb-4">Title, author, and description will be automatically extracted from the EPUB file. You can override them below if needed.</p>

        {[
          { label: "Title",  key: "title",  placeholder: "Auto-extracted from EPUB or enter manually", required: false },
          { label: "Author", key: "author", placeholder: "Auto-extracted from EPUB or enter manually", required: false },
        ].map(({ label, key, placeholder, required }) => (
          <div key={key}>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
              {label}{required && <span className="text-red-500 ml-1">*</span>}
            </label>
            <input
              type="text" placeholder={placeholder}
              value={form[key as keyof typeof form]}
              onChange={set(key as keyof typeof form)}
              className="w-full border border-slate-200 p-3 rounded-xl text-sm focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900 transition-colors"
            />
          </div>
        ))}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Genre</label>
            <select value={form.genre} onChange={set("genre")}
              className="w-full border border-slate-200 p-3 rounded-xl text-sm focus:outline-none focus:border-slate-900 transition-colors bg-white">
              <option value="">Select genre</option>
              {["Fiction", "Non-fiction", "Mystery", "Science", "History", "Philosophy", "Poetry", "Drama"].map(g => (
                <option key={g} value={g.toLowerCase()}>{g}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Language</label>
            <select value={form.language} onChange={set("language")}
              className="w-full border border-slate-200 p-3 rounded-xl text-sm focus:outline-none focus:border-slate-900 transition-colors bg-white">
              <option value="en">English</option>
              <option value="fr">French</option>
              <option value="de">German</option>
              <option value="es">Spanish</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
            Gutenberg ID <span className="text-slate-300 font-normal normal-case tracking-normal">(optional)</span>
          </label>
          <input type="number" placeholder="e.g. 1342" value={form.gutenberg_id} onChange={set("gutenberg_id")}
            className="w-full border border-slate-200 p-3 rounded-xl text-sm focus:outline-none focus:border-slate-900 transition-colors" />
        </div>

        <div>
          <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Description</label>
          <textarea placeholder="Short synopsis or blurb…" rows={3} value={form.description}
            onChange={set("description")}
            className="w-full border border-slate-200 p-3 rounded-xl text-sm focus:outline-none focus:border-slate-900 transition-colors resize-none" />
        </div>

        {result && (
          <div className={`flex items-start gap-3 p-4 rounded-xl text-sm font-medium
            ${result.ok ? "bg-green-50 border border-green-200 text-green-800" : "bg-red-50 border border-red-200 text-red-800"}`}>
            {result.ok ? <CheckCircle2 size={18} className="shrink-0 mt-0.5" /> : <XCircle size={18} className="shrink-0 mt-0.5" />}
            {result.msg}
          </div>
        )}

        <button onClick={submit} disabled={!canSubmit}
          className="w-full bg-slate-900 text-white py-3.5 rounded-xl font-bold hover:bg-slate-700 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-md shadow-slate-200">
          {loading ? <><Loader2 className="animate-spin" size={18} /> Uploading…</> : <><Upload size={16} /> Upload & Publish</>}
        </button>
      </div>
    </div>
  );
}

/* ─── Batch Upload ────────────────────────────────────────── */
function BatchUpload({ token }: { token: string | null }) {
  const [files, setFiles]   = useState<BatchFile[]>([]);
  const [running, setRunning] = useState(false);

  const addFiles = (incoming: File[]) => {
    const newEntries = incoming.map(f => ({ file: f, status: "pending" as const }));
    setFiles(prev => [...prev, ...newEntries]);
  };

  const removeFile = (i: number) => setFiles(f => f.filter((_, idx) => idx !== i));

  const uploadAll = async () => {
    setRunning(true);
    for (let i = 0; i < files.length; i++) {
      if (files[i].status === "done") continue;
      setFiles(f => f.map((item, idx) => idx === i ? { ...item, status: "uploading" } : item));
      try {
        const fd = new FormData();
        fd.append("epub_file", files[i].file);
        // Let the server extract metadata automatically from the EPUB
        await axios.post("/api/admin/books/upload", fd, {
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "multipart/form-data" }
        });
        setFiles(f => f.map((item, idx) => idx === i ? { ...item, status: "done" } : item));
      } catch (err: any) {
        const msg = err.response?.data?.error ?? "Failed";
        setFiles(f => f.map((item, idx) => idx === i ? { ...item, status: "error", error: msg } : item));
      }
    }
    setRunning(false);
  };

  const statusIcon = (s: BatchFile["status"]) => ({
    pending:   <div className="w-2 h-2 rounded-full bg-slate-300" />,
    uploading: <Loader2 size={14} className="animate-spin text-amber-500" />,
    done:      <CheckCircle2 size={14} className="text-green-500" />,
    error:     <XCircle size={14} className="text-red-500" />,
  }[s]);

  return (
    <div className="space-y-6">
      <DropZone onFiles={addFiles} multiple label="Drop multiple EPUB files here" />

      {files.length > 0 && (
        <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                {["#", "File", "Size", "Status", ""].map(h => (
                  <th key={h} className="px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {files.map((f, i) => (
                <tr key={i} className="hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-3 text-slate-400 text-xs">{i + 1}</td>
                  <td className="px-5 py-3 font-medium text-slate-800 truncate max-w-xs">{f.file.name}</td>
                  <td className="px-5 py-3 text-slate-500 text-xs">{(f.file.size / 1024 / 1024).toFixed(1)} MB</td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      {statusIcon(f.status)}
                      <span className="text-xs capitalize text-slate-500">{f.error ?? f.status}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    {f.status === "pending" && (
                      <button onClick={() => removeFile(i)} className="text-slate-300 hover:text-red-400 transition-colors">
                        <X size={14} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <button onClick={uploadAll} disabled={files.length === 0 || running}
        className="w-full bg-slate-900 text-white py-3.5 rounded-xl font-bold hover:bg-slate-700 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-md shadow-slate-200">
        {running
          ? <><Loader2 className="animate-spin" size={18} /> Uploading batch…</>
          : <><Layers size={16} /> Upload {files.length > 0 ? `${files.length} file${files.length > 1 ? "s" : ""}` : "Files"}</>}
      </button>
    </div>
  );
}

/* ─── Gutenberg Scraper ───────────────────────────────────── */
function GutenbergScraper({ token }: { token: string | null }) {
  const [query,    setQuery]    = useState("");
  const [limit,    setLimit]    = useState(10);
  const [language, setLanguage] = useState("en");
  const [loading,  setLoading]  = useState(false);
  const [result,   setResult]   = useState<ScrapeResult | null>(null);
  const [error,    setError]    = useState("");

  const scrape = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setResult(null);
    setError("");
    try {
      const res = await axios.post(
        "/api/admin/books/scrape",
        { query: query.trim(), limit, language },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      // Normalise the response so the UI never crashes on a missing field
      const raw = res.data ?? {};
      setResult({
        message:            raw.message            ?? "Scrape completed.",
        added:              raw.added              ?? 0,
        skipped_duplicates: raw.skipped_duplicates ?? raw.skipped ?? 0,
        failed:             raw.failed             ?? 0,
        books_added:        Array.isArray(raw.books_added) ? raw.books_added : [],
      });
    } catch (err: any) {
      setError(
        err.response?.data?.error ??
        err.response?.data?.message ??
        "Scrape failed. Project Gutenberg may be unreachable."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Info banner */}
      <div className="flex items-start gap-3 bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm text-blue-700">
        <Globe size={18} className="shrink-0 mt-0.5" />
        <p>The scraper searches Project Gutenberg, downloads EPUBs, and extracts metadata automatically. Duplicates are skipped.</p>
      </div>

      {/* Controls */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-1">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Search Query *</label>
            <input
              type="text" placeholder="Title, author, or keyword…"
              value={query} onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === "Enter" && scrape()}
              className="w-full border border-slate-200 p-3 rounded-xl text-sm focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900 transition-colors"
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Max Books</label>
            <select value={limit} onChange={e => setLimit(Number(e.target.value))}
              className="w-full border border-slate-200 p-3 rounded-xl text-sm bg-white focus:outline-none focus:border-slate-900 transition-colors">
              {[5, 10, 20, 50].map(n => <option key={n} value={n}>{n} books</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Language</label>
            <select value={language} onChange={e => setLanguage(e.target.value)}
              className="w-full border border-slate-200 p-3 rounded-xl text-sm bg-white focus:outline-none focus:border-slate-900 transition-colors">
              <option value="en">English</option>
              <option value="fr">French</option>
              <option value="de">German</option>
              <option value="es">Spanish</option>
            </select>
          </div>
        </div>

        <button onClick={scrape} disabled={loading || !query.trim()}
          className="w-full bg-slate-900 text-white py-3.5 rounded-xl font-bold hover:bg-slate-700 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-md shadow-slate-200">
          {loading
            ? <><Loader2 className="animate-spin" size={18} /> Scraping Gutenberg…</>
            : <><Search size={16} /> Run Scraper</>}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700 font-medium">
          <AlertCircle size={18} className="shrink-0 mt-0.5" />
          {error}
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="space-y-4">
          {/* Stats row */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { icon: <CheckCircle2 size={18} className="text-green-500" />, label: "Added",    value: result.added,             bg: "bg-green-50 border-green-100" },
              { icon: <SkipForward  size={18} className="text-amber-500" />, label: "Skipped",  value: result.skipped_duplicates, bg: "bg-amber-50 border-amber-100"  },
              { icon: <XCircle      size={18} className="text-red-400"   />, label: "Failed",   value: result.failed,            bg: "bg-red-50 border-red-100"      },
            ].map(({ icon, label, value, bg }) => (
              <div key={label} className={`flex items-center gap-3 border rounded-xl p-4 ${bg}`}>
                {icon}
                <div>
                  <p className="text-xl font-bold text-slate-800 leading-none">{value}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{label}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Book list */}
          {(result.books_added ?? []).length > 0 && (
            <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white">
              <div className="px-5 py-3 bg-slate-50 border-b border-slate-200">
                <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Books Added</p>
              </div>
              <ul className="divide-y divide-slate-100">
                {(result.books_added ?? []).map((b, i) => (
                  <li key={b.book_id} className="flex items-center gap-4 px-5 py-3">
                    <span className="text-xs text-slate-400 w-5">{i + 1}</span>
                    <BookOpen size={14} className="text-slate-400 shrink-0" />
                    <span className="text-sm font-medium text-slate-800 flex-1">{b.title}</span>
                    <span className="text-[10px] text-slate-400 font-mono">{b.book_id.slice(-8)}</span>
                    <CheckCircle2 size={14} className="text-green-500 shrink-0" />
                  </li>
                ))}
              </ul>
            </div>
          )}

          <p className="text-xs text-slate-400 text-center">{result.message}</p>
        </div>
      )}
    </div>
  );
}

/* ─── Main Page ───────────────────────────────────────────── */
export default function IngestBooks() {
  const [method, setMethod] = useState<Method>("manual");
  const { token } = useAuth();

  return (
    <div className="max-w-5xl mx-auto px-6 py-12">
      {/* Header */}
      <div className="mb-10">
        <div className="flex items-center gap-2 text-sm text-slate-400 mb-3">
          <Link to="/admin" className="hover:text-slate-700 transition-colors">Admin</Link>
          <ChevronRight size={14} />
          <span className="text-slate-700 font-medium">Ingest Books</span>
        </div>
        <h1 className="text-4xl font-bold text-slate-900 tracking-tight">Add Books</h1>
        <p className="text-slate-500 mt-1.5 text-sm">Upload EPUBs manually, in batch, or scrape directly from Project Gutenberg.</p>
      </div>

      {/* Nav tabs */}
      <div className="flex gap-1 border-b border-slate-200 mb-8 text-sm">
        {[
          { to: "/admin",        label: "Dashboard" },
          { to: "/admin/ingest", label: "Ingest"    },
          { to: "/admin/manage", label: "Manage"    },
        ].map(({ to, label }) => (
          <Link key={to} to={to}
            className={`pb-3 px-4 border-b-2 font-semibold transition-colors
              ${to === "/admin/ingest"
                ? "border-slate-900 text-slate-900"
                : "border-transparent text-slate-400 hover:text-slate-700"}`}>
            {label}
          </Link>
        ))}
      </div>

      {/* Method tabs */}
      <TabBar method={method} setMethod={setMethod} />

      {/* Panels */}
      {method === "manual"    && <ManualUpload    token={token} />}
      {method === "batch"     && <BatchUpload     token={token} />}
      {method === "gutenberg" && <GutenbergScraper token={token} />}
    </div>
  );
}
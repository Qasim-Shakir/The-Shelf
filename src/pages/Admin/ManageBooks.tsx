// ManageBooks.tsx
import React, { useEffect, useState, useCallback, useRef } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import {
  Search, Edit, Trash2, X, Upload,
  Archive, RotateCcw, ChevronLeft, ChevronRight,
  BookOpen, AlertTriangle, CheckCircle, Layers,
} from "lucide-react";
import axios from "axios";
import { AdminNav } from "./Dashboard";

// ── Types ──────────────────────────────────────────────────────────────────────
type BookStatus = "Active" | "Archived";

interface Book {
  id:              string;
  title:           string;
  author:          string;
  genre:           string;
  publicationYear: string;
  status:          BookStatus;
  description:     string;
  coverUrl:        string;
}

type FilterTab = "all" | "active" | "archived";

// ── Constants ──────────────────────────────────────────────────────────────────
const PAGE_SIZE = 15;

const STATUS_BADGE: Record<BookStatus, string> = {
  Active:   "bg-library-green/10 text-library-green border border-library-green/20",
  Archived: "bg-[#EFE9DD] text-tan-oak border border-dust",
};

// ── Confirm dialog ─────────────────────────────────────────────────────────────
function ConfirmDialog({
  title, body, confirmLabel, danger, onConfirm, onCancel,
}: {
  title:        string;
  body:         string;
  confirmLabel: string;
  danger:       boolean;
  onConfirm:    () => void;
  onCancel:     () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[300] p-4">
      <div className="bg-parchment border border-dust rounded-2xl shadow-2xl max-w-md w-full p-8">
        <div className={`flex items-center gap-3 mb-4 ${danger ? "text-red-600" : "text-tan-oak"}`}>
          <AlertTriangle size={22} />
          <h3 className="font-serif font-bold text-xl text-dark-walnut">{title}</h3>
        </div>
        <p className="text-sm text-tan-oak mb-8 leading-relaxed">{body}</p>
        <div className="flex justify-end gap-3">
          <button onClick={onCancel}
            className="px-6 py-3 rounded-lg font-bold text-sm text-tan-oak border border-dust hover:bg-warm-linen transition-colors">
            Cancel
          </button>
          <button onClick={onConfirm}
            className={`px-8 py-3 rounded-lg font-bold text-sm text-white transition-all shadow-sm active:scale-95 ${
              danger ? "bg-red-600 hover:bg-red-700" : "bg-library-green hover:bg-[#3D5A4C]"
            }`}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Toast ──────────────────────────────────────────────────────────────────────
interface Toast { id: number; text: string; ok: boolean }
let toastId = 0;

function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const push = useCallback((text: string, ok = true) => {
    const id = ++toastId;
    setToasts((t) => [...t, { id, text, ok }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3500);
  }, []);
  return { toasts, push };
}

// ── Batch Edit Modal (US-042) ──────────────────────────────────────────────────
// Shows only fields safe for bulk changes. Each field has an explicit
// "apply this field" checkbox so admins don't accidentally overwrite
// fields they left blank.
interface BatchForm {
  genre:           string;
  language:        string;
  status:          BookStatus | "";
  publicationYear: string;
}

function BatchEditModal({
  selectedBooks,
  token,
  onClose,
  onSaved,
  pushToast,
}: {
  selectedBooks: Book[];
  token:         string;
  onClose:       () => void;
  onSaved:       (updated: Book[]) => void;
  pushToast:     (text: string, ok?: boolean) => void;
}) {
  const [form, setForm] = useState<BatchForm>({
    genre:           "",
    language:        "",
    status:          "",
    publicationYear: "",
  });

  // Which fields the admin explicitly wants to apply
  const [apply, setApply] = useState<Record<keyof BatchForm, boolean>>({
    genre:           false,
    language:        false,
    status:          false,
    publicationYear: false,
  });

  const [saving,   setSaving]   = useState(false);
  const [confirm,  setConfirm]  = useState(false);

  const headers = { Authorization: `Bearer ${token}` };

  const toggleApply = (field: keyof BatchForm) =>
    setApply((a) => ({ ...a, [field]: !a[field] }));

  const anyApplied = Object.values(apply).some(Boolean);

  const handleSave = async () => {
    setSaving(true);
    const patch: Record<string, string> = {};
    if (apply.genre           && form.genre)           patch.genre           = form.genre;
    if (apply.language        && form.language)        patch.language        = form.language;
    if (apply.status          && form.status)          patch.status          = form.status;
    if (apply.publicationYear && form.publicationYear) patch.publicationYear = form.publicationYear;

    if (Object.keys(patch).length === 0) {
      pushToast("No fields selected to apply.", false);
      setSaving(false);
      return;
    }

    let successCount = 0;
    const updatedBooks: Book[] = [];

    await Promise.allSettled(
      selectedBooks.map(async (book) => {
        try {
          const merged = { ...book, ...patch };
          await axios.put(`/api/admin/books/${book.id}`, merged, { headers });
          updatedBooks.push(merged as Book);
          successCount++;
        } catch {
          // individual failures don't abort the batch
        }
      })
    );

    setSaving(false);

    if (successCount === selectedBooks.length) {
      pushToast(`${successCount} book${successCount !== 1 ? "s" : ""} updated successfully.`);
    } else {
      pushToast(
        `${successCount} of ${selectedBooks.length} books updated. Some changes failed.`,
        successCount > 0,
      );
    }

    onSaved(updatedBooks);
    onClose();
  };

  const fields: {
    key:         keyof BatchForm;
    label:       string;
    placeholder: string;
    type:        "text" | "select";
    options?:    { value: string; label: string }[];
  }[] = [
    {
      key:         "genre",
      label:       "Genre / Category",
      placeholder: "e.g. Classic Fiction",
      type:        "text",
    },
    {
      key:         "language",
      label:       "Language",
      placeholder: "e.g. en",
      type:        "text",
    },
    {
      key:         "publicationYear",
      label:       "Publication Year",
      placeholder: "e.g. 1897",
      type:        "text",
    },
    {
      key:     "status",
      label:   "Status",
      type:    "select",
      placeholder: "",
      options: [
        { value: "Active",   label: "Active"   },
        { value: "Archived", label: "Archived" },
      ],
    },
  ];

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[200] p-4">
      <div className="bg-parchment w-full max-w-lg rounded-2xl shadow-2xl border border-dust overflow-hidden flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-8 py-5 border-b border-dust bg-warm-linen shrink-0">
          <div>
            <div className="flex items-center gap-3 mb-0.5">
              <Layers size={18} className="text-tan-oak" />
              <h2 className="text-xl font-serif font-bold text-dark-walnut">Batch Edit</h2>
            </div>
            <p className="text-xs text-dust font-medium ml-7">
              Applying changes to <span className="text-tan-oak font-bold">{selectedBooks.length} books</span>
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-dust/20 rounded-full transition-colors text-tan-oak">
            <X size={20} />
          </button>
        </div>

        {/* Selected books preview */}
        <div className="px-8 py-4 border-b border-dust bg-[#F5F1E8] shrink-0">
          <p className="text-[9px] font-bold uppercase tracking-widest text-dust mb-2">Selected Books</p>
          <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto">
            {selectedBooks.map((b) => (
              <span key={b.id}
                className="inline-flex items-center gap-1 bg-parchment border border-dust px-2.5 py-1 rounded-full text-[10px] font-bold text-tan-oak">
                <BookOpen size={10} />
                {b.title.length > 28 ? b.title.slice(0, 28) + "…" : b.title}
              </span>
            ))}
          </div>
        </div>

        {/* Fields */}
        <div className="flex-1 overflow-y-auto px-8 py-6 space-y-4">
          <p className="text-xs text-dust leading-relaxed">
            Check the box next to each field you want to apply. Unchecked fields are left unchanged.
          </p>

          {fields.map(({ key, label, placeholder, type, options }) => (
            <div key={key}
              className={`flex items-start gap-4 p-4 rounded-xl border transition-all ${
                apply[key]
                  ? "border-aged-gold/50 bg-aged-gold/5"
                  : "border-dust bg-warm-linen opacity-60"
              }`}>

              {/* Checkbox */}
              <button
                onClick={() => toggleApply(key)}
                className={`mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-all ${
                  apply[key]
                    ? "bg-dark-walnut border-dark-walnut"
                    : "border-dust bg-parchment"
                }`}
              >
                {apply[key] && (
                  <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                    <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </button>

              {/* Field */}
              <div className="flex-1 min-w-0">
                <label className="block text-[9px] font-bold uppercase tracking-widest text-dust mb-1.5">
                  {label}
                </label>
                {type === "select" ? (
                  <select
                    disabled={!apply[key]}
                    value={form[key]}
                    onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                    className="w-full bg-parchment border border-dust p-2.5 rounded-lg text-sm text-dark-walnut focus:outline-none focus:border-tan-oak transition-colors disabled:cursor-not-allowed"
                  >
                    <option value="">— Choose status —</option>
                    {options!.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    disabled={!apply[key]}
                    placeholder={apply[key] ? placeholder : "Enable to edit"}
                    value={form[key]}
                    onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                    className="w-full bg-parchment border border-dust p-2.5 rounded-lg text-sm text-dark-walnut placeholder:text-dust/60 focus:outline-none focus:border-tan-oak transition-colors disabled:cursor-not-allowed"
                  />
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="shrink-0 px-8 py-5 border-t border-dust bg-warm-linen flex justify-between items-center gap-3">
          <p className="text-[10px] text-dust font-bold uppercase tracking-widest">
            {Object.values(apply).filter(Boolean).length} field{Object.values(apply).filter(Boolean).length !== 1 ? "s" : ""} selected
          </p>
          <div className="flex gap-3">
            <button onClick={onClose}
              className="px-6 py-3 rounded-lg font-bold text-sm text-tan-oak border border-dust hover:bg-parchment transition-colors">
              Cancel
            </button>
            <button
              onClick={() => setConfirm(true)}
              disabled={!anyApplied || saving}
              className="bg-library-green text-white px-8 py-3 rounded-lg font-bold text-sm hover:bg-[#3D5A4C] transition-all shadow-sm active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {saving ? "Saving…" : `Apply to ${selectedBooks.length} Books`}
            </button>
          </div>
        </div>
      </div>

      {confirm && (
        <ConfirmDialog
          title="Apply Batch Changes"
          body={`This will update ${selectedBooks.length} book${selectedBooks.length !== 1 ? "s" : ""}. Only the checked fields will be changed. This cannot be undone.`}
          confirmLabel={`Update ${selectedBooks.length} Books`}
          danger={false}
          onConfirm={() => { setConfirm(false); handleSave(); }}
          onCancel={() => setConfirm(false)}
        />
      )}
    </div>
  );
}

// ── Edit Modal ─────────────────────────────────────────────────────────────────
function EditModal({
  book, token, onClose, onSaved, onDeleted, pushToast,
}: {
  book:      Book;
  token:     string;
  onClose:   () => void;
  onSaved:   (b: Book) => void;
  onDeleted: (id: string) => void;
  pushToast: (text: string, ok?: boolean) => void;
}) {
  const [form,       setForm]       = useState<Book>({ ...book });
  const [saving,     setSaving]     = useState(false);
  const [confirm,    setConfirm]    = useState<"delete" | "archive" | "restore" | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const headers = { Authorization: `Bearer ${token}` };

  const update = (patch: Partial<Book>) => setForm((f) => ({ ...f, ...patch }));

  const handleSave = async () => {
    setSaving(true);
    try {
      const { id, ...data } = form;
      await axios.put(`/api/admin/books/${id}`, data, { headers });
      pushToast("Book updated successfully.");
      onSaved(form);
      onClose();
    } catch (err: any) {
      pushToast(err.response?.data?.error ?? "Failed to save changes.", false);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      await axios.delete(`/api/admin/books/${form.id}`, { headers });
      pushToast("Book permanently deleted.");
      onDeleted(form.id);
      onClose();
    } catch (err: any) {
      pushToast(err.response?.data?.error ?? "Failed to delete.", false);
    }
  };

  const handleArchive = async () => {
    const newStatus: BookStatus = form.status === "Active" ? "Archived" : "Active";
    try {
      await axios.put(
        `/api/admin/books/${form.id}`,
        { ...form, status: newStatus },
        { headers },
      );
      const updated = { ...form, status: newStatus };
      pushToast(newStatus === "Archived" ? "Book archived." : "Book restored to Active.");
      onSaved(updated);
      onClose();
    } catch (err: any) {
      pushToast(err.response?.data?.error ?? "Status change failed.", false);
    }
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append("cover", file);
    try {
      const res = await axios.post(`/api/admin/books/${form.id}/cover`, fd, {
        headers: { ...headers, "Content-Type": "multipart/form-data" },
      });
      update({ coverUrl: res.data.coverUrl });
      pushToast("Cover updated.");
    } catch {
      pushToast("Cover upload failed.", false);
    }
  };

  const isArchived = form.status === "Archived";

  return (
    <>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[200] p-4">
        <div className="bg-parchment w-full max-w-4xl rounded-2xl shadow-2xl border border-dust overflow-hidden flex flex-col max-h-[92vh]">

          <div className="flex items-center justify-between px-8 py-5 border-b border-dust bg-warm-linen shrink-0">
            <div className="flex items-center gap-4">
              <h2 className="text-2xl font-serif font-bold text-dark-walnut">Edit Book</h2>
              <span className={`text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full ${STATUS_BADGE[form.status]}`}>
                {form.status}
              </span>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-dust/20 rounded-full transition-colors text-tan-oak">
              <X size={22} />
            </button>
          </div>

          {isArchived && (
            <div className="flex items-center gap-3 px-8 py-3 bg-[#EFE9DD] border-b border-dust shrink-0">
              <Archive size={16} className="text-tan-oak" />
              <p className="text-sm font-bold text-tan-oak">
                This book is archived and hidden from user library browsing.
                User reading progress is preserved.
              </p>
            </div>
          )}

          <div className="flex-1 overflow-y-auto">
            <div className="p-8 grid grid-cols-1 lg:grid-cols-2 gap-10">
              <div className="space-y-5">
                {[
                  { label: "Title",            key: "title",           type: "text" },
                  { label: "Author",           key: "author",          type: "text" },
                  { label: "Publication Year", key: "publicationYear", type: "text" },
                  { label: "Genre",            key: "genre",           type: "text" },
                ].map(({ label, key, type }) => (
                  <div key={key}>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-dust mb-2">{label}</label>
                    <input type={type}
                      className="w-full bg-warm-linen border border-dust p-3 rounded-lg text-sm text-dark-walnut focus:outline-none focus:border-tan-oak transition-colors"
                      value={(form as any)[key]}
                      onChange={(e) => update({ [key]: e.target.value } as any)} />
                  </div>
                ))}

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-dust mb-2">Description</label>
                  <textarea rows={5}
                    className="w-full bg-warm-linen border border-dust p-3 rounded-lg text-sm text-dark-walnut focus:outline-none focus:border-tan-oak transition-colors resize-none"
                    value={form.description}
                    onChange={(e) => update({ description: e.target.value })} />
                </div>

                <div className="flex items-center gap-4 pt-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-dust">Status</label>
                  <div className="flex gap-2">
                    {(["Active", "Archived"] as BookStatus[]).map((s) => (
                      <button key={s} type="button"
                        onClick={() => update({ status: s })}
                        className={`px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest border transition-all ${
                          form.status === s
                            ? s === "Active"
                              ? "bg-library-green text-white border-library-green"
                              : "bg-tan-oak text-white border-tan-oak"
                            : "bg-transparent text-dust border-dust hover:border-tan-oak"
                        }`}>
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex flex-col items-center gap-5">
                <p className="text-[10px] font-bold uppercase tracking-widest text-dust self-start">Cover Photo</p>
                <div className="w-44 aspect-[2/3] bg-warm-linen rounded-xl overflow-hidden border border-dust shadow-md">
                  {form.coverUrl
                    ? <img src={form.coverUrl} alt="Cover" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    : <div className="w-full h-full flex items-center justify-center"><BookOpen size={32} className="text-dust" /></div>
                  }
                </div>
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleCoverUpload} />
                <button type="button" onClick={() => fileRef.current?.click()}
                  className="flex items-center gap-2 bg-warm-linen border border-dust px-5 py-2.5 rounded-lg text-[10px] font-bold uppercase tracking-widest text-tan-oak hover:border-tan-oak transition-colors">
                  <Upload size={13} /> Upload New Cover
                </button>

                <div className="w-full mt-auto pt-6 border-t border-dust">
                  {isArchived ? (
                    <button type="button" onClick={() => setConfirm("restore")}
                      className="w-full flex items-center justify-center gap-2 bg-library-green text-white py-3.5 rounded-xl font-bold text-sm hover:bg-[#3D5A4C] transition-all shadow-sm">
                      <RotateCcw size={16} /> Restore to Active
                    </button>
                  ) : (
                    <button type="button" onClick={() => setConfirm("archive")}
                      className="w-full flex items-center justify-center gap-2 bg-[#EFE9DD] text-tan-oak py-3.5 rounded-xl font-bold text-sm border border-dust hover:border-tan-oak transition-all">
                      <Archive size={16} /> Archive Book
                    </button>
                  )}
                  <button type="button" onClick={() => setConfirm("delete")}
                    className="w-full flex items-center justify-center gap-2 bg-red-50 text-red-600 border border-red-100 py-3.5 rounded-xl font-bold text-sm mt-3 hover:bg-red-100 transition-all">
                    <Trash2 size={16} /> Permanently Delete
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="shrink-0 px-8 py-5 border-t border-dust bg-warm-linen flex justify-end gap-3">
            <button onClick={onClose}
              className="px-8 py-3 rounded-lg font-bold text-sm text-tan-oak border border-dust hover:bg-parchment transition-colors">
              Cancel
            </button>
            <button onClick={handleSave} disabled={saving}
              className="bg-library-green text-white px-12 py-3 rounded-lg font-bold text-sm hover:bg-[#3D5A4C] transition-all shadow-sm active:scale-95 disabled:opacity-50">
              {saving ? "Saving…" : "Save Changes"}
            </button>
          </div>
        </div>
      </div>

      {confirm === "delete" && (
        <ConfirmDialog
          title="Permanently Delete Book"
          body={`"${form.title}" will be removed from the database. This cannot be undone. User reading progress for this book will also be deleted.`}
          confirmLabel="Delete Permanently"
          danger
          onConfirm={handleDelete}
          onCancel={() => setConfirm(null)}
        />
      )}
      {confirm === "archive" && (
        <ConfirmDialog
          title="Archive Book"
          body={`"${form.title}" will be hidden from user library browsing. Existing reading progress is preserved and the book can be restored at any time.`}
          confirmLabel="Archive Book"
          danger={false}
          onConfirm={handleArchive}
          onCancel={() => setConfirm(null)}
        />
      )}
      {confirm === "restore" && (
        <ConfirmDialog
          title="Restore Book"
          body={`"${form.title}" will become visible to users again in the library.`}
          confirmLabel="Restore to Active"
          danger={false}
          onConfirm={handleArchive}
          onCancel={() => setConfirm(null)}
        />
      )}
    </>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function ManageBooks() {
  const { token }                         = useAuth();
  const [urlParams]                       = useSearchParams();

  const [books,        setBooks]          = useState<Book[]>([]);
  const [loading,      setLoading]        = useState(true);
  const [search,       setSearch]         = useState("");
  const [filter,       setFilter]         = useState<FilterTab>(
    (urlParams.get("filter") as FilterTab) ?? "all"
  );
  const [page,         setPage]           = useState(1);
  const [editingBook,  setEditingBook]    = useState<Book | null>(null);

  // ── US-042: selection state ─────────────────────────────────────────────────
  const [selectedIds,     setSelectedIds]     = useState<Set<string>>(new Set());
  const [showBatchEdit,   setShowBatchEdit]   = useState(false);

  const { toasts, push: pushToast } = useToast();

  const headers = { Authorization: `Bearer ${token}` };

  // ── Fetch ───────────────────────────────────────────────────────────────────
  const fetchBooks = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get("/api/admin/books", { headers });
      setBooks(res.data ?? []);
    } catch (err: any) {
      pushToast(err.response?.data?.error ?? "Failed to fetch books.", false);
    } finally {
      setLoading(false);
    }
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { fetchBooks(); }, [fetchBooks]);

  // ── Filter + search + paginate ──────────────────────────────────────────────
  const filtered = books.filter((b) => {
    const matchSearch =
      b.title.toLowerCase().includes(search.toLowerCase()) ||
      b.author.toLowerCase().includes(search.toLowerCase()) ||
      b.genre?.toLowerCase().includes(search.toLowerCase());
    const matchFilter =
      filter === "all"      ? true :
      filter === "active"   ? b.status === "Active" :
      filter === "archived" ? b.status === "Archived" :
      true;
    return matchSearch && matchFilter;
  });

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => { setPage(1); }, [search, filter]);

  // Clear selection when filter/search changes to avoid confusion
  useEffect(() => { setSelectedIds(new Set()); }, [search, filter, page]);

  // ── Selection helpers ────────────────────────────────────────────────────────
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  // Select / deselect all books on the current page
  const allPageSelected = paginated.length > 0 && paginated.every((b) => selectedIds.has(b.id));
  const somePageSelected = paginated.some((b) => selectedIds.has(b.id));

  const toggleSelectPage = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allPageSelected) {
        paginated.forEach((b) => next.delete(b.id));
      } else {
        paginated.forEach((b) => next.add(b.id));
      }
      return next;
    });
  };

  const clearSelection = () => setSelectedIds(new Set());

  const selectedBooks = books.filter((b) => selectedIds.has(b.id));

  // ── Callbacks from modals ───────────────────────────────────────────────────
  const handleSaved = (updated: Book) => {
    setBooks((bs) => bs.map((b) => (b.id === updated.id ? updated : b)));
  };

  // Called by BatchEditModal with all successfully updated books
  const handleBatchSaved = (updatedBooks: Book[]) => {
    setBooks((bs) => {
      const map = new Map(updatedBooks.map((b) => [b.id, b]));
      return bs.map((b) => map.get(b.id) ?? b);
    });
    clearSelection();
  };

  const handleDeleted = (id: string) => {
    setBooks((bs) => bs.filter((b) => b.id !== id));
    setSelectedIds((prev) => { const next = new Set(prev); next.delete(id); return next; });
  };

  const quickArchive = async (book: Book) => {
    const newStatus: BookStatus = book.status === "Active" ? "Archived" : "Active";
    try {
      await axios.put(`/api/admin/books/${book.id}`, { ...book, status: newStatus }, { headers });
      handleSaved({ ...book, status: newStatus });
      pushToast(newStatus === "Archived" ? `"${book.title}" archived.` : `"${book.title}" restored.`);
    } catch {
      pushToast("Status update failed.", false);
    }
  };

  const counts = {
    all:      books.length,
    active:   books.filter((b) => b.status === "Active").length,
    archived: books.filter((b) => b.status === "Archived").length,
  };

  return (
    <div className="max-w-6xl mx-auto px-6 py-12">

      {/* Toasts */}
      <div className="fixed top-6 right-6 z-[400] flex flex-col gap-2 pointer-events-none">
        {toasts.map((t) => (
          <div key={t.id}
            className={`flex items-center gap-2 px-5 py-3.5 rounded-xl shadow-lg text-sm font-bold border pointer-events-auto
              ${t.ok
                ? "bg-parchment text-library-green border-library-green/20"
                : "bg-parchment text-red-600 border-red-100"
              }`}>
            {t.ok ? <CheckCircle size={16} /> : <AlertTriangle size={16} />}
            {t.text}
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="mb-12">
        <p className="text-[10px] font-bold uppercase tracking-widest text-dust mb-2">The Shelf</p>
        <h1 className="text-4xl font-serif font-bold text-dark-walnut mb-3">Manage Books</h1>
        <Link to="/admin" className="text-sm font-medium text-tan-oak hover:text-dark-walnut transition-colors">
          ← Admin Dashboard
        </Link>
      </div>

      <AdminNav active="manage" />

      {/* Filter tabs + search */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between mb-6">
        <div className="flex gap-1 bg-parchment border border-dust p-1 rounded-xl">
          {(["all", "active", "archived"] as FilterTab[]).map((f) => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${
                filter === f
                  ? "bg-dark-walnut text-parchment shadow-sm"
                  : "text-dust hover:text-tan-oak"
              }`}>
              {f} <span className="opacity-60">({counts[f]})</span>
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-dust" size={16} />
          <input type="text" placeholder="Search title, author, genre…"
            className="w-full pl-9 pr-4 py-2.5 bg-parchment border border-dust rounded-lg text-sm text-dark-walnut placeholder:text-dust focus:outline-none focus:border-tan-oak transition-colors"
            value={search} onChange={(e) => setSearch(e.target.value)} />
          {search && (
            <button onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-dust hover:text-tan-oak">
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* ── Batch action bar — slides in when ≥2 books selected ───────────────── */}
      {selectedIds.size >= 1 && (
        <div className="flex items-center justify-between gap-4 mb-4 px-5 py-3.5 bg-dark-walnut text-parchment rounded-xl shadow-lg">
          <div className="flex items-center gap-3">
            <span className="text-sm font-bold">
              {selectedIds.size} book{selectedIds.size !== 1 ? "s" : ""} selected
            </span>
            <button onClick={clearSelection}
              className="text-[10px] font-bold uppercase tracking-widest text-parchment/50 hover:text-parchment transition-colors">
              Clear
            </button>
          </div>
          {selectedIds.size >= 2 && (
            <button
              onClick={() => setShowBatchEdit(true)}
              className="flex items-center gap-2 bg-aged-gold text-dark-walnut px-5 py-2.5 rounded-lg font-bold text-sm hover:bg-[#C9A55A] transition-all active:scale-95 shadow-sm"
            >
              <Layers size={15} />
              Batch Edit {selectedIds.size} Books
            </button>
          )}
        </div>
      )}

      {/* Table */}
      <div className="bg-parchment border border-dust rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-dust bg-warm-linen">
              <tr>
                {/* Select-all checkbox for current page */}
                <th className="px-4 py-4 w-10">
                  <button
                    onClick={toggleSelectPage}
                    className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                      allPageSelected
                        ? "bg-dark-walnut border-dark-walnut"
                        : somePageSelected
                        ? "bg-dark-walnut/30 border-dark-walnut/50"
                        : "border-dust bg-parchment hover:border-tan-oak"
                    }`}
                    title={allPageSelected ? "Deselect page" : "Select page"}
                  >
                    {(allPageSelected || somePageSelected) && (
                      <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                        <path
                          d={allPageSelected ? "M1 4L3.5 6.5L9 1" : "M1 4h8"}
                          stroke="white" strokeWidth="1.8"
                          strokeLinecap="round" strokeLinejoin="round"
                        />
                      </svg>
                    )}
                  </button>
                </th>
                {["Title", "Author", "Genre", "Year", "Status", "Actions"].map((h) => (
                  <th key={h} className="px-5 py-4 text-[10px] font-bold uppercase tracking-widest text-dust">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-dust/40">
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 7 }).map((__, j) => (
                      <td key={j} className="px-5 py-4">
                        <div className="h-3 bg-dust/20 rounded animate-pulse" style={{ width: `${60 + (j * 7) % 30}%` }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : paginated.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-16 text-center">
                    <div className="flex flex-col items-center gap-3 text-dust">
                      <BookOpen size={36} strokeWidth={1} />
                      <p className="font-serif italic">
                        {search ? `No books match "${search}"` : "No books in this category."}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginated.map((book) => {
                  const isSelected = selectedIds.has(book.id);
                  return (
                    <tr key={book.id}
                      className={`transition-colors hover:bg-warm-linen cursor-pointer ${
                        book.status === "Archived" ? "opacity-70" : ""
                      } ${isSelected ? "bg-aged-gold/8 border-l-2 border-l-aged-gold" : ""}`}
                      onClick={() => toggleSelect(book.id)}
                    >
                      {/* Row checkbox */}
                      <td className="px-4 py-4" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => toggleSelect(book.id)}
                          className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                            isSelected
                              ? "bg-dark-walnut border-dark-walnut"
                              : "border-dust bg-parchment hover:border-tan-oak"
                          }`}
                        >
                          {isSelected && (
                            <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                              <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          )}
                        </button>
                      </td>
                      <td className="px-5 py-4" onClick={(e) => e.stopPropagation()}>
                        <span className="font-bold text-dark-walnut">{book.title}</span>
                      </td>
                      <td className="px-5 py-4 text-tan-oak" onClick={(e) => e.stopPropagation()}>{book.author}</td>
                      <td className="px-5 py-4 text-tan-oak" onClick={(e) => e.stopPropagation()}>{book.genre || "—"}</td>
                      <td className="px-5 py-4 text-tan-oak tabular-nums" onClick={(e) => e.stopPropagation()}>{book.publicationYear || "—"}</td>
                      <td className="px-5 py-4" onClick={(e) => e.stopPropagation()}>
                        <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${STATUS_BADGE[book.status]}`}>
                          {book.status}
                        </span>
                      </td>
                      <td className="px-5 py-4" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-2">
                          <button onClick={() => setEditingBook(book)}
                            className="p-2 text-dust hover:text-dark-walnut border border-dust hover:border-tan-oak rounded-lg transition-all"
                            title="Edit book">
                            <Edit size={15} />
                          </button>
                          <button onClick={() => quickArchive(book)}
                            className={`p-2 border rounded-lg transition-all ${
                              book.status === "Archived"
                                ? "text-library-green border-library-green/30 hover:bg-library-green/10"
                                : "text-dust border-dust hover:text-tan-oak hover:border-tan-oak"
                            }`}
                            title={book.status === "Archived" ? "Restore book" : "Archive book"}>
                            {book.status === "Archived" ? <RotateCcw size={15} /> : <Archive size={15} />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!loading && totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-4 border-t border-dust bg-warm-linen">
            <p className="text-[10px] font-bold uppercase tracking-widest text-dust">
              Showing {((page - 1) * PAGE_SIZE) + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
            </p>
            <div className="flex items-center gap-2">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                className="p-2 border border-dust rounded-lg text-dust hover:text-tan-oak hover:border-tan-oak disabled:opacity-30 transition-all">
                <ChevronLeft size={15} />
              </button>
              {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                const p = totalPages <= 7 ? i + 1 :
                  i === 0 ? 1 :
                  i === 6 ? totalPages :
                  page <= 4 ? i + 1 :
                  page >= totalPages - 3 ? totalPages - 6 + i :
                  page - 3 + i;
                return (
                  <button key={p} onClick={() => setPage(p)}
                    className={`w-8 h-8 rounded-lg text-sm font-bold transition-all ${
                      p === page
                        ? "bg-dark-walnut text-parchment"
                        : "text-tan-oak hover:bg-parchment border border-dust"
                    }`}>
                    {p}
                  </button>
                );
              })}
              <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                className="p-2 border border-dust rounded-lg text-dust hover:text-tan-oak hover:border-tan-oak disabled:opacity-30 transition-all">
                <ChevronRight size={15} />
              </button>
            </div>
          </div>
        )}
      </div>

      {!loading && (
        <p className="text-[10px] font-bold uppercase tracking-widest text-dust mt-4 text-right">
          {filtered.length} book{filtered.length !== 1 ? "s" : ""} found
          {filter !== "all" ? ` · filter: ${filter}` : ""}
          {search ? ` · search: "${search}"` : ""}
        </p>
      )}

      {/* Single book edit modal */}
      {editingBook && (
        <EditModal
          book={editingBook}
          token={token!}
          onClose={() => setEditingBook(null)}
          onSaved={handleSaved}
          onDeleted={handleDeleted}
          pushToast={pushToast}
        />
      )}

      {/* Batch edit modal (US-042) */}
      {showBatchEdit && selectedBooks.length >= 2 && (
        <BatchEditModal
          selectedBooks={selectedBooks}
          token={token!}
          onClose={() => setShowBatchEdit(false)}
          onSaved={handleBatchSaved}
          pushToast={pushToast}
        />
      )}
    </div>
  );
}
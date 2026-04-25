import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { Search, Edit, Trash2, X, Check, Upload } from "lucide-react";
import axios from "axios";

interface Book {
  id: string;
  title: string;
  author: string;
  genre: string;
  publicationYear: string;
  status: "Active" | "Inactive";
  description: string;
  coverUrl: string;
}

export default function ManageBooks() {
  const [books, setBooks] = useState<Book[]>([]);
  const [search, setSearch] = useState("");
  const [editingBook, setEditingBook] = useState<Book | null>(null);
  const [loading, setLoading] = useState(true);
  const { token } = useAuth();

  const fetchBooks = async () => {
    try {
      const response = await axios.get("/api/books");
      setBooks(response.data);
    } catch (err) {
      console.error("Failed to fetch books", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBooks();
  }, []);

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this book?")) return;
    try {
      await axios.delete(`/api/admin/books/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchBooks();
    } catch (err) {
      console.error("Failed to delete book", err);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBook) return;
    try {
      const { id, ...data } = editingBook;
      await axios.put(`/api/admin/books/${id}`, data, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setEditingBook(null);
      fetchBooks();
    } catch (err) {
      console.error("Failed to update book", err);
    }
  };

  const filteredBooks = books.filter(b => 
    b.title.toLowerCase().includes(search.toLowerCase()) || 
    b.author.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-6xl mx-auto px-6 py-12">
      <div className="flex justify-between items-center mb-12">
        <div>
          <h1 className="text-4xl font-serif font-bold mb-2">Manage Books</h1>
          <Link to="/admin" className="text-sm font-medium text-blue-600 hover:underline">Admin Dashboard</Link>
        </div>
      </div>

      <div className="flex gap-4 border-b border-gray-200 mb-12">
        <Link to="/admin" className="pb-4 px-6 border-b-2 border-transparent text-gray-500 font-bold text-sm hover:text-black">Admin Dashboard</Link>
        <Link to="/admin/ingest" className="pb-4 px-6 border-b-2 border-transparent text-gray-500 font-bold text-sm hover:text-black">Ingest Books</Link>
        <Link to="/admin/manage" className="pb-4 px-6 border-b-2 border-blue-600 text-blue-600 font-bold text-sm">Manage Books</Link>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="p-6 border-b border-gray-100">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Search by title or author"
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-black"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="p-4 font-bold text-gray-500 uppercase tracking-widest text-[10px]">Title</th>
                <th className="p-4 font-bold text-gray-500 uppercase tracking-widest text-[10px]">Author</th>
                <th className="p-4 font-bold text-gray-500 uppercase tracking-widest text-[10px]">Genre</th>
                <th className="p-4 font-bold text-gray-500 uppercase tracking-widest text-[10px]">Year</th>
                <th className="p-4 font-bold text-gray-500 uppercase tracking-widest text-[10px]">Status</th>
                <th className="p-4 font-bold text-gray-500 uppercase tracking-widest text-[10px]">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredBooks.map((book) => (
                <tr key={book.id} className="hover:bg-gray-50 transition-colors">
                  <td className="p-4 font-bold">{book.title}</td>
                  <td className="p-4 text-gray-600">{book.author}</td>
                  <td className="p-4 text-gray-600">{book.genre}</td>
                  <td className="p-4 text-gray-600">{book.publicationYear}</td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${book.status === "Active" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                      {book.status}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="flex gap-2">
                      <button
                        onClick={() => setEditingBook(book)}
                        className="p-2 text-gray-500 hover:text-blue-600 border border-gray-200 rounded-lg hover:border-blue-200 transition-all"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(book.id)}
                        className="p-2 text-gray-500 hover:text-red-600 border border-gray-200 rounded-lg hover:border-red-200 transition-all"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Modal */}
      {editingBook && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[200] p-4">
          <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <h2 className="text-2xl font-serif font-bold">Edit Book</h2>
              <button onClick={() => setEditingBook(null)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleUpdate} className="flex-1 overflow-y-auto p-8 grid grid-cols-1 lg:grid-cols-2 gap-12">
              <div className="space-y-6">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">Title</label>
                  <input
                    type="text"
                    className="w-full border border-gray-200 p-3 rounded-lg text-sm focus:outline-none focus:border-black"
                    value={editingBook.title}
                    onChange={(e) => setEditingBook({ ...editingBook, title: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">Author</label>
                  <input
                    type="text"
                    className="w-full border border-gray-200 p-3 rounded-lg text-sm focus:outline-none focus:border-black"
                    value={editingBook.author}
                    onChange={(e) => setEditingBook({ ...editingBook, author: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">Publication Year</label>
                    <input
                      type="text"
                      className="w-full border border-gray-200 p-3 rounded-lg text-sm focus:outline-none focus:border-black"
                      value={editingBook.publicationYear}
                      onChange={(e) => setEditingBook({ ...editingBook, publicationYear: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">Genre</label>
                    <input
                      type="text"
                      className="w-full border border-gray-200 p-3 rounded-lg text-sm focus:outline-none focus:border-black"
                      value={editingBook.genre}
                      onChange={(e) => setEditingBook({ ...editingBook, genre: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">Description</label>
                  <textarea
                    rows={4}
                    className="w-full border border-gray-200 p-3 rounded-lg text-sm focus:outline-none focus:border-black resize-none"
                    value={editingBook.description}
                    onChange={(e) => setEditingBook({ ...editingBook, description: e.target.value })}
                  />
                </div>
                <div className="flex items-center gap-4">
                  <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Active</label>
                  <button
                    type="button"
                    onClick={() => setEditingBook({ ...editingBook, status: editingBook.status === "Active" ? "Inactive" : "Active" })}
                    className={`w-12 h-6 rounded-full transition-colors relative ${editingBook.status === "Active" ? "bg-green-500" : "bg-gray-200"}`}
                  >
                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${editingBook.status === "Active" ? "left-7" : "left-1"}`} />
                  </button>
                </div>
              </div>

              <div className="space-y-6">
                <div className="flex flex-col items-center gap-6">
                  <p className="text-xs font-bold uppercase tracking-wider text-gray-400 self-start">Cover Photo</p>
                  <div className="w-48 aspect-[2/3] bg-gray-50 rounded-xl overflow-hidden border border-gray-100 shadow-lg">
                    <img src={editingBook.coverUrl} alt="Cover" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  </div>
                  <button type="button" className="flex items-center gap-2 bg-gray-100 px-6 py-2 rounded-lg text-xs font-bold uppercase tracking-widest hover:bg-gray-200 transition-all">
                    <Upload size={14} />
                    Upload New Photo
                  </button>
                </div>
                
                <div className="pt-12 flex flex-col items-center gap-4">
                  <button type="button" onClick={() => handleDelete(editingBook.id)} className="w-full bg-red-600 text-white py-4 rounded-lg font-bold hover:bg-red-700 transition-all shadow-lg shadow-red-100">
                    Delete This Book !
                  </button>
                </div>
              </div>
            </form>

            <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end gap-4">
              <button onClick={() => setEditingBook(null)} className="px-8 py-3 rounded-lg font-bold text-sm hover:bg-gray-200 transition-all">
                Cancel
              </button>
              <button onClick={handleUpdate} className="bg-green-600 text-white px-12 py-3 rounded-lg font-bold hover:bg-green-700 transition-all shadow-lg shadow-green-100">
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

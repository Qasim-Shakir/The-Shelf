import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { Book, Users, Activity, Download } from "lucide-react";

export default function AdminDashboard() {
  const [stats, setStats] = useState({ books: 1024, users: 346, sessions: 1066 });
  const { token } = useAuth();

  return (
    <div className="max-w-6xl mx-auto px-6 py-12">
      <div className="flex justify-between items-center mb-12">
        <div>
          <h1 className="text-4xl font-serif font-bold mb-2">Admin - The Shelf</h1>
          <Link to="/library" className="text-sm font-medium text-blue-600 hover:underline">Library View</Link>
        </div>
      </div>

      <div className="mb-12">
        <h2 className="text-2xl font-bold mb-2">Admin Dashboard</h2>
        <p className="text-gray-500 mb-8">Manage the library. Choose an action.</p>
        
        <div className="flex gap-4 border-b border-gray-200 mb-12">
          <Link to="/admin" className="pb-4 px-6 border-b-2 border-black font-bold text-sm">Admin Dashboard</Link>
          <Link to="/admin/ingest" className="pb-4 px-6 border-b-2 border-transparent text-gray-500 font-bold text-sm hover:text-black">Ingest Books</Link>
          <Link to="/admin/manage" className="pb-4 px-6 border-b-2 border-transparent text-gray-500 font-bold text-sm hover:text-black">Manage Books</Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
        <div className="bg-gray-50 border border-gray-100 p-8 rounded-2xl">
          <div className="flex justify-between items-start mb-4">
            <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Total Books</p>
            <Book className="text-gray-300" size={20} />
          </div>
          <p className="text-5xl font-serif font-bold">{stats.books}</p>
        </div>
        <div className="bg-gray-50 border border-gray-100 p-8 rounded-2xl">
          <div className="flex justify-between items-start mb-4">
            <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Total Users</p>
            <Users className="text-gray-300" size={20} />
          </div>
          <p className="text-5xl font-serif font-bold">{stats.users}</p>
        </div>
        <div className="bg-gray-50 border border-gray-100 p-8 rounded-2xl">
          <div className="flex justify-between items-start mb-4">
            <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Reading Sessions</p>
            <Activity className="text-gray-300" size={20} />
          </div>
          <p className="text-5xl font-serif font-bold">{stats.sessions}</p>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
          <h3 className="font-bold">Recent Admin Activity</h3>
          <button className="text-xs font-bold uppercase tracking-widest text-gray-500 border border-gray-200 px-4 py-2 rounded-lg hover:bg-gray-50 flex items-center gap-2">
            <Download size={14} />
            Export Admin Activity
          </button>
        </div>
        <div className="p-8 space-y-6">
          <div className="flex items-start gap-4">
            <div className="w-2 h-2 rounded-full bg-orange-400 mt-2" />
            <p className="text-sm">
              <span className="font-bold text-orange-600">Book Added:</span> "Moby Dick" by Herman Melville <span className="text-gray-400 mx-2">by Admin · 2 hours ago</span>
            </p>
          </div>
          <div className="flex items-start gap-4">
            <div className="w-2 h-2 rounded-full bg-green-400 mt-2" />
            <p className="text-sm">
              <span className="font-bold text-green-600">Metadata Updated:</span> "The Odyssey" genre corrected to Epic Poetry <span className="text-gray-400 mx-2">by Admin · 5 hours ago</span>
            </p>
          </div>
          <div className="flex items-start gap-4">
            <div className="w-2 h-2 rounded-full bg-red-400 mt-2" />
            <p className="text-sm">
              <span className="font-bold text-red-600">Book Deleted:</span> "Duplicate Entry #42" removed <span className="text-gray-400 mx-2">by Admin · Yesterday</span>
            </p>
          </div>
          <div className="flex items-start gap-4">
            <div className="w-2 h-2 rounded-full bg-blue-400 mt-2" />
            <p className="text-sm">
              <span className="font-bold text-blue-600">Scrape Initiated:</span> Batch of 10 books from Project Gutenberg <span className="text-gray-400 mx-2">by Admin · Yesterday</span>
            </p>
          </div>
          <div className="flex items-start gap-4">
            <div className="w-2 h-2 rounded-full bg-orange-400 mt-2" />
            <p className="text-sm">
              <span className="font-bold text-orange-600">Book Added:</span> "Emma" by Jane Austen <span className="text-gray-400 mx-2">by Admin · 2 days ago</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

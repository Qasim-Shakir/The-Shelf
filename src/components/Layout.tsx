import React from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { cn } from "../lib/utils";

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  if (!user) return <>{children}</>;

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const navLinks = [
    { name: "Library", path: "/library" },
    { name: "Profile", path: "/profile" },
  ];

  if (user.role === "admin") {
    navLinks.push({ name: "Admin", path: "/admin" });
  }

  return (
    <div className="min-h-screen bg-warm-linen flex flex-col">
      <nav className="border-b border-dust px-6 h-20 flex justify-between items-center sticky top-0 bg-warm-linen z-50">
        <div className="flex items-center gap-12">
          <Link to="/library" className="text-3xl font-serif font-bold tracking-tight text-dark-walnut">The Shelf</Link>
          <div className="hidden md:flex items-center gap-8 text-sm font-bold">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={cn(
                  "relative py-2 transition-all",
                  location.pathname.startsWith(link.path)
                    ? "text-library-green after:absolute after:bottom-0 after:left-0 after:w-full after:h-0.5 after:bg-library-green"
                    : "text-tan-oak hover:text-dark-walnut"
                )}
              >
                {link.name}
              </Link>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={handleLogout}
            className="text-sm font-bold text-dust hover:text-tan-oak transition-colors"
          >
            Logout
          </button>
        </div>
      </nav>
      <main className="flex-1">
        {children}
      </main>
    </div>
  );
};

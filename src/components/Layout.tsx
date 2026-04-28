import React, { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { cn } from "../lib/utils";
import { Menu, X } from "lucide-react"; // Import icons for the hamburger menu

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Close mobile menu automatically when the route changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  // If there's no user, OR if we are on the Landing Page ("/"), just render the page without the global navbar!
  if (!user || location.pathname === "/" || location.pathname.toLowerCase() === "/landingpage") return <>{children}</>;

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
    <div className="min-h-screen bg-warm-linen flex flex-col relative">
      <nav className="border-b border-dust px-6 h-20 flex justify-between items-center sticky top-0 bg-warm-linen z-50">
        <div className="flex items-center gap-12">
          <Link to="/library" className="text-3xl font-serif font-bold tracking-tight text-dark-walnut">
            The Shelf
          </Link>
          
          {/* 💻 DESKTOP NAV LINKS */}
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
          {/* 💻 DESKTOP LOGOUT BUTTON */}
          <button
            onClick={handleLogout}
            className="hidden md:block text-sm font-bold text-dust hover:text-tan-oak transition-colors"
          >
            Logout
          </button>

          {/* 📱 MOBILE HAMBURGER BUTTON */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-2 -mr-2 text-dark-walnut hover:text-tan-oak transition-colors"
          >
            {isMobileMenuOpen ? <X size={26} /> : <Menu size={26} />}
          </button>
        </div>
      </nav>

      {/* 📱 MOBILE DROPDOWN MENU */}
      {isMobileMenuOpen && (
        <div className="md:hidden absolute top-20 left-0 w-full bg-warm-linen border-b border-dust shadow-xl flex flex-col z-40">
          {navLinks.map((link) => {
            const isActive = location.pathname.startsWith(link.path);
            return (
              <Link
                key={link.path}
                to={link.path}
                className={cn(
                  "px-6 py-5 text-sm font-bold border-b border-dust/40 transition-colors",
                  isActive
                    ? "text-library-green bg-dust/10"
                    : "text-tan-oak hover:bg-dust/10 hover:text-dark-walnut"
                )}
              >
                {link.name}
              </Link>
            );
          })}
          <button
            onClick={handleLogout}
            className="px-6 py-5 text-sm font-bold text-left text-red-500 hover:bg-red-50/50 transition-colors"
          >
            Logout
          </button>
        </div>
      )}

      <main className="flex-1">
        {children}
      </main>
    </div>
  );
};
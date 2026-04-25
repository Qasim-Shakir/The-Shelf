import React, { createContext, useState, useEffect, useContext, useRef, ReactNode } from "react";
import axios from "axios";

const INACTIVITY_LIMIT = 24 * 60 * 60 * 1000; // 24 hours in ms
const ACTIVITY_EVENTS = ["mousemove", "keydown", "mousedown", "touchstart", "scroll"];

interface User {
  id: string;
  username: string;
  email: string;
  role: "reader" | "admin";
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  signup: (username: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  isAuthReady: boolean;
  sessionExpired: boolean;
  clearExpired: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem("token"));
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [sessionExpired, setSessionExpired] = useState(false);
  const inactivityTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("lastActivity");
    setToken(null);
    setUser(null);
  };

  const expireSession = () => {
    logout();
    setSessionExpired(true);
  };

  const resetTimer = () => {
    localStorage.setItem("lastActivity", String(Date.now()));
    if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
    inactivityTimer.current = setTimeout(expireSession, INACTIVITY_LIMIT);
  };

  // Start/stop inactivity tracking based on whether user is logged in
  useEffect(() => {
    if (!user) {
      if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
      ACTIVITY_EVENTS.forEach(e => window.removeEventListener(e, resetTimer));
      return;
    }

    // Check if already expired based on last stored activity
    const lastActivity = localStorage.getItem("lastActivity");
    if (lastActivity && Date.now() - parseInt(lastActivity) > INACTIVITY_LIMIT) {
      expireSession();
      return;
    }

    resetTimer();
    ACTIVITY_EVENTS.forEach(e => window.addEventListener(e, resetTimer, { passive: true }));

    return () => {
      if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
      ACTIVITY_EVENTS.forEach(e => window.removeEventListener(e, resetTimer));
    };
  }, [user]);

  useEffect(() => {
    const checkAuth = async () => {
      if (token) {
        try {
          const response = await axios.get("/api/auth/me", {
            headers: { Authorization: `Bearer ${token}` }
          });
          setUser(response.data);
        } catch (error) {
          console.error("Auth check failed:", error);
          localStorage.removeItem("token");
          setToken(null);
          setUser(null);
        }
      }
      setIsAuthReady(true);
    };
    checkAuth();
  }, [token]);

  const login = async (email: string, password: string) => {
    const response = await axios.post("/api/auth/login", { email, password });
    const { token: newToken, user: newUser } = response.data;
    localStorage.setItem("token", newToken);
    localStorage.setItem("lastActivity", String(Date.now()));
    setToken(newToken);
    setUser(newUser);
    setSessionExpired(false);
  };

  const signup = async (username: string, email: string, password: string) => {
    const response = await axios.post("/api/auth/signup", { username, email, password });
    const { token: newToken, user: newUser } = response.data;
    localStorage.setItem("token", newToken);
    localStorage.setItem("lastActivity", String(Date.now()));
    setToken(newToken);
    setUser(newUser);
  };

  const clearExpired = () => setSessionExpired(false);

  return (
    <AuthContext.Provider value={{ user, token, login, signup, logout, isAuthReady, sessionExpired, clearExpired }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
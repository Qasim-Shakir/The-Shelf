import React, { createContext, useState, useEffect, useContext, ReactNode } from "react";
import axios from "axios";

// --- 1. Define Interfaces ---
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
}

// --- 2. Create the Context ---
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// --- 3. Create the Provider Component ---
export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem("token"));
  const [isAuthReady, setIsAuthReady] = useState(false);

  // Check if token is valid on mount or when token changes
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
      // Auth check is complete, safe to render the app routes now
      setIsAuthReady(true);
    };
    
    checkAuth();
  }, [token]);

  // Login function
  const login = async (email: string, password: string) => {
    // Note: No try/catch here! 
    // This allows the Login component to catch the error and show it to the user.
    const response = await axios.post("/api/auth/login", { email, password });
    const { token: newToken, user: newUser } = response.data;
    
    localStorage.setItem("token", newToken);
    setToken(newToken);
    setUser(newUser);
  };

  // Signup function
  const signup = async (username: string, email: string, password: string) => {
    const response = await axios.post("/api/auth/signup", { username, email, password });
    const { token: newToken, user: newUser } = response.data;
    
    localStorage.setItem("token", newToken);
    setToken(newToken);
    setUser(newUser);
  };

  // Logout function
  const logout = () => {
    localStorage.removeItem("token");
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, login, signup, logout, isAuthReady }}>
      {children}
    </AuthContext.Provider>
  );
};

// --- 4. Create the Custom Hook ---
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
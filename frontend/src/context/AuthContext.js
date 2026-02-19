import { createContext, useContext, useState, useCallback, useEffect } from "react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const AuthContext = createContext(null);

// Helper to get/set token in localStorage
const getStoredToken = () => localStorage.getItem("auth_token");
const setStoredToken = (token) => {
  if (token) {
    localStorage.setItem("auth_token", token);
  } else {
    localStorage.removeItem("auth_token");
  }
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const getAuthHeaders = useCallback(() => {
    const token = getStoredToken();
    if (token) {
      return { "Authorization": `Bearer ${token}` };
    }
    return {};
  }, []);

  // Check auth on mount
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const checkAuth = useCallback(async () => {
    setLoading(true);
    try {
      const token = getStoredToken();
      if (!token) {
        setUser(null);
        setLoading(false);
        return null;
      }

      const response = await fetch(`${API}/auth/me`, {
        credentials: "include",
        headers: getAuthHeaders()
      });
      if (response.ok) {
        const data = await response.json();
        const userData = JSON.parse(JSON.stringify(data));
        setUser(userData);
        return userData;
      } else {
        setStoredToken(null);
        setUser(null);
        return null;
      }
    } catch (error) {
      console.error("Auth check error:", error);
      setStoredToken(null);
      setUser(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, [getAuthHeaders]);

  const login = async (email, password) => {
    const response = await fetch(`${API}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ email, password })
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.detail || "Login failed");
    }

    // Store token in localStorage for Safari/cross-origin support
    if (data.token) {
      setStoredToken(data.token);
    }

    const userData = JSON.parse(JSON.stringify(data));
    setUser(userData);
    return userData;
  };

  const signup = async (email, name, password) => {
    const response = await fetch(`${API}/auth/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ email, name, password })
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.detail || "Signup failed");
    }

    // Store token in localStorage for Safari/cross-origin support
    if (data.token) {
      setStoredToken(data.token);
    }

    const userData = JSON.parse(JSON.stringify(data));
    setUser(userData);
    return userData;
  };

  const logout = async () => {
    try {
      await fetch(`${API}/auth/logout`, {
        method: "POST",
        credentials: "include",
        headers: getAuthHeaders()
      });
    } catch (error) {
      console.error("Logout error:", error);
    }
    setStoredToken(null);
    setUser(null);
  };

  const loginWithGoogle = () => {
    // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
    const redirectUrl = window.location.origin + "/dashboard";
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        setUser,
        loading,
        checkAuth,
        login,
        signup,
        logout,
        loginWithGoogle,
        getAuthHeaders
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

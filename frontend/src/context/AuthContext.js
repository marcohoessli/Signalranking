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

  // Check auth on mount
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const login = async (email, password) => {
    try {
      const response = await fetch(`${API}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password })
      });

      // Clone the response so we can read it multiple times if needed
      const clonedResponse = response.clone();
      
      let data;
      try {
        data = await response.json();
      } catch (jsonError) {
        // If JSON parsing fails, try to get text for better error message
        const text = await clonedResponse.text();
        throw new Error(`Invalid response from server: ${text.substring(0, 100)}`);
      }
      
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
    } catch (error) {
      console.error("Login error:", error);
      throw error;
    }
  };

  const signup = async (email, name, password) => {
    try {
      const response = await fetch(`${API}/auth/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, name, password })
      });

      // Clone the response so we can read it multiple times if needed
      const clonedResponse = response.clone();
      
      let data;
      try {
        data = await response.json();
      } catch (jsonError) {
        // If JSON parsing fails, try to get text for better error message
        const text = await clonedResponse.text();
        throw new Error(`Invalid response from server: ${text.substring(0, 100)}`);
      }
      
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
    } catch (error) {
      console.error("Signup error:", error);
      throw error;
    }
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

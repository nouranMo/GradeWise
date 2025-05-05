import React, { createContext, useContext, useState, useEffect } from "react";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check if user is logged in on initial load
  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user"));
    if (user) {
      // If role is in an array, extract the first element
      if (Array.isArray(user.role)) {
        user.role = user.role[0];
      }
      setCurrentUser(user);
    }
    setLoading(false);
  }, []);

  // Login function
  const login = (userData) => {
    // If role is in an array, extract the first element
    if (userData && Array.isArray(userData.role)) {
      userData.role = userData.role[0];
    }
    localStorage.setItem("user", JSON.stringify(userData));
    setCurrentUser(userData);
  };

  // Logout function
  const logout = () => {
    localStorage.removeItem("user");
    setCurrentUser(null);
  };

  // Check if user is a professor
  const isProfessor = () => {
    if (!currentUser) return false;
    if (Array.isArray(currentUser.role)) {
      return currentUser.role.includes("PROFESSOR");
    }
    return currentUser.role === "PROFESSOR";
  };

  // Check if user is a student
  const isStudent = () => {
    if (!currentUser) return false;
    if (Array.isArray(currentUser.role)) {
      return currentUser.role.includes("STUDENT");
    }
    return currentUser.role === "STUDENT";
  };

  // Check if user is admin
  const isAdmin = () => {
    return currentUser?.email === "admin@gmail.com";
  };

  const value = {
    currentUser,
    login,
    logout,
    isProfessor,
    isStudent,
    isAdmin,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

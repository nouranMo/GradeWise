import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export const ProtectedRoute = ({ children, requiredRole }) => {
  const { currentUser, isProfessor, isStudent, isAdmin } = useAuth();
  console.log("ProtectedRoute checking access for:", currentUser, "required role:", requiredRole);

  // Check if user is logged in
  if (!currentUser) {
    console.log("No current user, redirecting to login");
    return <Navigate to="/login" />;
  }

  // Special case for admin - allow access to any route
  if (currentUser.email === "admin@gmail.com") {
    console.log("Admin access granted");
    return children;
  }

  // Role-based checks
  if (requiredRole === 'PROFESSOR' && !isProfessor()) {
    console.log("Professor access denied");
    return <Navigate to="/dashboard" />;
  }

  if (requiredRole === 'STUDENT' && !isStudent()) {
    console.log("Student access denied");
    return <Navigate to="/professor" />;
  }

  if (requiredRole === 'ADMIN' && !isAdmin()) {
    console.log("Admin access denied");
    return <Navigate to="/dashboard" />;
  }

  console.log("Access granted");
  return children;
}; 
import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { AuthProvider } from "contexts/AuthContext";
import { ProtectedRoute } from "components/ProtectedRoute";
import config from "./config";

import LandingPage from "pages/LandingPage";
import StudentDashboard from "pages/StudentDashboard";
import ProfessorDashboard from "pages/ProfessorDashboard";
import Report from "pages/Report";
import LoginPage from "pages/auth/LoginPage";
import Signup from "pages/auth/Signup";
import UMLparsing from "components/uml/UMLparsing";
import SectionExtraction from "components/uml/sectionExtraction";
import ParsingResultPage from "pages/ParsingResultPage";
import UMLReport from "components/uml/UMLReport";
import AdminPanel from "pages/AdminPanel";
import Profile from "pages/account/Profile";

function App() {
  console.log("App rendering with routes including /admin");
  
  return (
    <GoogleOAuthProvider clientId={config.GOOGLE_CLIENT_ID}>
      <AuthProvider>
        <Router>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<Signup />} />

            {/* Protected Student Routes */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute requiredRole="STUDENT">
                  <StudentDashboard />
                </ProtectedRoute>
              }
            />

            {/* Protected Professor Routes */}
            <Route
              path="/professor"
              element={
                <ProtectedRoute requiredRole="PROFESSOR">
                  <ProfessorDashboard />
                </ProtectedRoute>
              }
            />

            {/* Routes that need authentication but not specific role */}
            <Route

              path="/account/profile"
              element={
                <ProtectedRoute>
                  {({ userData }) => <Profile userData={userData} />}
                </ProtectedRoute>
              }
            />
            <Route

              path="/report"
              element={
                <ProtectedRoute>
                  <Report />
                </ProtectedRoute>
              }
            />
            <Route
              path="/umlparsing"
              element={
                <ProtectedRoute>
                  <UMLparsing />
                </ProtectedRoute>
              }
            />
            <Route
              path="/sectionextraction"
              element={
                <ProtectedRoute>
                  <SectionExtraction />
                </ProtectedRoute>
              }
            />
            <Route
              path="/umlreport"
              element={
                <ProtectedRoute>
                  <UMLReport />
                </ProtectedRoute>
              }
            />
            <Route
              path="/parsing-result"
              element={
                <ProtectedRoute>
                  <ParsingResultPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin"
              element={
                <ProtectedRoute requiredRole="ADMIN">
                  {console.log("Admin route accessed")}
                  <AdminPanel />
                </ProtectedRoute>
              }
            />
          </Routes>
        </Router>
      </AuthProvider>
    </GoogleOAuthProvider>
  );
}

export default App;

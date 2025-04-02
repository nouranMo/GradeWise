import React from "react";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";

import LandingPage from "pages/LandingPage";
import Dashboard from "pages/Dashboard";
import ProfessorDashboard from "pages/ProfessorDashboard";
import Report from "pages/Report";
import LoginPage from "pages/auth/LoginPage";
import Signup from "pages/auth/Signup";
import UMLparsing from "components/uml/UMLparsing";
import SectionExtraction from "components/uml/sectionExtraction";
import ParsingResultPage from "pages/ParsingResultPage";
import UMLReport from "components/uml/UMLReport";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { AuthProvider } from "contexts/AuthContext";

function App() {
  console.log("Client ID:", process.env.REACT_APP_GOOGLE_CLIENT_ID);
  return (
    <GoogleOAuthProvider clientId="296280424100-h6ufvnc9fqg0rco9rfql3o4ppt5tlpic.apps.googleusercontent.com">
      <AuthProvider>
        <Router>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/dashboard" element={<Dashboard />} />

            {/* /professor should be merged with /dashboard with a condition that checks role */}
            <Route path="/professor" element={<ProfessorDashboard />} />

            <Route path="/report" element={<Report />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/umlparsing" element={<UMLparsing />} />
            <Route path="/sectionextraction" element={<SectionExtraction />} />
            <Route path="/umlreport" element={<UMLReport />} />
            <Route path="/parsing-result" element={<ParsingResultPage />} />
          </Routes>
        </Router>
      </AuthProvider>
    </GoogleOAuthProvider>
  );
}

export default App;

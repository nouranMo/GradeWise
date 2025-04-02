import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { AuthProvider } from "contexts/AuthContext";

import LandingPage from "pages/LandingPage";
import Dashboard from "pages/Dashboard";
import Report from "pages/Report";
import LoginPage from "pages/auth/LoginPage";
import Signup from "pages/auth/Signup";
import UMLparsing from "components/uml/UMLparsing";
import SectionExtraction from "components/uml/sectionExtraction";
import ParsingResultPage from "pages/ParsingResultPage";
import UMLReport from "components/uml/UMLReport";

function App() {
  return (
    <GoogleOAuthProvider clientId={process.env.REACT_APP_GOOGLE_CLIENT_ID}>
      <AuthProvider>
        <Router>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/dashboard" element={<Dashboard />} />
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

import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';

import LandingPage from './components/LandingPage';
// import Navbar from './components/Navbar';
import Homepage from './components/Homepage';
import Report from './components/Report';
import LoginPage from './components/LoginPage';
import RegisterPage from './components/RegisterPage';
import Signup from './components/Signup';
import UMLparsing from './components/UMLparsing';
import SectionExtraction from './components/sectionExtraction';
import UMLReport from './components/UMLReport';
function App() {
    return (
      <Router>
        {/* <Navbar /> */}
        <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/homepage" element={<Homepage />} />
            <Route path="/report" element={<Report />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/umlparsing" element={<UMLparsing />} />
            <Route path="/sectionextraction" element={<SectionExtraction />} />
            <Route path="/umlreport" element={<UMLReport />} />
        </Routes>
      </Router>
    );
  }

export default App;

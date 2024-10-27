import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';

import LandingPage from './components/LandingPage';
// import Navbar from './components/Navbar';
import Homepage from './components/Homepage';
import LoginPage from './components/LoginPage';
import RegisterPage from './components/RegisterPage';
import Signup from './components/Signup';

function App() {
    return (
      <Router>
        {/* <Navbar /> */}
        <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/homepage" element={<Homepage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/signup" element={<Signup />} />
        </Routes>
      </Router>
    );
  }

export default App;

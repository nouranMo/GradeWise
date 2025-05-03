import React from "react";
import Navbar from "components/layout/Navbar/Navbar";
import Hero from "pages/sections/landing/Hero";
import About from "pages/sections/landing/About";
import Steps from "pages/sections/landing/Steps";
import Team from "pages/sections/landing/Team";
import LastCall from "pages/sections/landing/LastCall";
import Footer from "components/layout/Footer/Footer";
import { Link } from "react-router-dom";

function LandingPage() {
  return (
    <main className="flex min-h-screen flex-col bg-gray-50">
      <Navbar />
      <Hero />
      <About />
      <Steps />
      <Team />
      <LastCall />
      <div className="mt-4">
        <Link 
          to="/admin" 
          className="text-blue-600 hover:text-blue-800 underline"
        >
          Admin Panel Access
        </Link>
      </div>
      <Footer />
    </main>
  );
}

export default LandingPage;

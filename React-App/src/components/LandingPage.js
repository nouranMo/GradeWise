import React from "react";
import Navbar from "./Navbar";
import Hero from "./sections/Hero";
import About from "./sections/About";
import Steps from "./sections/Steps";
import Team from "./sections/Team";
import LastCall from "./sections/LastCall";
import Footer from "./Footer";

function LandingPage() {
  return (
    <main className="flex min-h-screen flex-col bg-gray-50">
      <Navbar />
      <Hero />
      <About />
      <Steps />
      <Team />
      <LastCall />
      <Footer />
    </main>
  );
}

export default LandingPage;

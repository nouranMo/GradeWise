import { Link } from "react-router-dom";
import landingImage from "../../images/landing.png";
import logo from "../../images/logo.png";

function HeroSection() {
  return (
    <div className="relative h-screen bg-gradient-to-tl from-sky-950 to-sky-600 px-[10%]">
      {/* Background Layer */}
      <div className="absolute inset-0 bg-sky-900 z-0"></div>
      <div className="absolute bg-sky-500 w-72 h-72 rounded-full opacity-40 blur-3xl top-10 left-10 z-0"></div>
      <div className="absolute bg-sky-700 w-64 h-64 rounded-full opacity-40 blur-3xl bottom-10 right-10 z-0"></div>

      {/* Page Content */}
      <div className="relative z-10 flex flex-row justify-between items-center h-full">
        <div className="flex flex-col justify-center items-center w-[50%] gap-16">
          {/* Header with logo and link */}
          <div className="flex flex-row justify-start items-center gap-2">
            <img src={logo} alt="logo" className="w-[6%]" />
            <Link to="/">
              <h1 className="font-mono text-2xl text-sky-100">Doc Checker</h1>
            </Link>
          </div>

          {/* Hero Text */}
          <p className="font-poppins text-5xl text-sky-100">
            WE AUTO-CHECK YOUR SRS/SDD DOCUMENTS.
          </p>

          {/* CTA Button */}
          <Link to="/login" className="self-start">
          <button className="px-8 py-3 text-lg border-2 border-sky-950 bg-white text-sky-950 rounded-lg hover:bg-sky-950 hover:text-sky-100 hover:shadow-md transition duration-300">
              Start Uploading
          </button>
          </Link>
        </div>

        {/* Image Section */}
        <div>
          <img src={landingImage} alt="Doc Checker" />
        </div>
      </div>
    </div>
  );
}

export default HeroSection;

import { Link } from "react-router-dom";
import landingImage from "../../images/landing.png";
import logo from "../../images/logo.png";

function HeroSection() {
  return (
    <div className="flex flex-row justify-between items-center h-screen bg-gradient-to-tl from-sky-950 to-sky-600 px-[10%]">
      <div className="flex flex-col justify-center items-center w-[50%] gap-16">
        {/* Header with logo and link */}
        <div className="flex flex-row justify-start items-center gap-2">
          <img src={logo} alt="file" className="w-[6%]" />
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
          <button className="px-10 py-3 text-lg hover:bg-sky-950 hover:text-sky-100 border-none bg-white text-sky-950">
            Start Uploading
          </button>
        </Link>
      </div>

      {/* Image Section */}
      <div>
        <img src={landingImage} alt="Doc Checker" />
      </div>
    </div>
  );
}

export default HeroSection;
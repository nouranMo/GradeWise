import React from 'react';
import { Link } from 'react-router-dom';
import { useLocation } from 'react-router-dom';
import logo from '../images/logo.png';

function Navbar() {
  const location = useLocation();
  const isLoginPage = location.pathname === '/login';
  const isRegisterPage = location.pathname === '/register';
  const isHomepage = location.pathname === '/homepage';
  const isReportPage = location.pathname === '/report';
  const isUMLparsing = location.pathname === '/umlparsing';
  const isSectionExtraction = location.pathname === '/sectionextraction';

  return (
    <nav class="relative z-20 flex justify-between items-center p-4 text-white pb-[5%] mx-[10%]">
      {/* <img src={logo} alt="logo" /> */}
      <Link to="/"><h1 className='doc-checker'>Doc Checker</h1></Link>
      {(!isLoginPage && !isHomepage && !isRegisterPage && !isReportPage && !isUMLparsing && !isSectionExtraction) && <Link to="/login"><button>Login</button></Link>}

      {(isHomepage || isReportPage || isUMLparsing || isSectionExtraction) && <Link to="/"><button>NF</button></Link>}
    </nav>
  );
}

export default Navbar;
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

  return (
    <nav class="navbar">
      {/* <img src={logo} alt="logo" /> */}
      <Link to="/"><h1 className='doc-checker'>Doc Checker</h1></Link>
      {(!isLoginPage && !isHomepage && !isRegisterPage && !isReportPage) && <Link to="/login"><button>Login</button></Link>}

      {(isHomepage || isReportPage) && <Link to="/"><button>NF</button></Link>}
    </nav>
  );
}

export default Navbar;
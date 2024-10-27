import React from 'react';
import { Link } from 'react-router-dom';
import { useLocation } from 'react-router-dom';

function Navbar() {
  const location = useLocation();
  const isLoginPage = location.pathname === '/login';
  const isRegisterPage = location.pathname === '/register';
  const isHomepage = location.pathname === '/homepage';

  return (
    <nav>
      <Link to="/"><h1 className='doc-checker'>Doc Checker</h1></Link>
      {(!isLoginPage && !isHomepage && !isRegisterPage) && <Link to="/login"><button>Login</button></Link>}

      {(isHomepage) && <Link to="/"><button>NF</button></Link>}
    </nav>
  );
}

export default Navbar;
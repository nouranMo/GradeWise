import React from 'react';
import { Link } from 'react-router-dom';
import Navbar from './Navbar';

function RegisterPage() {
  return (
    <div className="relative h-screen p-0 m-0 bg-gradient-to-tl from-sky-950 to-sky-600">
      {/* Background Layer */}
      <div className="absolute inset-0 bg-sky-900"></div>
      <div className="absolute bg-sky-500 w-72 h-72 rounded-full opacity-40 blur-3xl top-10 left-10"></div>
      <div className="absolute bg-sky-700 w-64 h-64 rounded-full opacity-40 blur-3xl bottom-10 right-10"></div>

      {/* Page Content */}
      <div className="pt-2">
        <Navbar />
      </div>
      <div className="relative z-10 w-[80%] sm:w-[70%] md:w-[50%] lg:w-[40%] mx-auto shadow-2xl text-sky-100 bg-white bg-opacity-20 rounded-lg p-6">
        <h2 className="text-center text-xl mb-8 text-sky-100">Hi there!</h2>
        <form className="flex flex-col justify-center items-center gap-6 w-[80%] mx-auto">
          <div className="w-full">
            <label className="text-sky-100 text-sm font-poppins mb-2">EMAIL</label>
            <input className="border border-solid border-sky-300 bg-transparent text-sky-100 p-3 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-sky-500 text-sm" type="email" />
          </div>

          <div className="w-full">
            <label className="text-sky-100 text-sm font-poppins mb-2">PASSWORD</label>
            <input className="border border-solid border-sky-300 bg-transparent text-sky-100 p-3 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-sky-500 text-sm" type="password" />
          </div>

          <div className="w-full">
            <label className="text-sky-100 text-sm font-poppins mb-2">CONFIRM PASSWORD</label>
            <input className="border border-solid border-sky-300 bg-transparent text-sky-100 p-3 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-sky-500 text-sm" type="password" />
          </div>

          <Link to="/homepage" className="w-full">
            <button className="mt-6 bg-sky-500 text-white px-5 py-2 rounded-lg hover:bg-sky-600 transition-all duration-300 w-full text-sm shadow-md" type="submit">Register</button>
          </Link>

          <div className="self-start w-fit mt-6">
            <p className="text-sm text-sky-100">Already have an account?</p>
            <p className="text-sky-100 hover:font-bold w-fit"><Link to='/login'>Login</Link></p>
          </div>
        </form>
      </div>
    </div>
  );
}

export default RegisterPage;

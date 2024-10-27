import React from 'react';
import { Link } from 'react-router-dom';
import Navbar from './Navbar';

function RegisterPage() {
  return (
    <div class="m-0 p-0 h-screen bg-gradient-to-tl from-sky-800 to-sky-400">
      <Navbar />
      <div class="w-[50%] h-[60%] mx-auto mt-32 shadow-2xl text-sky-950 text-sm bg-white rounded-md">
        <h2 class="text-center text-xl mb-4 pt-12">Hi there!</h2>
        <form class="flex flex-col justify-center items-center gap-4 w-[80%] mx-auto">
          <div class="w-full">
            <p>EMAIL</p>
            <input class="border border-sky-950 w-full h-10 focus:outline-none focus:border-2 p-3" type="email"/>
          </div>
          <div class="w-full">
            <p>PASSWORD</p>
            <input class="border border-sky-950 w-full h-10 focus:outline-none focus:border-2 p-3" type="password"/>
          </div>
          <div class="w-full">
            <p>CONFIRM PASSWORD</p>
            <input class="border border-sky-950 w-full h-10 focus:outline-none focus:border-2 p-3" type="password"/>
          </div>
          <button class="border border-sky-950 w-full h-10 bg-white text-sky-950 hover:bg-sky-950 hover:text-white" type="submit">Register</button>
          <div class="self-start">
            <p class="text-xs">Already have an account?</p>
            <p class="text-sky-950 hover:font-bold w-fit"><Link to='/login'>Login</Link></p>
          </div>
        </form>
      </div>
    </div>
  );
}

export default RegisterPage; 
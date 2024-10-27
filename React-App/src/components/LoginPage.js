import React from 'react';
import { Link } from 'react-router-dom';
import Navbar from './Navbar';

function LoginPage() {
  return (
    <div class="m-0 p-0 h-screen bg-gradient-to-tl from-sky-800 to-sky-400">
      <Navbar />
      <div class="w-[50%] h-[60%] mx-auto mt-32 shadow-2xl text-sky-950 text-sm bg-white rounded-md">
        <h2 class="text-center text-xl mb-10 pt-12">Welcome back!</h2>
        <form class="flex flex-col justify-center items-center gap-4 w-[80%] mx-auto">
          <div class="w-full">
            <p>EMAIL</p>
            <input class="border border-sky-950 w-full h-10 focus:outline-none focus:border-2 p-3" type="email"/>
          </div>
          <div class="w-full">
            <p>PASSWORD</p>
            <input class="border border-sky-950 w-full h-10 focus:outline-none focus:border-2 p-3" type="password"/>
            <p class="text-xs mt-2 hover:cursor-pointer hover:font-semibold text-sky-950 w-fit">Forgot your password?</p>
          </div>
          <button class="border border-sky-950 w-full h-10 bg-white text-sky-950 hover:bg-sky-950 hover:text-white" type="submit">Log In</button>
          <div class="self-start w-fit">
            <p class="text-xs">Need an account?</p>
            <p class="text-sky-950 hover:font-bold w-fit"><Link to='/register'>Register</Link></p>
          </div>
        </form>
      </div>
    </div>
  );
}

export default LoginPage; 
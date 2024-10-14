import React, { useState } from 'react';
import axios from 'axios';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const Signup = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const validateEmail = (email) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(String(email).toLowerCase());
  };

  const handleSignup = async (e) => {
    e.preventDefault();

    // Frontend validation
    if (!email || !password || !confirmPassword) {
      toast.error('All fields are required.');
      return;
    }
    if (!validateEmail(email)) {
      toast.error('Please enter a valid email.');
      return;
    }
    if (password !== confirmPassword) {
      toast.error('Passwords do not match.');
      return;
    }

    // Send request to backend
    try {
      const response = await axios.post('http://localhost:8080/api/users/signup', {
        email,
        password,
      });
      toast.success('User registered successfully');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error during registration');
    }
  };

  return (
    <div className="signup-container" style={{ maxWidth: '400px', margin: 'auto' }}>
      <h2>Signup</h2>
      <form onSubmit={handleSignup}>
        <div style={{ marginBottom: '10px' }}>
          <label>Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{ width: '100%', padding: '8px' }}
          />
        </div>
        <div style={{ marginBottom: '10px' }}>
          <label>Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ width: '100%', padding: '8px' }}
          />
        </div>
        <div style={{ marginBottom: '10px' }}>
          <label>Confirm Password</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            style={{ width: '100%', padding: '8px' }}
          />
        </div>
        <button type="submit" style={{ padding: '10px 20px', width: '100%' }}>
          Signup
        </button>
      </form>

      <ToastContainer />
    </div>
  );
};

export default Signup;

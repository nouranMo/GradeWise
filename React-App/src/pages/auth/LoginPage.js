import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useNavigate } from "react-router-dom";
import { GoogleLogin } from "@react-oauth/google";
import loginImage from "assets/images/lean-guy.png";
import facebookLogo from "assets/images/facebook.svg";
import linkedinLogo from "assets/images/linkedin.svg";
import showImage from "assets/images/show.svg";
import hideImage from "assets/images/hide.svg";

const LoginPage = () => {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isFacebookLoading, setIsFacebookLoading] = useState(false);
  const [isLinkedInLoading, setIsLinkedInLoading] = useState(false);

  const [errors, setErrors] = useState({
    email: "",
    password: "",
  });

  const [isDirty, setIsDirty] = useState({
    email: false,
    password: false,
  });

  const [isFormValidated, setIsFormValidated] = useState(false);

  useEffect(() => {
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const isEmailValid = email && emailPattern.test(email);
    const isPasswordValid = password && password.length >= 6;

    // Set form validation immediately based on current values
    setIsFormValidated(isEmailValid && isPasswordValid);

    // Handle error messages with delay
    if (!email) {
      setErrors((prev) => ({ ...prev, email: "" }));
    } else if (!isEmailValid && isDirty.email) {
      const timeoutId = setTimeout(() => {
        setErrors((prev) => ({
          ...prev,
          email: "Please enter a valid email address",
        }));
      }, 500);
      return () => clearTimeout(timeoutId);
    } else {
      setErrors((prev) => ({ ...prev, email: "" }));
    }

    if (!password) {
      setErrors((prev) => ({ ...prev, password: "" }));
    } else if (!isPasswordValid && isDirty.password) {
      const timeoutId = setTimeout(() => {
        setErrors((prev) => ({
          ...prev,
          password: "Password must be at least 6 characters",
        }));
      }, 500);
      return () => clearTimeout(timeoutId);
    } else {
      setErrors((prev) => ({ ...prev, password: "" }));
    }
  }, [email, password, isDirty.email, isDirty.password]);

  const handleEmailChange = (e) => {
    setEmail(e.target.value);
    setIsDirty((prev) => ({ ...prev, email: true }));
  };

  const handlePasswordChange = (e) => {
    setPassword(e.target.value);
    setIsDirty((prev) => ({ ...prev, password: true }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isFormValidated) return;

    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
    }, 1000);
  };

  const handleGoogleLogin = async (credentialResponse) => {
    setIsGoogleLoading(true);
    try {
      const response = await fetch("http://localhost:5000/auth/google", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          credential: credentialResponse.credential,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem("token", data.token);
        toast.success("Successfully logged in!");
        navigate("/dashboard");
      } else {
        throw new Error(data.message || "Login failed");
      }
    } catch (error) {
      console.error(error);
      toast.error(error.message || "Failed to login with Google");
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleFacebookLogin = async () => {
    setIsFacebookLoading(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      toast.info("Facebook login coming soon!");
    } catch (error) {
      toast.error("Facebook login failed. Please try again.");
    } finally {
      setIsFacebookLoading(false);
    }
  };

  const handleLinkedInLogin = async () => {
    setIsLinkedInLoading(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      toast.info("LinkedIn login coming soon!");
    } catch (error) {
      toast.error("LinkedIn login failed. Please try again.");
    } finally {
      setIsLinkedInLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-50 items-center justify-center px-4 md:px-0">
      <div className="flex items-center justify-center w-full md:w-auto md:-translate-x-20">
        <div className="hidden md:flex items-center justify-center translate-y-16">
          <img src={loginImage} alt="login image" className="w-[160px]" />
        </div>

        <div className="bg-white p-4 sm:p-8 rounded-lg shadow-md w-screen h-screen md:w-[600px] min-h-[650px] md:h-[700px] flex flex-col justify-center">
          <h2 className="text-xl sm:text-2xl text-center mb-6 sm:mb-10">
            Log In
          </h2>

          {/* Social Login Buttons Container */}
          <div className="flex flex-col gap-4 mb-6">
            {/* Google Login Button */}
            <div className="w-full h-[44px]">
              <GoogleLogin
                onSuccess={handleGoogleLogin}
                onError={() => {
                  toast.error("Login Failed");
                  setIsGoogleLoading(false);
                }}
                useOneTap
                type="standard"
                theme="outline"
                size="large"
                width="100%"
                text="continue_with"
                shape="rectangular"
              />
            </div>

            {/* Facebook Login Button */}
            <button
              onClick={handleFacebookLogin}
              disabled={isFacebookLoading}
              className="w-full h-[44px] relative bg-[#176AE6] text-white rounded-lg hover:ring-1 hover:ring-blue-400 transition-all duration-200 disabled:opacity-50"
            >
              {isFacebookLoading ? (
                <div className="flex items-center justify-center w-full">
                  <div
                    className="w-6 h-6 border-2 border-t-transparent border-white rounded-full animate-spin"
                    style={{ animationDuration: "0.6s" }}
                  />
                </div>
              ) : (
                <div className="absolute left-3 top-1/2 -translate-y-1/2">
                  <img
                    src={facebookLogo}
                    alt="Facebook logo"
                    className="w-5 h-5"
                  />
                </div>
              )}
              <div className="w-full text-center text-sm">
                Continue with Facebook
              </div>
            </button>

            {/* LinkedIn Login Button */}
            <button
              onClick={handleLinkedInLogin}
              disabled={isLinkedInLoading}
              className="w-full h-[44px] relative bg-white border border-gray-300 text-gray-700 rounded-lg hover:ring-1 hover:ring-[#007bb5] transition-all duration-200 disabled:opacity-50"
            >
              {isLinkedInLoading ? (
                <div className="flex items-center justify-center w-full">
                  <div
                    className="w-6 h-6 border-2 border-t-transparent border-[#007bb5] rounded-full animate-spin"
                    style={{ animationDuration: "0.6s" }}
                  />
                </div>
              ) : (
                <div className="absolute left-2 top-1/2 -translate-y-1/2">
                  <img
                    src={linkedinLogo}
                    alt="LinkedIn logo"
                    className="w-6 h-6"
                  />
                </div>
              )}
              <div className="w-full text-center text-sm">
                Continue with LinkedIn
              </div>
            </button>
          </div>

          <div className="flex items-center mb-6">
            <hr className="flex-grow border-t border-gray-300" />
            <span className="mx-2 text-gray-500">Or</span>
            <hr className="flex-grow border-t border-gray-300" />
          </div>

          {/* Email/Password Form */}
          <form onSubmit={handleSubmit} noValidate>
            <div className="mb-4">
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={handleEmailChange}
                className={`mt-1 block w-full p-2 sm:p-3 border rounded-lg transition-all duration-200 ${
                  errors.email && isDirty.email
                    ? "border-red-500 focus:ring-red-500"
                    : "border-gray-300 focus:ring-black"
                } focus:border-none focus:ring-1`}
              />
              {errors.email && isDirty.email && (
                <p className="mt-1 text-sm text-red-500">{errors.email}</p>
              )}
            </div>

            <div className="mb-6">
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700"
              >
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={handlePasswordChange}
                  className={`mt-1 block w-full p-2 sm:p-3 border rounded-lg transition-all duration-200 ${
                    errors.password && isDirty.password
                      ? "border-red-500 focus:ring-red-500"
                      : "border-gray-300 focus:ring-black"
                  } focus:border-none focus:ring-1`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  <img
                    src={showPassword ? showImage : hideImage}
                    alt={showPassword ? "Hide password" : "Show password"}
                    className="w-5 h-5"
                  />
                </button>
              </div>
              {errors.password && isDirty.password && (
                <p className="mt-1 text-sm text-red-500">{errors.password}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={!isFormValidated || isLoading}
              className={`w-full rounded-md font-medium bg-[#ff6464] text-white px-5 py-2.5 text-sm transition-all duration-500 ${
                !isFormValidated || isLoading
                  ? "bg-gray-200 text-gray-400 border-gray-200 cursor-not-allowed"
                  : "text-white hover:bg-[#ff4444]"
              }`}
            >
              {isLoading ? (
                <div className="flex items-center justify-center w-full">
                  <div
                    className="w-4 h-4 border-2 border-t-transparent border-gray-400 rounded-full animate-spin"
                    style={{ animationDuration: "0.6s" }}
                  />
                </div>
              ) : (
                "Log in"
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-sm sm:text-base">
            Don't have an account?{" "}
            <Link to="/signup" className="text-[#ff6464] hover:underline">
              Sign up here
            </Link>
          </p>
        </div>
      </div>
      <ToastContainer />
    </div>
  );
};

export default LoginPage;

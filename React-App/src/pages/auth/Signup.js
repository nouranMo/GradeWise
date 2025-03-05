import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { GoogleLogin } from "@react-oauth/google";
import facebookLogo from "assets/images/facebook.svg";
import linkedinLogo from "assets/images/linkedin.svg";
import signupImage from "assets/images/lean-girl.png"

const SignUpPage = () => {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isFacebookLoading, setIsFacebookLoading] = useState(false);
  const [isLinkedInLoading, setIsLinkedInLoading] = useState(false);

  const [errors, setErrors] = useState({
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [successes, setSuccesses] = useState({
    email: false,
    password: false,
    confirmPassword: false,
  });

  const [isDirty, setIsDirty] = useState({
    email: false,
    password: false,
    confirmPassword: false,
  });

  const [isFormValidated, setIsFormValidated] = useState(false);

  useEffect(() => {
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!email) {
      setErrors((prev) => ({ ...prev, email: "" }));
      setSuccesses((prev) => ({ ...prev, email: false }));
      return;
    }

    if (emailPattern.test(email)) {
      setErrors((prev) => ({ ...prev, email: "" }));
      setSuccesses((prev) => ({ ...prev, email: true }));
    } else if (isDirty.email) {
      const timeoutId = setTimeout(() => {
        setErrors((prev) => ({
          ...prev,
          email: "Please enter a valid email address",
        }));
        setSuccesses((prev) => ({ ...prev, email: false }));
      }, 500);
      return () => clearTimeout(timeoutId);
    }
  }, [email, isDirty.email]);

  useEffect(() => {
    if (!password) {
      setErrors((prev) => ({ ...prev, password: "" }));
      setSuccesses((prev) => ({ ...prev, password: false }));
      return;
    }

    const hasMinLength = password.length >= 6;
    const hasNumber = /\d/.test(password);

    if (hasMinLength && hasNumber) {
      setErrors((prev) => ({ ...prev, password: "" }));
      setSuccesses((prev) => ({ ...prev, password: true }));
    } else if (isDirty.password) {
      const timeoutId = setTimeout(() => {
        setErrors((prev) => ({
          ...prev,
          password:
            "Password must be at least 6 characters with a number included",
        }));
        setSuccesses((prev) => ({ ...prev, password: false }));
      }, 500);
      return () => clearTimeout(timeoutId);
    }
  }, [password, isDirty.password]);

  useEffect(() => {
    if (!confirmPassword) {
      setErrors((prev) => ({ ...prev, confirmPassword: "" }));
      setSuccesses((prev) => ({ ...prev, confirmPassword: false }));
      return;
    }

    if (confirmPassword === password && password !== "") {
      setErrors((prev) => ({ ...prev, confirmPassword: "" }));
      setSuccesses((prev) => ({ ...prev, confirmPassword: true }));
    } else if (isDirty.confirmPassword) {
      const timeoutId = setTimeout(() => {
        setErrors((prev) => ({
          ...prev,
          confirmPassword: "Passwords do not match",
        }));
        setSuccesses((prev) => ({ ...prev, confirmPassword: false }));
      }, 500);
      return () => clearTimeout(timeoutId);
    }
  }, [confirmPassword, password, isDirty.confirmPassword]);

  useEffect(() => {
    const isValid =
      successes.email && successes.password && successes.confirmPassword;

    const timeoutId = setTimeout(() => {
      setIsFormValidated(isValid);
    }, 500);
    return () => clearTimeout(timeoutId);
  }, [successes]);

  const handleEmailChange = (e) => {
    setEmail(e.target.value);
    setIsDirty((prev) => ({ ...prev, email: true }));
  };

  const handlePasswordChange = (e) => {
    setPassword(e.target.value);
    setIsDirty((prev) => ({ ...prev, password: true }));
  };

  const handleConfirmPasswordChange = (e) => {
    setConfirmPassword(e.target.value);
    setIsDirty((prev) => ({ ...prev, confirmPassword: true }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isFormValidated) return;

    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      toast.success("Account created successfully!");
      navigate("/dashboard");
    }, 1500);
  };

  const handleGoogleLogin = async (credentialResponse) => {
    setIsGoogleLoading(true);
    try {
      // Add your Google sign-in logic here
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
        toast.success("Successfully signed up!");
        navigate("/dashboard");
      } else {
        throw new Error(data.message || "Signup failed");
      }
    } catch (error) {
      console.error(error);
      toast.error(error.message || "Failed to sign up with Google");
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleFacebookLogin = async () => {
    setIsFacebookLoading(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      toast.info("Facebook sign up coming soon!");
    } catch (error) {
      toast.error("Facebook sign up failed. Please try again.");
    } finally {
      setIsFacebookLoading(false);
    }
  };

  const handleLinkedInLogin = async () => {
    setIsLinkedInLoading(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      toast.info("LinkedIn sign up coming soon!");
    } catch (error) {
      toast.error("LinkedIn sign up failed. Please try again.");
    } finally {
      setIsLinkedInLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-50 items-center justify-center px-4 md:px-0">
      <div className="flex items-center justify-center w-full md:w-auto md:translate-x-14">
        <div className="bg-white p-4 sm:p-8 rounded-lg shadow-md w-screen h-screen md:w-[600px] min-h-[650px] md:h-[700px] flex flex-col justify-center">
          <h2 className="text-xl sm:text-2xl text-center mb-6 sm:mb-10">
            Sign Up
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
                <>
                  <div className="absolute left-3 top-1/2 -translate-y-1/2">
                    <img
                      src={facebookLogo}
                      alt="Facebook logo"
                      className="w-5 h-5"
                    />
                  </div>
                  <div className="w-full text-center text-sm">
                    Continue with Facebook
                  </div>
                </>
              )}
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
                <>
                  <div className="absolute left-2 top-1/2 -translate-y-1/2">
                    <img
                      src={linkedinLogo}
                      alt="LinkedIn logo"
                      className="w-6 h-6"
                    />
                  </div>
                  <div className="w-full text-center text-sm">
                    Continue with LinkedIn
                  </div>
                </>
              )}
            </button>
          </div>

          <div className="flex items-center mb-6">
            <hr className="flex-grow border-t border-gray-300" />
            <span className="mx-2 text-gray-500">Or</span>
            <hr className="flex-grow border-t border-gray-300" />
          </div>

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
                    : successes.email
                    ? "border-green-500 focus:ring-green-500"
                    : "border-gray-300 focus:ring-black"
                } focus:border-none focus:ring-1`}
              />
              {errors.email && isDirty.email && (
                <p className="mt-1 text-sm text-red-500">{errors.email}</p>
              )}
            </div>

            <div className="mb-4">
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700"
              >
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={handlePasswordChange}
                  className={`mt-1 block w-full p-2 sm:p-3 border rounded-lg transition-all duration-200 ${
                    errors.password && isDirty.password
                      ? "border-red-500 focus:ring-red-500"
                      : successes.password
                      ? "border-green-500 focus:ring-green-500"
                      : "border-gray-300 focus:ring-black"
                  } focus:border-none focus:ring-1`}
                />
              </div>
              {errors.password && isDirty.password && (
                <p className="mt-1 text-sm text-red-500">{errors.password}</p>
              )}
            </div>

            <div className="mb-6">
              <label
                htmlFor="confirmPassword"
                className="block text-sm font-medium text-gray-700"
              >
                Confirm Password
              </label>
              <div className="relative">
                <input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={handleConfirmPasswordChange}
                  className={`mt-1 block w-full p-2 sm:p-3 border rounded-lg transition-all duration-200 ${
                    errors.confirmPassword && isDirty.confirmPassword
                      ? "border-red-500 focus:ring-red-500"
                      : successes.confirmPassword
                      ? "border-green-500 focus:ring-green-500"
                      : "border-gray-300 focus:ring-black"
                  } focus:border-none focus:ring-1`}
                />
              </div>
              {errors.confirmPassword && isDirty.confirmPassword && (
                <p className="mt-1 text-sm text-red-500">
                  {errors.confirmPassword}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={!isFormValidated || isLoading}
              onClick={() => navigate('/dashboard')}
              className={`w-full min-h-[44px] rounded-lg text-sm font-medium bg-[#ff6464] text-white transition-all duration-200 ${
                !isFormValidated || isLoading
                  ? "bg-gray-200 text-gray-400 border-gray-200 cursor-not-allowed"
                  : "hover:bg-[#ff4444]"
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
                "Sign up"
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-sm sm:text-base">
            Already have an account?{" "}
            <Link to="/login" className="text-[#ff6464] hover:underline">
              Log in here
            </Link>
          </p>
        </div>

        <div className="hidden md:flex items-center justify-center translate-y-16">
          <img src={signupImage} alt="signup image" className="w-[200px]" />
        </div>
      </div>
      <ToastContainer />
    </div>
  );
};

export default SignUpPage;

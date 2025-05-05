import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import loginImage from "assets/images/lean-guy.png";
import { useAuth } from "../../contexts/AuthContext";
import showImage from "assets/images/show.svg";
import hideImage from "assets/images/hide.svg";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";

const LoginPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [csrfToken, setCsrfToken] = useState("");

  const [errors, setErrors] = useState({
    email: "",
    password: "",
  });
  const [isDirty, setIsDirty] = useState({
    email: false,
    password: false,
  });
  const [isFormValidated, setIsFormValidated] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  useEffect(() => {
    const fetchCsrfToken = async () => {
      try {
        const response = await fetch(
          "http://localhost:8080/api/auth/csrf-token",
          {
            method: "GET",
            credentials: "include",
          }
        );

        if (response.ok) {
          const data = await response.json();
          setCsrfToken(data.token);
        }
      } catch (error) {
        console.error("Failed to fetch CSRF token:", error);
      }
    };

    fetchCsrfToken();
  }, []);

  React.useEffect(() => {
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const isEmailValid = email && emailPattern.test(email);
    const isPasswordValid = password && password.length >= 6;

    setIsFormValidated(isEmailValid && isPasswordValid);

    if (!email) {
      setErrors((prev) => ({ ...prev, email: "" }));
    } else if (!isEmailValid && isDirty.email) {
      setErrors((prev) => ({
        ...prev,
        email: "Please enter a valid email address",
      }));
    } else {
      setErrors((prev) => ({ ...prev, email: "" }));
    }

    if (!password) {
      setErrors((prev) => ({ ...prev, password: "" }));
    } else if (!isPasswordValid && isDirty.password) {
      setErrors((prev) => ({
        ...prev,
        password: "Password must be at least 6 characters",
      }));
    } else {
      setErrors((prev) => ({ ...prev, password: "" }));
    }
  }, [email, password, isDirty]);

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
    setIsLoading(true);
    setErrors({ email: "", password: "" });

    try {
      const response = await fetch("http://localhost:8080/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Login failed");
      }

      const data = await response.json();
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      toast.success("Login successful!");

      // Extract the user object from the response
      const userData = data.user || data;

      // Log the actual user data we're storing
      console.log("Storing user data:", userData);

      login(userData);

      // Redirect based on email (not role)
      if (userData.email === "admin@gmail.com") {
        console.log("Admin detected, redirecting to admin panel");
        navigate("/admin");
      } else if (userData.role === "PROFESSOR") {
        console.log("Professor detected, redirecting to professor dashboard");
        navigate("/professor");
      } else {
        console.log("Student detected, redirecting to student dashboard");
        navigate("/dashboard");
      }
    } catch (err) {
      console.error("Login error:", err);
      toast.error(err.message || "Failed to login");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-50 items-center justify-center px-4 md:px-0">
      <div className="flex items-center justify-center w-full md:w-auto md:-translate-x-20">
        <div className="hidden md:flex items-center justify-center translate-y-16">
          <img src={loginImage} alt="login" className="w-[160px]" />
        </div>

        <div className="relative bg-white p-4 sm:p-8 rounded-lg shadow-md w-screen h-screen md:w-[600px] min-h-[650px] md:h-[700px] flex flex-col justify-center">
          <button
            onClick={() => navigate("/")}
            className="absolute top-8 left-5 flex items-center text-gray-600 hover:text-gray-800 transition-colors"
          >
            <ArrowLeftIcon className="h-5 w-5 mr-1" />
            Back to Home
          </button>

          <div className="flex items-center justify-center mb-6">
            <h2 className="absolute top-32 text-xl sm:text-2xl text-center">
              Login
            </h2>
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
                    : "border-gray-300 focus:ring-black"
                } focus:border-none focus:ring-1`}
                placeholder="Enter your email"
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
                "Login"
              )}
            </button>

            {email === "admin@gmail.com" && (
              <div className="mt-4 text-center">
                <button
                  type="button"
                  onClick={() => {
                    if (password) {
                      navigate("/admin");
                    } else {
                      toast.error("Please enter your password");
                    }
                  }}
                  className="text-blue-600 hover:text-blue-800 underline"
                >
                  Direct Access to Admin Panel
                </button>
              </div>
            )}
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

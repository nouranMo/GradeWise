import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import signupImage from "assets/images/lean-girl.png";
import { useAuth } from "../../contexts/AuthContext";
import showImage from "assets/images/show.svg";
import hideImage from "assets/images/hide.svg";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";

const SignUpPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const [showPassword, setShowPassword] = useState(false);

  const [errors, setErrors] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    firstName: "",
    lastName: "",
  });

  const [isDirty, setIsDirty] = useState({
    email: false,
    password: false,
    confirmPassword: false,
    firstName: false,
    lastName: false,
  });

  const [isFormValidated, setIsFormValidated] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  useEffect(() => {
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const isEmailValid = email && emailPattern.test(email);
    const isPasswordValid = password && password.length >= 6;
    const isConfirmPasswordValid = confirmPassword === password;
    const isFirstNameValid = firstName.trim().length > 0;
    const isLastNameValid = lastName.trim().length > 0;

    setIsFormValidated(
      isEmailValid &&
        isPasswordValid &&
        isConfirmPasswordValid &&
        isFirstNameValid &&
        isLastNameValid
    );

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

    if (!confirmPassword) {
      setErrors((prev) => ({ ...prev, confirmPassword: "" }));
    } else if (!isConfirmPasswordValid && isDirty.confirmPassword) {
      setErrors((prev) => ({
        ...prev,
        confirmPassword: "Passwords do not match",
      }));
    } else {
      setErrors((prev) => ({ ...prev, confirmPassword: "" }));
    }

    if (!firstName) {
      setErrors((prev) => ({ ...prev, firstName: "" }));
    } else if (!isFirstNameValid && isDirty.firstName) {
      setErrors((prev) => ({
        ...prev,
        firstName: "First name is required",
      }));
    } else {
      setErrors((prev) => ({ ...prev, firstName: "" }));
    }

    if (!lastName) {
      setErrors((prev) => ({ ...prev, lastName: "" }));
    } else if (!isLastNameValid && isDirty.lastName) {
      setErrors((prev) => ({
        ...prev,
        lastName: "Last name is required",
      }));
    } else {
      setErrors((prev) => ({ ...prev, lastName: "" }));
    }
  }, [email, password, confirmPassword, firstName, lastName, isDirty]);

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

  const handleFirstNameChange = (e) => {
    setFirstName(e.target.value);
    setIsDirty((prev) => ({ ...prev, firstName: true }));
  };

  const handleLastNameChange = (e) => {
    setLastName(e.target.value);
    setIsDirty((prev) => ({ ...prev, lastName: true }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isFormValidated) return;

    // Check if email ends with @miuegypt.edu.eg
    if (!email.endsWith("@miuegypt.edu.eg") && email !== "admin@gmail.com") {
      toast.error("Only @miuegypt.edu.eg email addresses are allowed");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/auth/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
          firstName,
          lastName,
          role: "STUDENT", // Always set as student
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Registration failed");
      }

      const data = await response.json();
      login(data);
      toast.success("Registration successful!");
      navigate("/dashboard");
    } catch (error) {
      console.error(error);
      toast.error(error.message || "Failed to register");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-50 items-center justify-center px-4 md:px-0">
      <div className="flex items-center justify-center w-full md:w-auto md:translate-x-14">
        <div className="relative bg-white p-4 sm:p-8 rounded-lg shadow-md w-screen h-screen md:w-[600px] min-h-[650px] md:h-[700px] flex flex-col justify-center">
          <button
            onClick={() => navigate("/")}
            className="absolute top-8 left-5 flex items-center text-gray-600 hover:text-gray-800 transition-colors"
          >
            <ArrowLeftIcon className="h-5 w-5 mr-1" />
            Back to Home
          </button>
          <div className="flex items-center justify-center mb-6">
            <h2 className="text-xl sm:text-2xl text-center">Sign Up</h2>
          </div>

          <form onSubmit={handleSubmit} noValidate>
            <div className="mb-4">
              <label
                htmlFor="firstName"
                className="block text-sm font-medium text-gray-700"
              >
                First Name
              </label>
              <input
                id="firstName"
                type="text"
                value={firstName}
                onChange={handleFirstNameChange}
                className={`mt-1 block w-full p-2 sm:p-3 border rounded-lg transition-all duration-200 ${
                  errors.firstName && isDirty.firstName
                    ? "border-red-500 focus:ring-red-500"
                    : "border-gray-300 focus:ring-black"
                } focus:border-none focus:ring-1`}
                placeholder="Enter your first name"
              />
              {errors.firstName && isDirty.firstName && (
                <p className="mt-1 text-sm text-red-500">{errors.firstName}</p>
              )}
            </div>

            <div className="mb-4">
              <label
                htmlFor="lastName"
                className="block text-sm font-medium text-gray-700"
              >
                Last Name
              </label>
              <input
                id="lastName"
                type="text"
                value={lastName}
                onChange={handleLastNameChange}
                className={`mt-1 block w-full p-2 sm:p-3 border rounded-lg transition-all duration-200 ${
                  errors.lastName && isDirty.lastName
                    ? "border-red-500 focus:ring-red-500"
                    : "border-gray-300 focus:ring-black"
                } focus:border-none focus:ring-1`}
                placeholder="Enter your last name"
              />
              {errors.lastName && isDirty.lastName && (
                <p className="mt-1 text-sm text-red-500">{errors.lastName}</p>
              )}
            </div>

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
                placeholder="example@miuegypt.edu.eg"
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
                  type={showPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={handleConfirmPasswordChange}
                  className={`mt-1 block w-full p-2 sm:p-3 border rounded-lg transition-all duration-200 ${
                    errors.confirmPassword && isDirty.confirmPassword
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
              {errors.confirmPassword && isDirty.confirmPassword && (
                <p className="mt-1 text-sm text-red-500">
                  {errors.confirmPassword}
                </p>
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

          <p className="mt-4 text-sm text-gray-600">
            Note: All accounts are registered as student accounts by default. If
            you are a professor, please contact the administrator after
            registration to have your account upgraded to professor status.
          </p>
        </div>

        <div className="hidden md:flex items-center justify-center translate-y-16">
          <img src={signupImage} alt="signup" className="w-[200px]" />
        </div>
      </div>
      <ToastContainer />
    </div>
  );
};

export default SignUpPage;

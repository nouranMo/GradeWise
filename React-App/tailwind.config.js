/** @type {import('tailwindcss').Config} */

module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}", "./public/index.html"],
  theme: {
    extend: {
      gridTemplateColumns: {
        13: "repeat(13, minmax(0, 1fr))",
      },
      animation: {
        pulse: "pulse 1s infinite",
        bounce: "bounce 4s ease-in-out infinite",
        flicker: "flicker 1.5s infinite",
        moveAcross: "moveAcross 5s linear infinite",
        zoom: "zoom 3s ease-in-out infinite",
        shine: "shine 3s ease-in-out infinite",
        spin: "spin 0.6s linear infinite",
        slideUp: "slideUp 1s ease-out",
        fadeIn: "fadeIn 2s ease-out",
        fadeOut: "fadeOut 2s ease-out",
        dropIn: "dropIn 0.1s ease-out",
        dropOut: "dropOut 0.1s ease-out",
      },
      colors: {
        blue: {
          400: "#2589FE",
          500: "#0070F3",
          600: "#2F6FEB",
        },
      },
    },
    keyframes: {
      pulse: {
        "0%": { transform: "scale(1)" },
        "50%": { transform: "scale(1.1)" },
        "100%": { transform: "scale(1)" },
      },
      bounce: {
        "0%, 100%": { transform: "translateY(0)" },
        "50%": { transform: "translateY(-10px)" },
      },
      flicker: {
        "0%, 100%": { opacity: "0.8" },
        "50%": { opacity: "1" },
      },
      moveAcross: {
        "0%": { transform: "translateX(0)" },
        "100%": { transform: "translateX(100vw)" },
      },
      zoom: {
        "0%, 100%": { transform: "scale(1)" },
        "50%": { transform: "scale(1.5)" },
      },
      shine: {
        "0%, 100%": { transform: "scale(1)", opacity: "0.9" },
        "50%": { transform: "scale(1.2)", opacity: "1" },
      },
      spin: {
        "0%": { transform: "rotate(0deg)" },
        "100%": { transform: "rotate(360deg)" },
      },
      slideUp: {
        "0%": { transform: "translateY(20px)", opacity: "0" },
        "100%": { transform: "translateY(0)", opacity: "1" },
      },
      fadeIn: {
        "0%": { opacity: "0" },
        "100%": { opacity: "1" },
      },
      fadeOut: {
        "0%": { opacity: "1" },
        "100%": { opacity: "0" },
      },
      dropIn: {
        from: {
          opacity: "0",
          transform: "translateY(-4px)",
          transformOrigin: "top",
        },
        to: {
          opacity: "1",
          transform: "translateY(0)",
          transformOrigin: "top",
        },
      },
      dropOut: {
        from: {
          opacity: "1",
          transform: "translateY(0)",
          transformOrigin: "top",
        },
        to: {
          opacity: "0",
          transform: "translateY(-4px)",
          transformOrigin: "top",
        },
      },
    },
  },
  plugins: [require("@tailwindcss/forms"), require("@tailwindcss/typography")],
};

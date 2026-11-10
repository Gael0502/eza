/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        forest: {
          950: "#0D2B1E",
          900: "#123D2B",
          800: "#184F37",
          700: "#218653",
          600: "#2E9B62",
        },
        fresh: {
          50: "#F3F8EF",
          100: "#E5F0DC",
          300: "#B4D895",
          400: "#92C96A",
          500: "#75B84A",
          600: "#5F9F39",
          700: "#4B7D30",
        },
        mist: "#F7F9F5",
        ink: "#17251D",
      },
      boxShadow: {
        card: "0 1px 2px rgba(23, 37, 29, 0.035), 0 8px 24px rgba(23, 37, 29, 0.035)",
      },
      fontFamily: {
        sans: ['"Segoe UI"', "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

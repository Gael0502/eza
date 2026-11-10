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
          100: "#EAF3EB",
          300: "#B8DDA0",
          400: "#91C96B",
          500: "#75B84A",
          600: "#5F9F39",
          700: "#4B7D30",
        },
        mist: "#F5F7F2",
        ink: "#25342C",
        muted: "#718078",
        border: "#E4EAE4",
      },
      boxShadow: {
        card: "0 1px 2px rgba(23, 37, 29, 0.025), 0 6px 18px rgba(23, 37, 29, 0.035)",
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

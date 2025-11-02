/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: "#4B3F6B",
        accent: "#6D5BD0",
        surface: "#F5F6FA",
      },
    },
  },
  plugins: [],
};

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ['ui-sans-serif','system-ui','-apple-system','Segoe UI','Roboto','Noto Sans','Ubuntu','Cantarell','Helvetica Neue','Arial','Apple Color Emoji','Segoe UI Emoji','Segoe UI Symbol']
      },
      boxShadow: { soft: "0 10px 25px -10px rgba(0,0,0,0.25)" },
      borderRadius: { xl2: "1rem" }
    },
  },
  plugins: [],
}

/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        sans: ["'DM Sans'", "sans-serif"],
        display: ["'Syne'", "sans-serif"],
        mono: ["'JetBrains Mono'", "monospace"],
      },
      colors: {
        primary: {
          50: "#f0f5ff",
          100: "#e0eaff",
          200: "#c7d7fe",
          300: "#a5b8fc",
          400: "#8192f8",
          500: "#6470f3",
          600: "#5358e8",
          700: "#4540d0",
          800: "#3835a8",
          900: "#1e1b5e",
          950: "#12103a",
        },
        sidebar: {
          DEFAULT: "#0b0538",
          dark: "#050220",
        },
        accent: {
          DEFAULT: "#f59e0b",
          light: "#fcd34d",
          dark: "#d97706",
        },
      },
      boxShadow: {
        glow: "0 0 24px -4px rgba(100, 112, 243, 0.35)",
        card: "0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.06)",
        "card-hover":
          "0 4px 6px rgba(0,0,0,0.06), 0 12px 32px rgba(0,0,0,0.10)",
        sidebar: "4px 0 24px rgba(0,0,0,0.08)",
      },
    },
  },
  plugins: [],
};

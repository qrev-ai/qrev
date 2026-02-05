import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Superhuman dark mode palette
        surface: {
          0: "#1C1E21", // Deepest background
          1: "#27292D", // Base background
          2: "#2F3136", // Elevated surface
          3: "#36393F", // Higher elevation
          4: "#40444B", // Highest elevation / hover states
        },
        accent: {
          DEFAULT: "#A0A4D9", // Primary button color
          hover: "#B0B4E9",
          muted: "#8084B9",
        },
        text: {
          primary: "rgba(255, 255, 255, 0.9)", // Never pure white
          secondary: "rgba(255, 255, 255, 0.7)",
          muted: "rgba(255, 255, 255, 0.5)",
          disabled: "rgba(255, 255, 255, 0.3)",
        },
        border: {
          DEFAULT: "rgba(255, 255, 255, 0.1)",
          subtle: "rgba(255, 255, 255, 0.06)",
          strong: "rgba(255, 255, 255, 0.15)",
        },
        status: {
          success: "#4ADE80",
          warning: "#FBBF24",
          error: "#F87171",
          info: "#60A5FA",
        },
      },
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
        mono: ["SF Mono", "Monaco", "Inconsolata", "Fira Mono", "monospace"],
      },
      fontSize: {
        xs: ["0.75rem", { lineHeight: "1rem" }],
        sm: ["0.8125rem", { lineHeight: "1.25rem" }],
        base: ["0.875rem", { lineHeight: "1.5rem" }],
        lg: ["1rem", { lineHeight: "1.75rem" }],
        xl: ["1.125rem", { lineHeight: "1.75rem" }],
        "2xl": ["1.25rem", { lineHeight: "2rem" }],
      },
      boxShadow: {
        sm: "0 1px 2px 0 rgba(0, 0, 0, 0.3)",
        DEFAULT: "0 1px 3px 0 rgba(0, 0, 0, 0.4), 0 1px 2px -1px rgba(0, 0, 0, 0.4)",
        md: "0 4px 6px -1px rgba(0, 0, 0, 0.4), 0 2px 4px -2px rgba(0, 0, 0, 0.4)",
        lg: "0 10px 15px -3px rgba(0, 0, 0, 0.4), 0 4px 6px -4px rgba(0, 0, 0, 0.4)",
        glow: "0 0 20px rgba(160, 164, 217, 0.15)",
      },
      borderRadius: {
        sm: "0.25rem",
        DEFAULT: "0.375rem",
        md: "0.5rem",
        lg: "0.75rem",
        xl: "1rem",
      },
      animation: {
        "fade-in": "fadeIn 0.15s ease-out",
        "slide-up": "slideUp 0.2s ease-out",
        "pulse-subtle": "pulseSubtle 2s ease-in-out infinite",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(4px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        pulseSubtle: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.7" },
        },
      },
    },
  },
  plugins: [],
};

export default config;

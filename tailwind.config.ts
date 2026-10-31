import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        // "a law firm, not a startup" palette
        ink: {
          DEFAULT: "#14213D", // deep navy for headers/sidebars
          50: "#1A2A4E",
          100: "#23335A",
          200: "#2E4268",
          300: "#3A5278",
          400: "#4A6488",
          500: "#5E7A9C",
          600: "#7895B4",
          700: "#9AB0CB",
          800: "#BFCFE1",
          900: "#DFE7F0",
          950: "#F0F4F9",
        },
        burgundy: {
          DEFAULT: "#6B1E2E", // primary accent (key actions)
          50: "#7A2E3E",
          100: "#8A3F4F",
          200: "#9A5060",
          300: "#AA6171",
          400: "#BB7282",
          500: "#CC8393",
          600: "#DD94A4",
          700: "#EEA5B5",
          800: "#FFB6C6",
          900: "#FFC7D7",
          950: "#FFD8E8",
        },
        gold: {
          DEFAULT: "#B08D57", // antique gold, sparing use
          50: "#B89B6B",
          100: "#C0A97F",
          200: "#C8B793",
          300: "#D0C5A7",
          400: "#D8D3BB",
          500: "#E0E1CF",
          600: "#E8EFE3",
          700: "#F0FDF7",
          800: "#F8FBFB",
          900: "#FFFFFF",
          950: "#FFFFFF",
        },
        paper: {
          DEFAULT: "#F7F4EE", // warm off-white background
          50: "#FFFFFF",
          100: "#FBF9F4",
          200: "#F7F4EE",
          300: "#F3EFE6",
          400: "#EFE9DD",
          500: "#EBE3D4",
          600: "#E7DDCB",
          700: "#E3D7C2",
          800: "#DFD1B9",
          900: "#DBCBB0",
          950: "#D7C5A7",
        },
        warmgray: {
          DEFAULT: "#6B6560",
          50: "#7A7570",
          100: "#898581",
          200: "#989592",
          300: "#A7A5A3",
          400: "#B6B5B4",
          500: "#C5C4C3",
          600: "#D4D3D2",
          700: "#E3E2E1",
          800: "#F2F1F0",
          900: "#FDFCFC",
          950: "#FFFEFD",
        },
        // status colours (always paired with text labels)
        status: {
          hearing: "#B45309", // amber  – hearing soon
          overdue: "#B91C1C", // red    – overdue
          ok: "#15803D",      // green  – closed/won
          info: "#1D4ED8",    // blue   – informational
        },
      },
      fontFamily: {
        // Arabic headings
        "arabic-heading": ["var(--font-amiri)", "Amiri", "Noto Naskh Arabic", "serif"],
        // Arabic body/UI
        "arabic-body": [
          "var(--font-plex)",
          "IBM Plex Sans Arabic",
          "Noto Kufi Arabic",
          "system-ui",
          "sans-serif",
        ],
        // Latin headings
        "latin-heading": ["Cormorant Garamond", "Playfair Display", "serif"],
        // Latin body
        "latin-body": ["Inter", "Source Sans 3", "system-ui", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "monospace"],
      },
      // tabular numbers for dates, case numbers, amounts
      fontVariantNumeric: ["tabular-nums"],
      boxShadow: {
        card: "0 1px 2px 0 rgb(20 33 61 / 0.06), 0 1px 3px 0 rgb(20 33 61 / 0.08)",
        raised: "0 4px 12px 0 rgb(20 33 61 / 0.10)",
      },
      keyframes: {
        "fade-in": {
          from: { opacity: "0", transform: "translateY(4px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "slide-up": {
          from: { opacity: "0", transform: "translateY(12px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.25s ease-out",
        "slide-up": "slide-up 0.3s ease-out",
        shimmer: "shimmer 1.5s infinite",
      },
    },
  },
  plugins: [],
};
export default config;

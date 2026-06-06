/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./landing/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        customGray: "#272727",
        flixred: "#E50914",
        mint: "#A1D6B2",
        zinc: {
          850: "#1e1e1e",
          925: "#111111",
          950: "#0a0a0a",
        },
      },
      fontFamily: {
        sans: ["Outfit", "ui-sans-serif", "system-ui", "-apple-system", "sans-serif"],
        heading: ["Plus Jakarta Sans", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      backgroundImage: {
        "red-glow": "radial-gradient(ellipse at center, rgba(229,9,20,0.3) 0%, transparent 70%)",
      },
      keyframes: {
        shimmer: {
          "0%":   { backgroundPosition: "-600px 0" },
          "100%": { backgroundPosition:  "600px 0" },
        },
        fadeIn: {
          from: { opacity: "0", transform: "translateY(12px)" },
          to:   { opacity: "1", transform: "translateY(0)" },
        },
        fadeInScale: {
          from: { opacity: "0", transform: "scale(0.96)" },
          to:   { opacity: "1", transform: "scale(1)" },
        },
        slideDown: {
          from: { opacity: "0", transform: "translateY(-8px)" },
          to:   { opacity: "1", transform: "translateY(0)" },
        },
        glowPulse: {
          "0%, 100%": { boxShadow: "0 0 8px 2px rgba(229,9,20,0.35)" },
          "50%":       { boxShadow: "0 0 24px 6px rgba(229,9,20,0.35)" },
        },
      },
      animation: {
        shimmer:         "shimmer 1.6s infinite",
        "fade-in":       "fadeIn 0.4s ease-out both",
        "fade-in-scale": "fadeInScale 0.35s ease-out both",
        "slide-down":    "slideDown 0.25s ease-out both",
        "glow-pulse":    "glowPulse 2s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

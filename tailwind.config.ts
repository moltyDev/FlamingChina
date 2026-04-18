import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        coal: "#060606",
        cinder: "#111111",
        ember: "#ff6f1e",
        inferno: "#d01600",
        blood: "#540909",
      },
      boxShadow: {
        glow: "0 0 24px rgba(255, 111, 30, 0.35)",
        inferno: "0 0 34px rgba(208, 22, 0, 0.35)",
      },
      keyframes: {
        flicker: {
          "0%, 100%": { opacity: "1" },
          "40%": { opacity: "0.92" },
          "65%": { opacity: "0.97" },
          "70%": { opacity: "0.82" },
          "80%": { opacity: "0.95" },
        },
      },
      animation: {
        flicker: "flicker 3s infinite",
      },
    },
  },
  plugins: [],
};

export default config;

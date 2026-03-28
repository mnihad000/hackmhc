import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: "#1e3a5f", light: "#2d5a8e" },
        accent: { DEFAULT: "#f59e0b", light: "#fbbf24" },
        category: {
          finance: "#22c55e",
          education: "#3b82f6",
          medical: "#ef4444",
          identity: "#a855f7",
          legal: "#f97316",
          other: "#6b7280",
        },
      },
    },
  },
  plugins: [],
};
export default config;

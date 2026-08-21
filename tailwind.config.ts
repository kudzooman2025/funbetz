import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    // Brand colors AND font families are defined in globals.css via @theme
    // (Tailwind v4). Do not re-declare them here — globals.css is the single
    // source of truth.
    extend: {},
  },
  plugins: [],
};

export default config;

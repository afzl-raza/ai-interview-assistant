import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      boxShadow: {
        halo: "0 30px 80px rgba(0, 0, 0, 0.38)",
        glow: "0 18px 60px rgba(67, 183, 255, 0.16)",
      },
      backgroundImage: {
        "hero-radial":
          "radial-gradient(circle at top left, rgba(78, 176, 255, 0.18), transparent 28%), radial-gradient(circle at 85% 10%, rgba(86, 228, 179, 0.16), transparent 18%)",
      },
      fontFamily: {
        sans: ["Manrope", "system-ui", "sans-serif"],
        serif: ["Fraunces", "Georgia", "serif"],
      },
    },
  },
  plugins: [],
};

export default config;

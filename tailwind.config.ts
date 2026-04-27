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
        halo: "0 24px 60px rgba(92, 76, 151, 0.12)",
        glow: "0 16px 40px rgba(118, 96, 196, 0.18)",
      },
      backgroundImage: {
        "hero-radial":
          "radial-gradient(circle at top left, rgba(134, 116, 214, 0.2), transparent 28%), radial-gradient(circle at 85% 10%, rgba(122, 189, 255, 0.12), transparent 18%)",
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

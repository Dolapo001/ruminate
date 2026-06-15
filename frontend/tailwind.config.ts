import type { Config } from "tailwindcss";

/**
 * Savanna Futurism design tokens.
 * Status colours each mean ONE thing:
 *   green = healthy   gold = at risk / watch   terra = critical / act now
 *   violet = in estrus   coral = SHAP pushes-to-risk   teal = SHAP rules-out-heat
 */
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#13100A",
        panel: { DEFAULT: "#1C1710", 2: "#251E15", 3: "#2E2519" },
        gold: { DEFAULT: "#F0C24A", d: "#C9952E" },
        cream: "#F6EEE0",
        muted: "#B9AC97",
        green: "#3DD88C",
        terra: "#EA6A40",
        violet: "#9B8CFA",
        teal: "#2FD6C2",
        coral: "#EA6A40",
      },
      fontFamily: {
        display: ["Unbounded", "sans-serif"],
        sans: ["Space Grotesk", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      borderRadius: { sm: "8px", DEFAULT: "14px", lg: "18px", xl: "24px" },
    },
  },
  plugins: [],
};
export default config;

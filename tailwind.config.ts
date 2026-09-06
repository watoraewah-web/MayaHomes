import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
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
      },
      colors: {
        // Neutral production-grade palette
        surface: "#ffffff",
        canvas: "#f7f7f8",
        line: "#e4e4e7",
        muted: "#71717a",
        ink: "#18181b",
      },
      boxShadow: {
        card: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
        overlay: "0 8px 24px rgb(0 0 0 / 0.12)",
      },
    },
  },
  plugins: [],
};
export default config;

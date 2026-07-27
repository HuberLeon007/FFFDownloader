/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        "surface-base": "#09090b",
        "surface-card": "#111114",
        "surface-raised": "#17171b",
        line: "#27272a",
        accent: "#34d399",
        "accent-dim": "#10b981",
        warn: "#fbbf24",
        danger: "#f87171",
        ink: "#fafafa",
        "ink-muted": "#a1a1aa",
        "ink-faint": "#71717a"
      },
      borderRadius: {
        card: "10px"
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "-apple-system", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "SF Mono", "Menlo", "monospace"]
      }
    }
  },
  plugins: []
}

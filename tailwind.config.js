/* eslint-disable no-undef */
const { fontFamily } = require("tailwindcss/defaultTheme");

/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{js,jsx}",
    "./components/**/*.{js,jsx}",
    "./app/**/*.{js,jsx}",
    "./src/**/*.{js,jsx}"
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: {
        DEFAULT: "1rem", // Default padding for all devices
        sm: "1.5rem", // Small screens
        lg: "2rem", // Large screens
        xl: "2.5rem", // Extra-large screens
        "2xl": "3rem" // 2XL screens
      },
      screens: {
        sm: "640px",
        md: "768px",
        lg: "1024px",
        xl: "1280px"
      }
    },
    extend: {
      screens: {
        // Desktop shell (sidebar rail that expands on hover): a wide screen
        // WITH a mouse. Touch tablets of any width keep the drawer +
        // hamburger, since a hover-only rail never shows its labels there.
        desk: { raw: "(min-width: 1280px) and (hover: hover) and (pointer: fine)" }
      },
      fontFamily: {
        sans: ["var(--font-sans)", ...fontFamily.sans],
        "jk-display": ["Bricolage Grotesque Variable", ...fontFamily.sans],
        "jk-body": ["Plus Jakarta Sans Variable", ...fontFamily.sans],
        "jk-mono": ["IBM Plex Mono", ...fontFamily.mono]
      },
      colors: {
        jk: {
          pine: "rgb(var(--jk-pine) / <alpha-value>)",
          "pine-soft": "rgb(var(--jk-pine-soft) / <alpha-value>)",
          green: "rgb(var(--jk-green) / <alpha-value>)",
          "green-deep": "rgb(var(--jk-green-deep) / <alpha-value>)",
          leaf: "rgb(var(--jk-leaf) / <alpha-value>)",
          paper: "rgb(var(--jk-paper) / <alpha-value>)",
          "paper-deep": "rgb(var(--jk-paper-deep) / <alpha-value>)",
          ink: "rgb(var(--jk-ink) / <alpha-value>)",
          stone: "rgb(var(--jk-stone) / <alpha-value>)",
          kunyit: "rgb(var(--jk-kunyit) / <alpha-value>)"
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))"
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))"
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))"
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))"
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))"
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))"
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))"
        }
      },
      spacing: {
        xs: "4px",
        md: "16px",
        xl: "32px",
        lg: "24px",
        gutter: "24px",
        base: "8px",
        "container-margin": "32px",
        sm: "8px"
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        xl: "0.75rem"
      },
      keyframes: {
        "accordion-down": {
          from: {
            height: "0"
          },
          to: {
            height: "var(--radix-accordion-content-height)"
          }
        },
        "accordion-up": {
          from: {
            height: "var(--radix-accordion-content-height)"
          },
          to: {
            height: "0"
          }
        }
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out"
      }
    }
  },
  plugins: [require("tailwindcss-animate")]
};

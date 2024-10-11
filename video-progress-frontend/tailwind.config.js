/** @type {import('tailwindcss').Config} */
export const content = ["./src/**/*.{js,jsx,ts,tsx}"];
export const theme = {
  extend: {
    fontSize: {
      xxl: "1.75rem",
      xxs: "0.65rem",
    },
    colors: {
      primarydark: "#010409",
      primary: "#0e1116",
      accent: "#f97316",
      accentsecondary: "#D93D42",
      colortext: "#e7edf2",
      colortextsecondary: "#8f969f",
      colorborder: "#30363db3",
      colorsecondary: "#1b1f23",
      colorSuccess: "#3EB655",
      gradientStart: "#B02E0C",
      gradientEnd: "#EB4511",
      gradientEnd2: "#ec4899",
    },
    minWidth: {
      "1/2": "33%", // Adds min-w-1/2
      "17/20": "85%",
    },
    maxWidth: {
      "4/5": "80%",
    },
    width: {
      p79: "79%",
      p21: "21%",
      p49: "49%",
    },
    fontWeight: {
      550: "550",
    },
  },
};
export const plugins = [];

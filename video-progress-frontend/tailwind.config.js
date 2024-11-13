/** @type {import('tailwindcss').Config} */
export const content = ["./src/**/*.{js,jsx,ts,tsx}"];
export const theme = {
  extend: {
    filter: {
      'primary': 'brightness(0) saturate(100%) invert(23%) sepia(85%) saturate(1678%) hue-rotate(351deg) brightness(88%) contrast(103%)',
      'secondary': 'brightness(0) saturate(100%) invert(11%) sepia(12%) saturate(581%) hue-rotate(169deg) brightness(97%) contrast(97%)',
      'disabled': 'brightness(0) saturate(100%) invert(18%) sepia(13%) saturate(641%) hue-rotate(172deg) brightness(91%) contrast(87%)',
      'white': 'brightness(0) saturate(100%) invert(100%) sepia(0%) saturate(0%) hue-rotate(34deg) brightness(114%) contrast(101%)'
    },
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
    height:{
      "p90": "90%",
      "p10": "10%",
      "0.8": "0.175rem"
    },
    minWidth: {
      "1/2": "33%", // Adds min-w-1/2
      "17/20": "85%",
    },
    maxWidth: {
      "4/5": "80%",
      "3/5": "60%",
    },
    width: {
      p79: "79%",
      p21: "21%",
      p18: "18%",
      p49: "49%",
      100: "32rem"
    },
    fontWeight: {
      550: "550",
    },
  },
};
export const plugins = [
  require('tailwindcss-filters'),  // Add the tailwindcss-filters plugin here
];

import React from "react";
import { getRandomColorPair } from '../utils/colorUtils';

const TextCardTiny = ({ word, index, color }) => {
  if (!word) {
    return null; // Return null if the word is not valid
  }

  // Trim the word and split it into an array of words
  const words = word.trim().split(' ');

  let displayText;

  if (words.length > 1) {
    // If there are multiple words, get initials of the first two words
    displayText = words.slice(0, 2).map(w => w.charAt(0).toUpperCase()).join('');
  } else {
    // If it's a single word, display the first two letters
    displayText = words[0].slice(0, 2).toUpperCase();
  }

  const { gradient, darkerShade } = color || getRandomColorPair();

  return (
    <div
      style={{ background: `linear-gradient(to right, ${gradient[0]}, ${gradient[1]})`, color: darkerShade }}
      className="w-16 text-center text-xxl rounded-md font-bold font-mono flex uppercase h-20 items-center justify-center rounded-r-none relative" 
    >
      {displayText} {/* Display the appropriate text */}
    </div>
  );
};

export default TextCardTiny;

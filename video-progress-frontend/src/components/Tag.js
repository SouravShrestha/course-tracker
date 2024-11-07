import React from 'react';
import { getRandomColorPair } from '../utils/colorUtils'; // Adjust the path as necessary

const Tag = ({ text, color, isInactive }) => {
  const { gradient, fontColor } = color || getRandomColorPair(); // Get random color pair

  // Check if gradient is defined before calling join()
  const backgroundStyle = gradient 
    ? `linear-gradient(to right, ${gradient.join(', ')})` 
    : 'transparent';  // Fallback if gradient is undefined

  // Tailwind classes for inactive state
  const inactiveClasses = 'bg-transparent text-colortextsecondary border border-colorborder border-dashed';

  // Apply active styles with dynamic background color and text color for active tags
  const activeClasses = `text-[${fontColor}] border-transparent`;

  return (
    <span
      style={{
        background: isInactive ? 'transparent' : backgroundStyle, // Use the gradient for active state
      }}
      className={`inline-block px-3 py-0.5 rounded text-xs font-semibold lowercase mx-1 my-1.5 border border-dashed
        ${isInactive ? inactiveClasses : activeClasses}`}
    >
      #{text.toLowerCase()}
    </span>
  );
};

export default Tag;

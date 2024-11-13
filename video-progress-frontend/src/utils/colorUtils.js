const colors = [
    { gradient: ["#FF6F61", "#D65A4F"], fontColor: "#ffffff", darkerShade: "#D65A4F" }, // Coral
    { gradient: ["#4CAF50", "#388E3C"], fontColor: "#ffffff", darkerShade: "#388E3C" }, // Green
    { gradient: ["#2196F3", "#1976D2"], fontColor: "#ffffff", darkerShade: "#1976D2" }, // Blue
    { gradient: ["#795548", "#5D4037"], fontColor: "#ffffff", darkerShade: "#5D4037" }, // Brown
    { gradient: ["#9C27B0", "#7B1FA2"], fontColor: "#ffffff", darkerShade: "#7B1FA2" }, // Purple
];

let lastIndex = -1; // Track the last selected index

const getRandomColorPair = () => {
    let randomIndex;
    do {
        randomIndex = Math.floor(Math.random() * colors.length);
    } while (randomIndex === lastIndex); // Ensure the new index is different from the last one

    lastIndex = randomIndex; // Update the lastIndex to the current one

    const selectedColor = colors[randomIndex];
    return { 
        gradient: selectedColor.gradient, 
        fontColor: selectedColor.fontColor, 
        darkerShade: selectedColor.darkerShade 
    };
};

export { getRandomColorPair };
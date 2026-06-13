const colors = [
    { gradient: ["#FF6F61", "#D65A4F"], fontColor: "#ffffff", darkerShade: "#D65A4F" },
    { gradient: ["#4CAF50", "#388E3C"], fontColor: "#ffffff", darkerShade: "#388E3C" },
    { gradient: ["#2196F3", "#1976D2"], fontColor: "#ffffff", darkerShade: "#1976D2" },
    { gradient: ["#795548", "#5D4037"], fontColor: "#ffffff", darkerShade: "#5D4037" },
    { gradient: ["#9C27B0", "#7B1FA2"], fontColor: "#ffffff", darkerShade: "#7B1FA2" },
];

let lastIndex = -1;

const getRandomColorPair = () => {
    let randomIndex;
    do {
        randomIndex = Math.floor(Math.random() * colors.length);
    } while (randomIndex === lastIndex);
    lastIndex = randomIndex;
    const selectedColor = colors[randomIndex];
    return { gradient: selectedColor.gradient, fontColor: selectedColor.fontColor, darkerShade: selectedColor.darkerShade };
};

export { getRandomColorPair };

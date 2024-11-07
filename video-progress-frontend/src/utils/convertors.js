// Function to convert duration "MM:SS" to seconds
export const convertDurationToSeconds = (duration) => {
  const [minutes, seconds] = duration.split(":").map(Number);
  return minutes * 60 + seconds;
};

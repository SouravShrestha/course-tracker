export const fetchStoredFolders = () => {
  return JSON.parse(localStorage.getItem("folders")) || [];
};

export const updateStoredFolders = (folders) => {
  localStorage.setItem("folders", JSON.stringify(folders));
};

export const getLastFolderName = (path) => {
  if (!path) return '';

  // Split the path by the separator (assuming it's '/' or any other path separator)
  const parts = path.split('/');

  // Get the last part
  const lastFolder = parts.pop() || parts.pop(); // Handle potential trailing slash

  // Convert to sentence case (capitalize the first letter)
  return lastFolder.charAt(0).toUpperCase() + lastFolder.slice(1);
};
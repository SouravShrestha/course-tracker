export const fetchStoredFolders = () => {
  return JSON.parse(localStorage.getItem("folders")) || [];
};

export const updateStoredFolders = (folders) => {
  localStorage.setItem("folders", JSON.stringify(folders));
};

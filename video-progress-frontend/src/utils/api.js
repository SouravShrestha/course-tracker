const BASE_URL = "http://localhost:8000/api";

const handleResponse = async (response) => {
  if (!response.ok) {
    throw new Error("Network response was not ok");
  }
  return await response.json();
};

export const fetchCourses = async (storedFolders) => {
  const response = await fetch(`${BASE_URL}/folders`);
  const data = await handleResponse(response);
  
  return data
    .filter(course => storedFolders.includes(course.main_folder_path))
    .sort((a, b) => a.name.localeCompare(b.name));
};

export const scanFolder = async (folder) => {
  const response = await fetch(`${BASE_URL}/folders/scan`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ main_folder_path: folder }),
  });

  return await handleResponse(response);
};

export const checkFolderExists = async (path) => {
  const response = await fetch(
    `${BASE_URL}/folder-exists/?folder_path=${encodeURIComponent(path)}`
  );
  if (!response.ok)
    throw new Error("🚫 Invalid path entered. Enter the full folder path.");
  return true;
};

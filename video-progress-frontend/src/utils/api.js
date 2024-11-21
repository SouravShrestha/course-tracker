import axios from 'axios';

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

export const fetchFolders = async (inputValue) => {
  try {
    // Send the pathPattern as part of the query string
    const response = await fetch(`${BASE_URL}/folder?query=${encodeURIComponent(inputValue)}`);
    
    // Check if the response is okay (status 200)
    if (!response.ok) {
      throw new Error("Failed to fetch folders by path pattern");
    }
    
    // Parse and return the JSON response
    return await response.json();
  } catch (error) {
    console.error('Error fetching folders by path-like pattern:', error);
    throw error;  // Rethrow the error for handling elsewhere
  }
};

export const fetchVideos = async (inputValue) => {
  try {
    // Send the search query (inputValue) as part of the query string
    const response = await fetch(`${BASE_URL}/video?query=${encodeURIComponent(inputValue)}`);
    
    // Check if the response is okay (status 200)
    if (!response.ok) {
      throw new Error("Failed to fetch videos by name");
    }
    
    // Parse and return the JSON response
    return await response.json();
  } catch (error) {
    console.error('Error fetching videos by name pattern:', error);
    throw error;  // Rethrow the error for handling elsewhere
  }
};

export const addMainFolder = async (folder) => {
  const response = await fetch(`${BASE_URL}/mainfolders`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ path: folder }),
  });


  if (!response.ok){
    if(response.status == 404){
      return "Success";
    }else{
      throw new Error("🚫 Invalid path entered. Enter the full folder path.");
    }
  }

  return await handleResponse(response);
};

export const scanMainFolder = async (folder) => {
  const response = await fetch(`${BASE_URL}/mainfolders/scan`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ path: folder }),
  });

  return await handleResponse(response);
};

export const scanFolder = async (folderPath) => {
  const response = await fetch(`${BASE_URL}/folders/scan`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ folder_path: folderPath }),
  });

  if (!response.ok) {
    throw new Error(`Failed to scan folders: ${response.statusText}`);
  }

  return await response.json();
};


export const getFolderById = async (folderId) => {
  try {
    const response = await fetch(`${BASE_URL}/folders/${folderId}`);
    
    if (!response.ok) {
      throw new Error("Failed to fetch folder by ID");
    }

    const folderData = await response.json();
    return folderData;
  } catch (error) {
    console.error("Error fetching folder by ID:", error);
    throw error; // Rethrow the error for handling elsewhere
  }
};

export const checkFolderExists = async (path) => {
  const response = await fetch(
    `${BASE_URL}/folder-exists/?folder_path=${encodeURIComponent(path)}`
  );
  if (!response.ok)
    throw new Error("🚫 Invalid path entered. Enter the full folder path.");
  return true;
};

export const getNotesB = async (videoId) => {
  try {
    const response = await fetch(
      `${BASE_URL}/videos/${videoId}/notes`
    );
    return await response.json();
  } catch (error) {
    throw new Error("Error fetching notes:", error);
  }
};

// Function to update video progress
export const updateVideoProgressB = async (videoId, progress) => {
  try {
    progress = progress.toFixed(0);
    await axios.put(`${BASE_URL}/videos/${videoId}`, {
      progress: progress,
    });
  } catch (error) {
    throw new Error("Failed to update video progress:", error.request);
  }
};

export const fetchTags = async (query = '') => {
  try {
    const response = await fetch(`${BASE_URL}/tags?query=${encodeURIComponent(query)}`);
    if (!response.ok) {
      throw new Error("Failed to fetch tags");
    }
    return await response.json();  // Return the list of tags
  } catch (error) {
    console.error('Error fetching tags:', error);
    throw error;  // Rethrow the error to handle it in the calling component
  }
};

export const fetchFoldersByPath = async (path) => {
  try {
    const response = await fetch(`${BASE_URL}/folders`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      params: {
        path: path
      }
    });
    const data = await handleResponse(response);
    return data;
  } catch (error) {
    throw new Error("Failed to fetch folders by path:", error);
  }
};

export const addTagToFolder = async (folderId, tag) => {
  try {
    const response = await axios.put(`${BASE_URL}/folders/${folderId}/tags`, { name: tag });
    return response.data; // Assuming the response contains the updated list of tags
  } catch (error) {
    console.error("Error adding tag to folder:", error);
    throw error; // Rethrow the error for handling elsewhere
  }
};

export const removeTagFromFolder = async (folderId, tagName) => {
  try {
    const encodedTagName = encodeURIComponent(tagName);
    const response = await axios.delete(`${BASE_URL}/folders/${folderId}/tags/${encodedTagName}`);
    return response.data; // Assuming the response contains the removed tag or confirmation
  } catch (error) {
    console.error("Error removing tag from folder:", error);
    throw error; // Rethrow the error for handling elsewhere
  }
};

export const getTagsOfFolder = async (folderId) => {
  try {
    const response = await axios.get(`${BASE_URL}/folders/${folderId}/tags`);
    return response.data; // Return the list of tags
  } catch (error) {
    console.error("Error fetching tags for folder:", error);
    throw error; // Rethrow the error for handling elsewhere
  }
};

export const deleteUnmappedTags = async () => {
  try {
      const response = await axios.delete(`${BASE_URL}/tags/unmapped`);
      return response.data; // Return the response data for further processing
  } catch (error) {
      console.error('Error deleting unmapped tags:', error);
      throw error; // Rethrow the error to handle it in the calling code
  }
};
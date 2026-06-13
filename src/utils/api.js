const BASE = '/api';

// ─── Main folders ────────────────────────────────────────────────────────────
export const fetchMainFolders = () => fetch(`${BASE}/mainfolders`).then(r => r.json());
export const fetchStoredFolders = fetchMainFolders;

export const addMainFolder = async (path) => {
  const res = await fetch(`${BASE}/mainfolders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || '🚫 Invalid path entered. Enter the full folder path.');
  return data;
};

export const removeMainFolder = (id) =>
  fetch(`${BASE}/mainfolders/${id}`, { method: 'DELETE' }).then(r => r.json());

export const removeFolder = (id) =>
  fetch(`${BASE}/folders/${id}`, { method: 'DELETE' }).then(r => r.json());


// ─── Scanning ─────────────────────────────────────────────────────────────────
export const scanMainFolder = () =>
  fetch(`${BASE}/mainfolders/scan`, { method: 'POST' }).then(r => r.json());

export const scanFolder = (folder_path) =>
  fetch(`${BASE}/folders/scan`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ folder_path }),
  }).then(r => r.json());

// ─── Folders ─────────────────────────────────────────────────────────────────
export const fetchFolders = (query = '') =>
  fetch(`${BASE}/folders?query=${encodeURIComponent(query)}`).then(r => r.json());

export const fetchCourses = async (storedFolders) => {
  const data = await fetch(`${BASE}/folders`).then(r => r.json());
  return data
    .filter(course => storedFolders.includes(course.main_folder_path))
    .sort((a, b) => a.name.localeCompare(b.name));
};

export const getFolderById = (id) =>
  fetch(`${BASE}/folders/${id}`).then(r => r.json());

export const fetchSubfolders = (folderId) =>
  fetch(`${BASE}/folders/${folderId}/subfolders`).then(r => r.json());

export const fetchFoldersByPath = async (mainFolderPath) => {
  const data = await fetch(`${BASE}/folders`).then(r => r.json());
  return data.filter(f => f.main_folder_path === mainFolderPath);
};

export const checkFolderExists = async (folder_path) => {
  const res = await fetch(`${BASE}/folders/exists?folder_path=${encodeURIComponent(folder_path)}`);
  if (!res.ok) throw new Error('🚫 Invalid path entered. Enter the full folder path.');
  return true;
};

// ─── Last played ─────────────────────────────────────────────────────────────
export const fetchRecents = () =>
  fetch(`${BASE}/folders/last_played`).then(r => r.json());

// ─── Videos ──────────────────────────────────────────────────────────────────
export const fetchVideos = (query = '') =>
  fetch(`${BASE}/videos?query=${encodeURIComponent(query)}`).then(r => r.json());

export const updateVideoProgressB = (videoId, progress) =>
  fetch(`${BASE}/videos/${videoId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ progress }),
  }).then(r => r.json());

export const getNotesB = (videoId) =>
  fetch(`${BASE}/videos/${videoId}/notes`).then(r => r.json());

// ─── Tags ─────────────────────────────────────────────────────────────────────
export const fetchTags = (query = '') =>
  fetch(`${BASE}/tags?query=${encodeURIComponent(query)}`).then(r => r.json());

export const addTagToFolder = (folderId, tagName) =>
  fetch(`${BASE}/folders/${folderId}/tags`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tag_name: tagName }),
  }).then(r => r.json());

export const removeTagFromFolder = (folderId, tagName) =>
  fetch(`${BASE}/folders/${folderId}/tags`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tag_name: tagName }),
  }).then(r => r.json());

export const getTagsOfFolder = (folderId) =>
  fetch(`${BASE}/folders/${folderId}/tags`).then(r => r.json());

export const deleteUnmappedTags = () =>
  fetch(`${BASE}/tags`, { method: 'DELETE' }).then(r => r.json());

// ─── Video URL helper ─────────────────────────────────────────────────────────
export const getVideoUrl = (videoPath) =>
  `${BASE}/videos?video_path=${encodeURIComponent(videoPath)}`;

import { fetchMainFolders } from './api';

export const fetchStoredFolders = async () => {
  return await fetchMainFolders();
};

export const getLastFolderName = (path) => {
  if (!path) return '';
  const parts = path.split('/');
  const lastFolder = parts.pop() || parts.pop();
  return lastFolder.charAt(0).toUpperCase() + lastFolder.slice(1);
};

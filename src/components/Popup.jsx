'use client';
import React, { useEffect, useRef, useState, useCallback } from "react";
import { addMainFolder, fetchMainFolders, removeMainFolder } from "../utils/api";
const newFolderIcon = "/images/add-folder.png";

const Popup = ({ isOpen, onClose, onFoldersUpdate }) => {
  const [folderPath, setFolderPath] = useState("");
  const [folders, setFolders] = useState([]);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const inputRef = useRef(null);

  const loadFolders = async () => {
    const stored = await fetchMainFolders();
    setFolders(stored);
  };

  useEffect(() => {
    if (isOpen) {
      loadFolders();
      inputRef.current?.focus();
      setFolderPath("");
      setMessage("");
      setErrorMessage("");
    }
  }, [isOpen]);

  const handleKeyDown = useCallback((event) => {
    if (event.key === "Escape") onClose();
  }, [onClose]);

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!folderPath.trim()) return;
    try {
      await addMainFolder(folderPath);
      setErrorMessage("");
      setMessage("🎉 Folder added successfully!");
      await loadFolders();
      onFoldersUpdate();
      onClose();
    } catch (error) {
      setMessage("");
      setErrorMessage(error.message);
    }
    setFolderPath("");
  };

  const handleRemoveFolder = async (folder) => {
    await removeMainFolder(folder.id);
    setErrorMessage("");
    setMessage("🗑️ Folder removed successfully!");
    await loadFolders();
    onFoldersUpdate();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-opacity-70 bg-primarydark z-10">
      <div className="px-8 py-6 bg-primary lg:w-1/3 border border-colorborder relative md:w-1/2 sm:w-3/4 w-4/5">
        <button
          className="absolute top-0 right-2 text-colortext hover:text-red-400 text-xl"
          onClick={onClose}
          aria-label="Close popup"
        >
          &times;
        </button>
        <div className="mb-3">
          <h3 className="mb-3">Existing Folders</h3>
          <div className="max-h-40 flex-wrap text-sm flex">
            {folders.length ? (
              folders.map((folder) => (
                <div
                  key={folder.id}
                  className="px-2 py-1 border border-colorborder mr-3 mb-3 cursor-pointer hover:bg-gradient-to-r hover:from-gradientStart hover:to-gradientEnd rounded-sm transition-colors duration-200 ease-in-out"
                  onClick={() => handleRemoveFolder(folder)}
                >
                  {folder.path}
                </div>
              ))
            ) : (
              <div className="text-colortextsecondary text-xs">
                No folders available. Add a new folder below 👇
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center mb-4 mt-5">
          <img src={newFolderIcon} alt="Add folder" className="w-5 h-5 mr-3" />
          <h2 className="text-base font-semibold">Add a new folder</h2>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="relative flex items-center">
            <input
              type="text"
              value={folderPath}
              onChange={(e) => setFolderPath(e.target.value)}
              className="w-full py-1.5 bg-primarydark sm:text-sm sm:leading-6 border-colorborder border px-2 pr-10 mb-4"
              placeholder="Enter new folder path"
              ref={inputRef}
            />
            <button
              type="submit"
              className="absolute right-2 text-white rounded-md hover:bg-gradient-to-r hover:from-gradientStart hover:to-gradientEnd px-2 top-1.5"
            >
              ⏎
            </button>
          </div>
        </form>
        {message && <div className="text-colortextsecondary text-xs">{message}</div>}
        {errorMessage && <div className="text-colortextsecondary text-xs">{errorMessage}</div>}
      </div>
    </div>
  );
};

export default Popup;

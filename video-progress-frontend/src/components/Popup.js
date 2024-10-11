import React, { useEffect, useRef, useState } from "react";

const Popup = ({ isOpen, onClose, onFoldersUpdate }) => {
  const [folderPath, setFolderPath] = useState("");
  const [folders, setFolders] = useState([]);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const inputRef = useRef(null);

  const updateStoredFolders = () => {
    const storedFolders = JSON.parse(localStorage.getItem("folders")) || [];
    setFolders(storedFolders);
  };

  useEffect(() => {
    if (isOpen) {
      updateStoredFolders();
      inputRef.current?.focus(); // Focus on input box when popup opens
      setFolderPath("");
    }

    const handleKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const checkFolderExists = async (path) => {
    try {
      const response = await fetch(
        `http://localhost:8000/api/folder-exists/?folder_path=${encodeURIComponent(
          path
        )}`
      );
      if (!response.ok)
        throw new Error("🚫 Invalid path entered. Enter the full folder path.");
      return true;
    } catch (error) {
      setMessage("");
      setErrorMessage(error.message);
      return false;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!folderPath.trim()) return;
    const exists = await checkFolderExists(folderPath);
    if (exists) {
      const storedFolders = JSON.parse(localStorage.getItem("folders")) || [];
      if (!storedFolders.includes(folderPath)) {
        storedFolders.push(folderPath);
        localStorage.setItem("folders", JSON.stringify(storedFolders));
        setFolders(storedFolders);
        setErrorMessage("");
        setMessage("🎉 Folder added successfully!");
        onFoldersUpdate();
      } else {
        setMessage("");
        setErrorMessage("🚨 This folder is already in the list.");
      }
      setFolderPath("");
    }
  };

  const handleRemoveFolder = (folder) => {
    const updatedFolders = folders.filter((f) => f !== folder);
    localStorage.setItem("folders", JSON.stringify(updatedFolders));
    setFolders(updatedFolders);
    setErrorMessage("");
    setMessage("🗑️ Folder removed successfully!");
    onFoldersUpdate();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-opacity-70 bg-primarydark z-10">
      <div className="px-8 py-6 bg-primarydark w-1/3 border border-colorborder relative">
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
              folders.map((folder, index) => (
                <div
                  key={index}
                  className="px-2 py-1 border border-colorborder mr-3 mb-3 cursor-pointer hover:bg-red-600 rounded-md"
                  onClick={() => handleRemoveFolder(folder)}
                >
                  {folder}
                </div>
              ))
            ) : (
              <div className="text-colortextsecondary text-xs">
                No folders available. Add a new folder below 👇
              </div>
            )}
          </div>
        </div>
        <h2 className="text-base font-semibold mb-4">Add a new folder</h2>
        <form onSubmit={handleSubmit}>
          <div className="relative flex items-center">
            <input
              type="text"
              value={folderPath}
              onChange={(e) => setFolderPath(e.target.value)}
              className="w-full py-1.5 bg-primarydark sm:text-sm sm:leading-6 border-colorborder border px-2 mb-4"
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
        {message && (
          <div className="text-colortextsecondary text-xs">{message}</div>
        )}
        {errorMessage && (
          <div className="text-colortextsecondary text-xs">{errorMessage}</div>
        )}
      </div>
    </div>
  );
};

export default Popup;

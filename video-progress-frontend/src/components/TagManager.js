import React, { useEffect, useState } from "react";
import { fetchStoredFolders, getLastFolderName } from "../utils/folderUtils";
import { fetchFoldersByPath, fetchTags, addTagToFolder, removeTagFromFolder, deleteUnmappedTags } from "../utils/api";
import folderImg from "../assets/images/folder.png";
import downImg from "../assets/images/down.png";
import Tag from "./Tag";
import { getRandomColorPair } from "../utils/colorUtils";
import folderIcon from "../assets/images/folder-settings.png";

const TagManager = ({ isOpen, onClose, refreshTags }) => {
  const [folders, setFolders] = useState([]);
  const [expandedFolder, setExpandedFolder] = useState(null);
  const [subFolders, setSubFolders] = useState([]);
  const [selectedSubFolder, setSelectedSubFolder] = useState(null);
  const [newTag, setNewTag] = useState("");
  const [unusedTags, setUnusedTags] = useState([]);
  const [allTags, setAllTags] = useState([]); // Store all fetched tags

  // Effect to handle body overflow when the modal is open
  useEffect(() => {
    if (isOpen) {
      // Disable scrolling when modal is open
      document.body.style.overflow = 'hidden';
    } else {
      // Restore scrolling when modal is closed
      document.body.style.overflow = 'auto';
    }

    // Cleanup function to restore scroll on unmount or when modal closes
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      const loadFolders = async () => {
        const storedFolders = await fetchStoredFolders();
        setFolders(storedFolders);
      };
      loadFolders();
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      loadTags();
    }
  }, [isOpen, selectedSubFolder]);

  const loadTags = async () => {
    const fetchedTags = await fetchTags();
    setAllTags(
      fetchedTags.map((tag) => ({
        ...tag,
        color: tag.color || getRandomColorPair(),
      }))
    );
    if (selectedSubFolder) {
      const unusedTags = fetchedTags.filter(
        (tag) =>
          !selectedSubFolder.tags.some(
            (activeTag) => activeTag.name === tag.name
          )
      );
      setUnusedTags(
        unusedTags.map((tag) => ({
          ...tag,
          color: tag.color || getRandomColorPair(),
        }))
      );
    }
  };

  const handleSelectFolder = async (folder) => {
    if (expandedFolder === folder) {
      setExpandedFolder(null);
      setSubFolders([]);
      setSelectedSubFolder(null);
    } else {
      setExpandedFolder(folder);
      const fetchedSubFolders = await fetchFoldersByPath(folder.path);
      const subFoldersWithColor = fetchedSubFolders.map((subFolder) => ({
        ...subFolder,
        tags: subFolder.tags.map((tag) => ({
          ...tag,
          color: tag.color || getRandomColorPair(),
        })),
      }));
      setSubFolders(subFoldersWithColor);
    }
  };

  const handleSelectSubFolder = (subFolder) => {
    setSelectedSubFolder(subFolder);
    const updatedUnusedTags = allTags.filter(
      (tag) => !subFolder.tags.some((activeTag) => activeTag.name === tag.name)
    );
    setUnusedTags(updatedUnusedTags);
  };

  const handleAddTag = async (e) => {
    e.preventDefault();
    await addTag(newTag);
  };

  const addTag = async (tagName) => {
    if (tagName.trim() && selectedSubFolder) {
      const updatedTag = await addTagToFolder(
        selectedSubFolder.id,
        tagName.trim().toLowerCase()
      );

      const tagWithColor = {
        ...updatedTag,
        color: getRandomColorPair(),
      };

      selectedSubFolder.tags.push(tagWithColor);
      setSelectedSubFolder(selectedSubFolder);

      // Update allTags with the new tag
      setAllTags((prevTags) => [...prevTags, tagWithColor]);

      // Update unused tags based on the newly updated selectedSubFolder
      const updatedUnusedTags = allTags.filter(
        (tag) =>
          ![...selectedSubFolder.tags, tagWithColor].some(
            (activeTag) => activeTag.name === tag.name
          )
      );
      setUnusedTags(updatedUnusedTags);

      setNewTag(""); // Clear the input
      refreshTags(selectedSubFolder.id);
    }
  }

  const removeTag = async (tag) => {
    if (tag.name.trim() && selectedSubFolder) {
      await removeTagFromFolder(selectedSubFolder.id, tag.name);
      
      const indexToRemove = selectedSubFolder.tags.findIndex(t => t.name === tag.name);
      if (indexToRemove !== -1) {
        selectedSubFolder.tags.splice(indexToRemove, 1); // Remove the tag at the found index

        // Update the state with the modified tags array
        setSelectedSubFolder(selectedSubFolder);
        unusedTags.push(tag);
        setUnusedTags(unusedTags);
      }

      setAllTags((prevTags) => prevTags.filter(t => t.name !== tag.name));
      refreshTags(selectedSubFolder.id);
    }
  }

  // New function to handle tag clicks from unusedTags
  const handleTagClick = async (tagName) => {
    await addTag(tagName)
  };

  const handleTagRemoveClick = async (tag) => {
    await removeTag(tag);
  };

  const handleDeleteUnmappedTags = async () => {
    try {
      await deleteUnmappedTags();
      loadTags();
      refreshTags(selectedSubFolder?.id)
    } catch (error) {
      alert('Failed to delete unmapped tags.');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-opacity-70 bg-primarydark z-10 py-24">
      <div className="bg-primary lg:w-2/3 border border-colorborder h-full relative md:w-5/6 sm:mx-4 w-full mx-2">
        <button
          onClick={onClose}
          className="absolute top-3.5 right-4 text-xl hover:text-red-400"
        >
          &times;
        </button>
        <div className="text-xl font-semibold w-full h-p10 flex items-center px-4 border-b border-colorborder min-h-14">
          <img
            src={folderIcon}
            alt="Settings"
            className="w-6 h-6 mr-4" // Add margin to the right of the icon
          />
          Folder Manager
        </div>
        <div className="h-p90 flex">
          <ul className="flex flex-col w-2/5 px-3 py-1 pb-8 mt-3 mb-3 overflow-y-scroll">
            {folders.map((folder, index) => (
              <li key={index}>
                <div
                  onClick={() => handleSelectFolder(folder)}
                  className={`flex items-start hover:cursor-pointer transform duration-200 ease-in-out hover:bg-colorsecondary py-2 rounded border-l-4 ${
                    expandedFolder === folder && selectedSubFolder === null
                      ? "border-l-gradientEnd rounded-l-none bg-colorsecondary"
                      : "border-l-transparent"
                  }`}
                >
                  <img
                    src={downImg}
                    alt="arrow"
                    className={`w-5 pt-0.5 pr-0.5 mr-2 ml-2 transition-transform duration-200 ${
                      expandedFolder === folder ? "rotate-30" : "-rotate-90"
                    }`}
                  />
                  <img
                    src={folderImg}
                    alt="Folder"
                    className="w-5 pt-0.5 pr-0.5 mr-2"
                  />
                  <div className="text-wrap break-all">
                    {getLastFolderName(folder)}
                  </div>
                </div>
                {expandedFolder === folder && subFolders.length > 0 && (
                  <ul>
                    {subFolders.map((subFolder, subIndex) => (
                      <li
                        key={subIndex} // Use subFolder.id as the key
                        className={`flex items-center py-2 pl-11 pr-2 mt-1 rounded border-l-4 hover:cursor-pointer hover:bg-colorsecondary ${
                          selectedSubFolder === subFolder
                            ? "border-l-gradientEnd rounded-l-none bg-colorsecondary"
                            : "border-l-transparent"
                        }`}
                        onClick={() => handleSelectSubFolder(subFolder)}
                      >
                        <img
                          src={folderImg}
                          alt="Subfolder"
                          className="w-4 mr-3"
                        />
                        {subFolder.name}
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
          <div className="w-3/4 p-4">
            {selectedSubFolder ? (
              <div>
                <h2 className="text-xl font-semibold mb-2">
                  {selectedSubFolder.name}
                </h2>
                <p className="text-sm font-mono">{selectedSubFolder.path}</p>

                <div className="flex mt-5 items-center">
                  <div className="mr-2 font-semibold text-gradientStart">
                    🔖{" "}
                  </div>
                  <div className="flex flex-wrap gap-2 min-h-8">
                    {selectedSubFolder.tags.length > 0 ? (
                      selectedSubFolder.tags.map((tag, innerIndex) => (
                        <span
                          key={innerIndex}
                          className="hover:cursor-pointer hover:scale-105 transform ease-in-out duration-200"
                          onClick={() => handleTagRemoveClick(tag)}
                        >
                          <Tag text={tag.name} color={tag.color} />
                        </span>
                      ))
                    ) : (
                      <p className="flex items-center font-medium text-colortextsecondary text-sm">
                        No tags, add some below
                      </p>
                    )}
                  </div>
                </div>

                <div className="relative flex items-center w-2/6 mt-6 mb-3">
                  <form onSubmit={handleAddTag} className="w-full">
                    <input
                      type="text"
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      className="w-full py-1.5 bg-primarydark sm:text-sm sm:leading-6 border-colorborder border px-2 pr-10 mb-4 rounded-sm"
                      placeholder="# add a tag"
                    />
                    <button
                      type="submit"
                      className="absolute right-2 text-white rounded-md hover:bg-gradient-to-r hover:from-gradientStart hover:to-gradientEnd px-2 top-2"
                    >
                      ⏎
                    </button>
                  </form>
                </div>

                {unusedTags.length > 0 && (
                  <div className="mb-2.5 font-medium text-colortextsecondary text-sm">
                    Click these to tag folder directly
                  </div>
                )}

                <div className="flex flex-wrap gap-2 mb-6 mt-4">
                  {unusedTags.map((tag) => (
                    <span
                      key={tag.id}
                      className="hover:cursor-pointer hover:scale-105 transform ease-in-out duration-200"
                      onClick={() => handleTagClick(tag.name)}
                    >
                      <Tag key={tag.id} text={tag.name} color={tag.color} />
                    </span>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-gray-500">
                Select a subfolder to see its details.
              </p>
            )}
          </div>
        </div>
        <div className="mt-4 absolute bottom-5 right-5">
          <button
            onClick={handleDeleteUnmappedTags}
            className="hover:text-red-500 text-colortextsecondary text-sm font-medium hover:scale-105 transform ease-in-out duration-200"
          >
            🗑️ Delete Unmapped Tags❗
          </button>
        </div>
      </div>
    </div>
  );
};

export default TagManager;

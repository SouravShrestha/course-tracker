'use client';
import React, { useEffect, useState } from "react";
import { fetchTags, addTagToFolder, removeTagFromFolder, removeMainFolder, fetchMainFolders } from "../utils/api";
const folderImg = "/images/folder.png";
import Tag from "./Tag";
import { getRandomColorPair } from "../utils/colorUtils";
const folderIcon = "/images/folder-settings.png";
const trashIcon = "/images/bin.png";

const TagManager = ({ isOpen, onClose, refreshTags, onFolderRemoved }) => {
  const [courses, setCourses] = useState([]);
  const [mainFolders, setMainFolders] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [newTag, setNewTag] = useState("");
  const [unusedTags, setUnusedTags] = useState([]);
  const [allTags, setAllTags] = useState([]);
  const [confirmRemove, setConfirmRemove] = useState(null); // { item: mainFolder }

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
    return () => { document.body.style.overflow = 'auto'; };
  }, [isOpen]);

  useEffect(() => {
    const handleEscapeKey = (event) => {
      if (event.key === "Escape") onClose();
    };
    if (isOpen) {
      document.addEventListener("keydown", handleEscapeKey);
    } else {
      document.removeEventListener("keydown", handleEscapeKey);
    }
    return () => document.removeEventListener("keydown", handleEscapeKey);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  const loadData = async () => {
    const [allFolders, mf, fetchedTags] = await Promise.all([
      fetch('/api/folders').then(r => r.json()),
      fetchMainFolders(),
      fetchTags(),
    ]);
    const tagsWithColor = fetchedTags.map(t => ({ ...t, color: getRandomColorPair() }));
    setAllTags(tagsWithColor);
    setMainFolders(mf);
    setCourses(allFolders.map(f => ({
      ...f,
      tags: f.tags.map(t => ({ ...t, color: getRandomColorPair() })),
    })));
  };

  const handleSelectCourse = (course) => {
    setSelectedCourse(course);
    const unused = allTags.filter(t => !course.tags.some(ct => ct.name === t.name));
    setUnusedTags(unused);
  };

  const handleAddTag = async (e) => {
    e.preventDefault();
    await addTag(newTag);
  };

  const addTag = async (tagName) => {
    if (!tagName.trim() || !selectedCourse) return;
    const updatedTag = await addTagToFolder(selectedCourse.id, tagName.trim().toLowerCase());
    const tagWithColor = { ...updatedTag, color: getRandomColorPair() };

    const updatedCourse = { ...selectedCourse, tags: [...selectedCourse.tags, tagWithColor] };
    setSelectedCourse(updatedCourse);
    setCourses(prev => prev.map(c => c.id === updatedCourse.id ? updatedCourse : c));
    setAllTags(prev => prev.some(t => t.name === tagWithColor.name) ? prev : [...prev, tagWithColor]);
    setUnusedTags(prev => prev.filter(t => t.name !== tagWithColor.name));
    setNewTag("");
    refreshTags(selectedCourse.id);
  };

  const removeTag = async (tag) => {
    if (!selectedCourse) return;
    await removeTagFromFolder(selectedCourse.id, tag.name);
    const updatedCourse = { ...selectedCourse, tags: selectedCourse.tags.filter(t => t.name !== tag.name) };
    setSelectedCourse(updatedCourse);
    setCourses(prev => prev.map(c => c.id === updatedCourse.id ? updatedCourse : c));
    setUnusedTags(prev => [...prev, tag]);
    refreshTags(selectedCourse.id);
  };

  const handleRemoveMainFolder = async (mf) => {
    await removeMainFolder(mf.id);
    setConfirmRemove(null);
    setSelectedCourse(null);
    await loadData();
    onFolderRemoved?.();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-opacity-70 bg-primarydark z-10 py-24">
      <div className="bg-primary lg:w-2/3 border border-colorborder h-full relative md:w-5/6 sm:mx-4 w-full mx-2 flex flex-col">
        <button onClick={onClose} className="absolute top-3.5 right-4 text-xl hover:text-red-400">
          &times;
        </button>

        {/* Header */}
        <div className="text-xl font-semibold w-full flex items-center px-4 border-b border-colorborder min-h-14 shrink-0">
          <img src={folderIcon} alt="Folder Manager" className="w-6 h-6 mr-4" />
          Folder Manager
        </div>

        {/* Body */}
        <div className="flex flex-1 overflow-hidden">

          {/* Left panel: course list */}
          <div className="w-2/5 border-r border-colorborder flex flex-col overflow-hidden">
            <div className="px-4 py-2.5 text-xs font-semibold text-colortextsecondary uppercase tracking-wider border-b border-colorborder shrink-0">
              Courses
            </div>
            <ul className="overflow-y-auto flex-1 py-1">
              {courses.length === 0 && (
                <li className="px-4 py-3 text-sm text-colortextsecondary">No courses found.</li>
              )}
              {courses.map((course) => (
                <li key={course.id}>
                  <div
                    onClick={() => handleSelectCourse(course)}
                    className={`flex items-center px-4 py-2.5 cursor-pointer hover:bg-colorsecondary border-l-4 transition-colors duration-150 ${
                      selectedCourse?.id === course.id
                        ? "border-l-gradientEnd bg-colorsecondary"
                        : "border-l-transparent"
                    }`}
                  >
                    <img src={folderImg} alt="Folder" className="w-4 h-4 mr-2.5 shrink-0" />
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">{course.name}</div>
                      <div className="text-xs text-colortextsecondary truncate font-mono">{course.path}</div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>

            {/* Main folders section */}
            <div className="border-t border-colorborder shrink-0">
              <div className="px-4 py-2.5 text-xs font-semibold text-colortextsecondary uppercase tracking-wider border-b border-colorborder">
                Main Folders
              </div>
              <ul className="py-1 max-h-36 overflow-y-auto">
                {mainFolders.map((mf) => (
                  <li key={mf.id} className="flex items-center justify-between px-4 py-2 hover:bg-colorsecondary">
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">{mf.name}</div>
                      <div className="text-xs text-colortextsecondary truncate font-mono">{mf.path}</div>
                    </div>
                    <button
                      onClick={() => setConfirmRemove({ item: mf })}
                      className="ml-2 shrink-0 text-colortextsecondary hover:text-red-400 transition-colors duration-150 p-1"
                      title="Remove main folder"
                    >
                      <img src={trashIcon} alt="Remove" className="w-4 h-4 opacity-70 hover:opacity-100" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Right panel: tag management */}
          <div className="flex-1 p-5 overflow-y-auto">
            {selectedCourse ? (
              <div>
                <h2 className="text-lg font-semibold mb-0.5">{selectedCourse.name}</h2>
                <p className="text-xs font-mono text-colortextsecondary mb-5">{selectedCourse.path}</p>

                {/* Active tags */}
                <div className="flex items-start mb-5">
                  <div className="mr-2 font-semibold text-gradientStart mt-0.5">🔖</div>
                  <div className="flex flex-wrap gap-2 min-h-8">
                    {selectedCourse.tags.length > 0 ? (
                      selectedCourse.tags.map((tag, i) => (
                        <span
                          key={i}
                          className="hover:cursor-pointer hover:scale-105 transform ease-in-out duration-200"
                          onClick={() => removeTag(tag)}
                        >
                          <Tag text={tag.name} color={tag.color} />
                        </span>
                      ))
                    ) : (
                      <p className="flex items-center font-medium text-colortextsecondary text-sm">
                        No tags — add some below
                      </p>
                    )}
                  </div>
                </div>

                {/* Add tag input */}
                <div className="relative flex items-center w-52 mb-3">
                  <form onSubmit={handleAddTag} className="w-full">
                    <input
                      type="text"
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      className="w-full py-1.5 bg-primarydark text-sm border-colorborder border px-2 pr-10 rounded-sm"
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

                {/* Unused tags (click to add) */}
                {unusedTags.length > 0 && (
                  <>
                    <div className="mb-2 font-medium text-colortextsecondary text-xs uppercase tracking-wide">
                      Click to add
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {unusedTags.map((tag) => (
                        <span
                          key={tag.id}
                          className="hover:cursor-pointer hover:scale-105 transform ease-in-out duration-200"
                          onClick={() => addTag(tag.name)}
                        >
                          <Tag text={tag.name} color={tag.color} />
                        </span>
                      ))}
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-colortextsecondary text-sm">
                <img src={folderImg} alt="Select a course" className="w-12 h-12 mb-3 opacity-30" />
                <p>Select a course to manage its tags</p>
              </div>
            )}
          </div>
        </div>

        {/* Confirm remove main folder dialog */}
        {confirmRemove && (
          <div className="absolute inset-0 flex items-center justify-center bg-primarydark bg-opacity-80 z-20">
            <div className="bg-primary border border-colorborder rounded-sm p-6 max-w-sm w-full mx-4 shadow-lg">
              <p className="text-sm font-medium mb-1">Remove this main folder and all its courses?</p>
              <p className="text-xs text-colortextsecondary font-mono mb-3 break-all">
                {confirmRemove.item.path}
              </p>
              <p className="text-xs text-red-400 mb-5">
              All courses inside this folder will be removed from the tracker.
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setConfirmRemove(null)}
                  className="px-4 py-1.5 text-sm border border-colorborder rounded-sm hover:bg-colorsecondary"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleRemoveMainFolder(confirmRemove.item)}
                  className="px-4 py-1.5 text-sm bg-red-500 hover:bg-red-600 text-white rounded-sm"
                >
                  Remove
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TagManager;

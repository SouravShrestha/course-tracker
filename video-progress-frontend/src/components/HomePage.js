import React, { useEffect, useState } from "react";
import CourseCard from "./CourseCard";
import Popup from "./Popup";
import downArrowImg from "../assets/images/down-arrow.png";

const HomePage = () => {
  const [courses, setCourses] = useState([]);
  const [, setFolders] = useState([]);
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [validPaths, setValidPaths] = useState({}); 

  // Fetch stored folders from local storage
  const fetchStoredFolders = () => {
    const storedFolders = JSON.parse(localStorage.getItem("folders")) || [];
    setFolders(storedFolders);
    return storedFolders;
  };

  const fetchCourses = async (storedFolders) => {
    try {
      const response = await fetch("http://localhost:8000/api/folders");
      if (!response.ok) throw new Error("Network response was not ok");

      const data = await response.json();
      const filteredCourses = data
        .filter((course) => storedFolders.includes(course.main_folder_path))
        .sort((a, b) => a.name.localeCompare(b.name));
      setCourses(filteredCourses);
    } catch (error) {
      console.error("Error fetching courses:", error);
    }
  };

  const scanFolders = async () => {
    const storedFolders = JSON.parse(localStorage.getItem("folders"));
    for (const folder of storedFolders) {
      const scanResponse = await fetch(
        "http://localhost:8000/api/scan-folder",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ main_folder_path: folder }), // Use each folder from local storage
        }
      );
      if (!scanResponse.ok) console.error(`Failed to scan folder: ${folder}`);
      fetchCourses(storedFolders);
    }
  };

  // New function to refresh courses
  const refreshCourses = () => {
    const storedFolders = fetchStoredFolders();
    fetchCourses(storedFolders);
  };

  useEffect(() => {
    scanFolders();
    refreshCourses(); // Fetch courses when component mounts
  }, []); // Runs once on mount

  const handleFolderUpdate = async () => {
    await scanFolders();
    refreshCourses();
  };

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
      return false;
    }
  };

  useEffect(() => {
    const validatePaths = async () => {
      const validationResults = {};
      for (const course of courses) {
        validationResults[course.id] = await checkFolderExists(course.path);
      }
      setValidPaths(validationResults);
    };

    if (courses.length > 0) {
      validatePaths();
    }
  }, [courses]);

  return (
    <div className="p-4 px-6">
      <div className="flex items-center absolute right-6 top-5">
        <button
          className="px-4 py-2 text-colorText h-9 text-xs font-semibold transition-transform duration-150 ease-in-out hover:scale-105 bg-gradient-to-r from-gradientStart to-gradientEnd rounded-md"
          onClick={() => setIsPopupOpen(true)}
        >
          Add folder
        </button>
      </div>

      <Popup
        isOpen={isPopupOpen}
        onClose={() => setIsPopupOpen(false)}
        onFoldersUpdate={handleFolderUpdate}
      />

      <div className="text-xl font-semibold flex select-none">
        Scanned collection
        <img
          src={downArrowImg}
          alt="Arrow Icon"
          className="inline-block w-6 h-6 ml-3 mt-2.5"
        />
      </div>
      {courses.length > 0 ? (
        <div className="course-list flex w-full justify-between flex-wrap">
          {courses.map((course) =>
            validPaths[course.id] ? (
              <CourseCard key={course.id} course={course} />
            ) : null
          )}
        </div>
      ) : (
        <p className="mt-5 text-sm text-colortextsecondary">
          🥺 No courses available. Try adding a new folder.
        </p>
      )}
    </div>
  );
};

export default HomePage;
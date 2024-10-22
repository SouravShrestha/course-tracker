import React, { useEffect, useState } from "react";
import CourseCard from "./CourseCard";
import Popup from "./Popup";
import downArrowImg from "../assets/images/down-arrow.png";
import loadingGif from "../assets/images/loading.gif";
import { scanFolder, checkFolderExists } from "../utils/api";
import { fetchStoredFolders } from "../utils/folderUtils";

const HomePage = () => {
  const [scannedMainFolders, setScannedMainFolders] = useState([]);
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [validPaths, setValidPaths] = useState({}); // to display only the courses that have valid video file inside folder structure
  const [loading, setLoading] = useState(false);

  const scanFolders = async () => {

    const storedMainFolders = fetchStoredFolders();
    if (storedMainFolders.length === 0) {
      setScannedMainFolders([]);
      return;
    }

    setLoading(true);

    try {
      const scanResponses = await Promise.all(
        storedMainFolders.map(scanFolder)
      );

      setScannedMainFolders((prevCourses) => {
        const existingIds = new Set(prevCourses.map((course) => course.id));

        return scanResponses.reduce(
          (acc, scanResponse) => {
            if (!existingIds.has(scanResponse.id)) {
              acc.push({
                id: scanResponse.id,
                name: scanResponse.name,
                main_folder_path: scanResponse.path,
                folders: scanResponse.folders,
              });
            }
            return acc;
          },
          [...prevCourses]
        );
      });
    } catch (error) {
      console.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    scanFolders();
  }, []);

  useEffect(() => {
    const validatePaths = async () => {
      const validationPromises = scannedMainFolders.flatMap((mainFolder) =>
        mainFolder.folders.map(async (course) => {
          const exists = await checkFolderExists(course.path);
          return { id: course.id, exists };
        })
      );

      const results = await Promise.all(validationPromises);
      const validationResults = Object.fromEntries(
        results.map(({ id, exists }) => [id, exists])
      );

      setValidPaths(validationResults);
    };

    if (scannedMainFolders.length > 0) {
      validatePaths();
    }
  }, [scannedMainFolders]);

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
        onFoldersUpdate={scanFolders}
      />

      <div className="text-xl font-semibold flex select-none">
        Scanned collection
        <img
          src={downArrowImg}
          alt="Arrow Icon"
          className="inline-block w-6 h-6 ml-3 mt-2.5"
        />
      </div>
      {scannedMainFolders.length > 0 ? (
        <div className="course-list flex w-full justify-between flex-wrap">
          {scannedMainFolders.map((scannedFolder) =>
            scannedFolder.folders.map((course) =>
              validPaths[course.id] ? (
                <CourseCard key={course.id} course={course} />
              ) : null
            )
          )}
        </div>
      ) : (
        !loading && (
          <p className="mt-5 text-sm text-colortextsecondary">
            🥺 No courses available. Try adding a new folder.
          </p>
        )
      )}

      {loading && (
        <div className="fixed bottom-6 right-6 z-30 py-1.5 px-3 bg-primarydark text-white rounded-lg shadow-md border border-colorborder flex items-center space-x-2">
          <img src={loadingGif} alt="Loading..." className="w-6 h-6" />
          <span className="text-sm">Scanning folders for changes</span>
        </div>
      )}
    </div>
  );
};

export default HomePage;

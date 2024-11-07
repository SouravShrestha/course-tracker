import React, { useEffect, useState, useRef } from "react";
import CourseCard from "./CourseCard";
import Popup from "./Popup";
import loadingGif from "../assets/images/loading.gif";
import { scanFolder, checkFolderExists, getTagsOfFolder } from "../utils/api";
import { fetchStoredFolders } from "../utils/folderUtils";
import { getRandomColorPair } from "../utils/colorUtils";
import Tag from "./Tag";
import { fetchTags } from "../utils/api";
import TagManager from "./TagManager";
import settingsIcon from "../assets/images/settings.png";
import folderIcon from "../assets/images/folder-settings.png";
import newFolderIcon from "../assets/images/add-folder.png";
import starIcon from "../assets/images/star.png";
import sleepIcon from "../assets/images/sleep.png";

const HomePage = () => {
  const [scannedMainFolders, setScannedMainFolders] = useState([]);
  const [filteredCourses, setFilteredCourses] = useState([]);
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [isTagManagerOpen, setIsTagManagerOpen] = useState(false);
  const [validPaths, setValidPaths] = useState({});
  const [loading, setLoading] = useState(false);
  const [tags, setTags] = useState(null);
  const [filterTags, setFilterTags] = useState(null);
  const [tagColors, setTagColors] = useState({});
  const [folderColors, setFolderColors] = useState({});
  const firstRenderRef = useRef(true); // Use a ref to track first render
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null); // Reference to the dropdown menu

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

      scanResponses.forEach((response) => {
        // Iterate over each folder in the current response
        response.folders.forEach((folder) => {
          // Iterate over each tag in the current folder
          folder.tags = folder.tags.map((tag) => {
            const color = getTagColor(tag.id);
            // Return the updated tag with the color property
            return {
              ...tag, // Spread the current tag properties
              color: color, // Set the color using getTagColor
            };
          });
        });
      });

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

  // Step 1: get the stored filterTags on render
  useEffect(() => {
    const storedFilterTags = JSON.parse(localStorage.getItem("filterTags"));
    if (storedFilterTags) {
      storedFilterTags.map((tag) => (tag.color = getTagColor(tag.id)));
      setFilterTags(storedFilterTags);
    }
  }, []);

  // Step 2: update the tags only after loading filterTags
  useEffect(() => {
    if(filterTags){
      updateTags();
    }
  }, [filterTags]);

  useEffect(() => {
    if (firstRenderRef.current && tags) {
      scanFolders(); // Call scanFolders only after tags are updated
      firstRenderRef.current = false; // Set to false to prevent this from running again
    }
  }, [tags]);

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

  useEffect(() => {
    // Filter courses based on filterTags
    scannedMainFolders.map((folder) => {
      // Filter the courses in the current folder
      const filteredCourses =
        filterTags.length > 0
          ? folder.folders.filter((course) =>
              course.tags.some((courseTag) =>
                filterTags.some((filterTag) => filterTag.id === courseTag.id)
              )
            )
          : folder.folders;
      setFilteredCourses(filteredCourses)
      localStorage.setItem("filterTags", JSON.stringify(filterTags));
    });
  }, [filterTags, scannedMainFolders]);

  const updateTags = async (folderId) => {
    try {
      var fetchedTags = await fetchTags();
      setFilterTags((prevFilterTags) => {
        const fetchedTagIds = new Set(fetchedTags.map(tag => tag.id));
        const filtered = prevFilterTags.filter(tag => fetchedTagIds.has(tag.id));
        return filtered;
      });
      const updatedTags = fetchedTags
        .filter(
          (tag) => !filterTags.some((filterTag) => filterTag.id === tag.id) // Exclude tags already in filterTags
        )
        .map((tag) => {
          return {
            ...tag, // Spread the tag properties
            color: getTagColor(tag.id), // Set the tag color using the getTagColor function
          };
        });
      setTags(updatedTags);
      if(folderId){
        refreshCourseTags(folderId);
      }
    } catch (error) {
      console.error("Error fetching tags:", error);
    }
  };

  const refreshTags = (folderId) => {
    updateTags(folderId);
  };

  const refreshCourseTags = async (folderId) => {
    try {
      if (!folderId) return;
      const fetchedTags = await getTagsOfFolder(folderId);
      // Map over each fetched tag and assign the appropriate color
      const updatedTags = fetchedTags.map((tag) => {
        return {
          ...tag, // Spread the tag properties
          color: getTagColor(tag.id), // Set the tag color using the getTagColor function
        };
      });

      // Update the specific course's tags in scannedMainFolders
      setScannedMainFolders((prevFolders) =>
        prevFolders.map((scannedFolder) => ({
          ...scannedFolder,
          folders: scannedFolder.folders.map(
            (course) =>
              course.id === folderId
                ? { ...course, tags: updatedTags } // Update the tags for this course
                : course // Return the course as is if it doesn't match
          ),
        }))
      );
    } catch (error) {
      console.error("Error refreshing course tags:", error);
    }
  };

  const getFolderColor = (folderId) => {
    if (!folderColors[folderId]) {
      const { gradient, darkerShade } = getRandomColorPair();
      setFolderColors((prevColors) => ({
        ...prevColors,
        [folderId]: { gradient, darkerShade },
      }));
      return { gradient, darkerShade };
    }
    return folderColors[folderId]; // Return the existing color
  };

  const getTagColor = (tagId) => {
    if (!tagColors[tagId]) {
      const { gradient, darkerShade } = getRandomColorPair();
      setTagColors((prevColors) => ({
        ...prevColors,
        [tagId]: { gradient, darkerShade },
      }));
      return { gradient, darkerShade };
    }
    return tagColors[tagId]; // Return the existing color
  };

  const toggleDropdown = () => {
    setDropdownOpen(!dropdownOpen);
  };

  const addToFilter = (tag) => {
    tag.color = getTagColor(tag.id);
    setFilterTags((prevTags) => {
      // If the tag is already in filterTags, return the previous state
      if (prevTags.some((t) => t.id === tag.id)) {
        return prevTags; // Tag already in filter, do nothing
      }
      return [...prevTags, tag]; // Otherwise, add it to the filterTags
    });
    setTags((prevTags) => {
      return prevTags.filter((t) => t.id !== tag.id);
    });
  }

  const removeFromFilter = (tag) => {
    setFilterTags((prevTags) => {
      return prevTags.filter((t) => t.id !== tag.id);
    });
    setTags((prevTags) => {
      // If the tag is already in filterTags, return the previous state
      if (prevTags.some((t) => t.id === tag.id)) {
        return prevTags; // Tag already in filter, do nothing
      }
      return [...prevTags, tag]; // Otherwise, add it to the filterTags
    });
  }

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <div className="p-4 px-6">
      <div className="absolute right-5 top-5">
        {/* Settings button (Dropdown menu) */}
        <button
          className="py-1.5 transition-transform duration-150 ease-in-out hover:scale-105 flex items-center"
          onClick={toggleDropdown}
        >
          <img
            src={settingsIcon}
            alt="Settings"
            className="h-6 aspect-auto transition-transform duration-150 ease-in-out hover:scale-105 cursor-pointer filter-secondary"
          />
          <span className="ml-1.5 font-meidum text-sm text-colortextsecondary">
            Manage
          </span>
        </button>

        {/* Dropdown Menu */}
        {dropdownOpen && (
          <div
            ref={dropdownRef}
            className="absolute right-0 mt-2 bg-primarydark shadow-sm rounded-sm w-52 py-2 border border-colorborder z-20"
          >
            <button
              onClick={() => {
                setIsPopupOpen(true);
                setDropdownOpen(false); // Close the dropdown after selecting
              }}
              className="w-full px-4 py-2 text-colortext hover:bg-primary flex items-center text-sm font-medium mb-1"
            >
              <img
                src={newFolderIcon}
                alt="Settings"
                className="w-4 h-4 mr-3" // Add margin to the right of the icon
              />
              Add a new folder
            </button>
            <button
              onClick={() => {
                setIsTagManagerOpen(true);
                setDropdownOpen(false); // Close the dropdown after selecting
              }}
              className="w-full px-4 py-2 text-colortext hover:bg-primary flex items-center text-sm font-medium"
            >
              <img
                src={folderIcon}
                alt="Settings"
                className="w-4 h-4 mr-3" // Add margin to the right of the icon
              />
              Folder Manager
            </button>
          </div>
        )}
      </div>

      <Popup
        isOpen={isPopupOpen}
        onClose={() => setIsPopupOpen(false)}
        onFoldersUpdate={scanFolders}
      />

      <TagManager
        isOpen={isTagManagerOpen}
        onClose={() => setIsTagManagerOpen(false)} // Close TagManager
        refreshTags={refreshTags}
      />

      {/* Horizontal list of active tags */}
      {filterTags?.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2 items-start min-h-10">
          <div className="w-7">
            <img
              src={starIcon}
              alt="Star"
              className="w-7 h-7 mr-1 mt-0.5" // Add margin to the right of the icon
            />
          </div>
          {filterTags.map((tag) => (
            <span
              key={tag.id}
              className="hover:cursor-pointer hover:scale-105 transform ease-in-out duration-200 "
              onClick={() => removeFromFilter(tag)}
            >
              <Tag text={tag.name} color={tag.color} />
            </span>
          ))}
        </div>
      )}

      {/* Horizontal list of inactive tags */}
      {tags?.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-6 mt-3 min-h-10">
          <div className="w-7">
            <img
              src={sleepIcon}
              alt="Sleep"
              className="w-5 h-5 mr-1 ml-1 mt-1.5" // Add margin to the right of the icon
            />
          </div>
          {tags.map((tag) => (
            <span
              key={tag.id}
              className="hover:cursor-pointer hover:scale-105 transform ease-in-out duration-200"
              onClick={() => addToFilter(tag)}
            >
              <Tag text={tag.name} isInactive={true} />
            </span>
          ))}
        </div>
      )}

      {/* Render Courses */}
      {filteredCourses.length > 0 ? (
        <div className="course-list grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-10 mt-4">
          {filteredCourses.map((course) =>
            validPaths[course.id] ? (
              <CourseCard
                key={course.id}
                course={course}
                courseColor={getFolderColor(course.id)}
              />
            ) : null
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

import React, { useEffect, useState, useRef, useMemo } from "react";
import CourseCard from "./CourseCard";
import CourseCardTiny from "./CourseCardTiny";
import Popup from "./Popup";
import loadingGif from "../assets/images/loading.gif";
import {
  scanMainFolder,
  checkFolderExists,
  getTagsOfFolder,
  scanFolder,
} from "../utils/api";
import { fetchStoredFolders } from "../utils/folderUtils";
import { getRandomColorPair } from "../utils/colorUtils";
import Tag from "./Tag";
import { fetchTags } from "../utils/api";
import TagManager from "./TagManager";
import folderIcon from "../assets/images/folder-settings.png";
import newFolderIcon from "../assets/images/add-folder.png";
import starIcon from "../assets/images/star.png";
import sleepIcon from "../assets/images/sleep.png";
import downIcon from "../assets/images/down.png";
import Search from "./Search";
import Masonry from "react-masonry-css";

const HomePage = () => {
  const [scannedFolders, setScannedFolders] = useState(null);
  const [foldersToScan, setFoldersToScan] = useState(null);
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
      setScannedFolders([]);
      return;
    }

    try {
      const scanResponses = await Promise.all(
        storedMainFolders.map(scanMainFolder)
      );

      const flatFolders = scanResponses.flatMap((response) =>
        response.map((folder) => {
          // Add the color property to each tag in the folder
          folder.tags = folder.tags.map((tag) => ({
            ...tag,
            color: getTagColor(tag.id), // Get the color for each tag
          }));
          return folder; // Return the updated folder
        })
      );
      setFoldersToScan(flatFolders);
    } catch (error) {
      console.error(error.message);
    }
  };

  useEffect(() => {
    const scanAllFolders = async () => {
      if (foldersToScan && foldersToScan.length > 0) {
        setScannedFolders(null);
        let scannedCount = 0;
        for (const folder of foldersToScan) {
          try {
            const temp = await scanFolder(folder.path);

            temp.tags = temp.tags.map((tag) => ({
              ...tag,
              color: getTagColor(tag.id), // Get the color for each tag
            }));
            setScannedFolders((prev) => [...(prev || []), temp]);
          } catch (error) {
            // Ignore the error or log it if you need
            console.warn(`Error scanning folder ${folder.path}:`, error);
          }
        }
      }
      setLoading(false);
    };

    scanAllFolders();
  }, [foldersToScan]);

  const topRecentFolders = useMemo(() => {
    if (!scannedFolders) return [];
  
  // Filter, sort, and slice in one step
  return scannedFolders
    .filter((folder) => folder.last_played_at !== null)
    .sort((a, b) => new Date(b.last_played_at) - new Date(a.last_played_at))
    .slice(0, 4);
  }, [scannedFolders]);

  // Step 1: get the stored filterTags on render
  useEffect(() => {
    setLoading(true);
    const storedFilterTags = JSON.parse(localStorage.getItem("filterTags"));
    if (storedFilterTags) {
      storedFilterTags.map((tag) => (tag.color = getTagColor(tag.id)));
      setFilterTags(storedFilterTags);
    } else {
      setFilterTags([]);
    }
  }, []);

  // Step 2: update the tags only after loading filterTags
  useEffect(() => {
    if (filterTags) {
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
      const validationPromises = scannedFolders.map(async (course) => {
        const exists = await checkFolderExists(course.path);
        return { id: course.id, exists };
      });

      const results = await Promise.all(validationPromises);
      const validationResults = Object.fromEntries(
        results.map(({ id, exists }) => [id, exists])
      );

      setValidPaths(validationResults);
    };

    if (scannedFolders && scannedFolders.length > 0) {
      validatePaths();
    }
  }, [scannedFolders]);


  const filteredCourses_ = useMemo(() => 
    filterTags?.length 
      ? scannedFolders.filter(folder => 
          folder.tags.some(folderTag => 
            filterTags.some(filterTag => filterTag.id === folderTag.id)
          )
        ) 
      : scannedFolders, 
    [filterTags, scannedFolders]
  );
  
  useEffect(() => {
    if (scannedFolders) {
      setFilteredCourses(filteredCourses_);
      localStorage.setItem("filterTags", JSON.stringify(filterTags));
    }
  }, [filterTags, scannedFolders]);

  const updateTags = async (folderId) => {
    try {
      var fetchedTags = await fetchTags();
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
      if (folderId) {
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

      // Update the specific course's tags in scannedFolder
      setScannedFolders((prevFolders) =>
        prevFolders.map(
          (course) =>
            course.id === folderId
              ? { ...course, tags: updatedTags } // Update the tags for this course
              : course // Return the course as is if it doesn't match
        )
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
  };

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
  };

  // Close settings dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target) &&
        !event.target.closest(".dropdown-toggle")
      ) {
        setDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <div className="p-4 px-6 pb-0">
      <Search />

      {/* Settings button (Dropdown menu) */}
      <div
        className="py-1.5 transition-transform duration-150 ease-in-out hover:scale-105 flex items-center group dropdown-toggle cursor-pointer absolute right-5 top-0 h-20"
        onClick={toggleDropdown}
      >
        <span className="ml-1.5 font-medium text-sm text-colortextsecondary group-hover:text-transparent group-hover:bg-gradient-to-r group-hover:from-gradientEnd group-hover:to-gradientStart bg-clip-text">
          Manage
        </span>
        <img
          src={downIcon}
          alt="Settings"
          className={`h-6 aspect-auto cursor-pointer group-hover:filter-primary filter-secondary mt-1 ml-0.5 transition-transform duration-100 ease-in-out ${
            dropdownOpen ? "rotate-180 mb-1" : ""
          }`}
        />

        {/* Dropdown Menu */}
        {dropdownOpen && (
          <div
            ref={dropdownRef}
            className="absolute top-1 -right-2 mt-16 bg-primarydark shadow-sm rounded-sm w-52 py-2 border border-colorborder z-50"
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

      {/* Render recents */}
      {topRecentFolders && topRecentFolders.length > 0 && (
        <div className="mb-6">
          <div className="font-semibold text-lg mb-3">
            Continue where you left off <span className="ml-1.5">🏰</span>
          </div>
          <div className="course-list grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8 mb-5">
            {topRecentFolders.map((course) =>
              validPaths[course.id] ? (
                <CourseCardTiny
                  key={course.id}
                  course={course}
                  courseColor={getFolderColor(course.id)}
                />
              ) : null
            )}
          </div>
        </div>
      )}

      {filteredCourses.length > 0 && (
        <div className="font-semibold text-lg mb-3">Your collection</div>
      )}

      {/* Horizontal list of active tags */}
      {scannedFolders && filterTags?.length > 0 && (
        <div className="flex flex-wrap gap-2 items-start min-h-10 mb-2">
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
      {scannedFolders && tags?.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3 min-h-10">
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
        <Masonry
          breakpointCols={{
            default: 4, // Large screens (e.g., desktops)
            1200: 4, // Medium screens (e.g., smaller desktops)
            992: 3, // Tablets
            768: 2, // Smaller tablets or large phones
            512: 1, // Mobile
          }}
          className="my-masonry-grid"
          columnClassName="my-masonry-grid_column"
        >
          {filteredCourses.map((course) =>
            validPaths[course.id] ? (
              <CourseCard
                key={course.id}
                course={course}
                courseColor={getFolderColor(course.id)}
              />
            ) : null
          )}
        </Masonry>
      ) : (
        !loading && (
          <div className="flex flex-col items-left space-y-4">
            <span className="text-sm text-colortextsecondary">
              🥺 No content available. Try adding a new folder.
            </span>
          </div>
        )
      )}

      {loading && (
        <div className="fixed bottom-6 right-6 z-30 py-1.5 px-3 bg-primarydark text-white rounded-lg shadow-md border border-colorborder flex items-center space-x-2">
          <img src={loadingGif} alt="Loading..." className="w-6 h-6" />
          <span className="text-sm">
            Scanning folders for changes ⏳ Loading {scannedFolders ? scannedFolders?.length + 1 : 1}{" "}
            of {foldersToScan?.length}
          </span>
        </div>
      )}

      {loading && (
        <div className="w-full h-1 loading-bar fixed top-0 left-0 gradient-loader select-none z-20"></div>
      )}
    </div>
  );
};

export default HomePage;

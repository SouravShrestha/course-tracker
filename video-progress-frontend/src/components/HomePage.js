import React, { useEffect, useState, useRef } from "react";
import CourseCard from "./CourseCard";
import CourseCardTiny from "./CourseCardTiny";
import Popup from "./Popup";
import loadingGif from "../assets/images/loading.gif";
import {
  scanFolder,
  checkFolderExists,
  getTagsOfFolder,
  getFolderById,
} from "../utils/api";
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
import searchIcon from "../assets/images/search.png";
import slashIcon from "../assets/images/slash.png";
import downIcon from "../assets/images/down.png";
import closeIcon from "../assets/images/close.png";
import folderIconPlain from "../assets/images/folder.png";

const HomePage = () => {
  const [scannedMainFolders, setScannedMainFolders] = useState([]);
  const [filteredCourses, setFilteredCourses] = useState([]);
  const [topRecentCourses, setTopRecentCourses] = useState(null);
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
  const [searchQuery, setSearchQuery] = useState("");
  const [isFocused, setIsFocused] = useState(false);

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

  useEffect(() => {
    if (scannedMainFolders.length > 0) {
      // Flatten all folders into a single array of courses
      const allCourses = scannedMainFolders.flatMap(
        (mainFolder) => mainFolder.folders
      );

      // Filter out courses where last_played_at is null
      const filteredCourses = allCourses.filter(
        (course) => course.last_played_at !== null
      );

      // Sort courses by last_played_at in descending order (most recent first)
      const sortedCourses = filteredCourses.sort(
        (a, b) => new Date(b.last_played_at) - new Date(a.last_played_at)
      );

      // Get the top 4 most recent courses
      const top4Courses = sortedCourses.slice(0, 4);
      // Update the state with top 4 courses
      setTopRecentCourses(top4Courses);
    }
  }, [scannedMainFolders]); // Runs whenever scannedMainFolders changes

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
    setFilteredCourses([]);
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
      setFilteredCourses(filteredCourses);
      localStorage.setItem("filterTags", JSON.stringify(filterTags));
    });
  }, [filterTags, scannedMainFolders]);

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

  // Search filter for courses
  const filteredBySearchQuery = (courses) => {
    if (!searchQuery) return courses;
    return courses.filter((course) =>
      course.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  };

  // Handle search input change
  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
  };

  // Close settings dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target) && !event.target.closest(".dropdown-toggle")) {
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
      <div className="absolute right-32 top-0 flex space-x-6 items-center">
        <form onSubmit={""} className="flex space-x-0 relative flex-col">
          <div className="relative w-full h-20 flex items-center max-h-20">
            <input
              type="text"
              className="w-72 py-1.5 bg-primary sm:text-sm sm:leading-6 border-colorborder border px-6 pl-10 pr-10 rounded-md focus:outline-none focus:ring-1 focus:ring-white placeholder:text-colortextsecondary ease transform origin-right duration-100 focus:w-100 placeholder:opacity-85"
              placeholder="Search content here..."
              value={searchQuery}
              onChange={handleSearchChange}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
            />
            {/* Left Icon (search icon) */}
            <div className="absolute left-3 top-1/2 pointer-events-none transform -translate-y-1/2">
              <img
                src={searchIcon} // Replace with actual search icon
                alt="Search Icon"
                className={`w-4 h-4 ${
                  isFocused ? "filter-white" : "filter-disabled"
                }`}
              />
            </div>
            {/* Right Icon (clear icon) */}
            <div className="absolute right-0.5 top-1/2 transform -translate-y-1/2">
              <img
                src={isFocused ? closeIcon : slashIcon} // Replace with actual search icon
                alt="Slash Icon"
                className={`p-0.5 w-5 h-5 mr-2 ${
                  isFocused
                    ? "filter-disabled cursor-pointer hover:filter-white"
                    : "filter-disabled pointer-events-none"
                }`}
              />
            </div>
          </div>
          {isFocused && (
            <div className="flex text-xs text-colortext bg-primarydark w-full p-4 border-colorborder border -mt-3 rounded-md flex-col space-y-3">
              <div>
                <div className="font-semibold">Searching for</div>
                <div className="flex mt-3 space-x-3 mb-1">
                  <span className="flex items-center bg-colorsecondary py-1.5 pl-3.5 pr-2.5 rounded-full font-medium">
                    <div className="cursor-default">
                      <span className="text-blue-500 mr-2">ⵌ</span>
                      <span>Tags</span>
                    </div>
                    <img
                      src={closeIcon}
                      alt="Close Icon"
                      className="ml-4 w-3.5 h-3.5 filter-secondary hover:filter-white cursor-pointer"
                    />
                  </span>
                  <span className="flex items-center bg-colorsecondary py-1.5 pl-3.5 pr-2.5 rounded-full font-medium">
                    <div className="cursor-default flex items-center">
                      <img src={folderIconPlain} className="w-3 h-3 mr-2" />
                      <span>Folder</span>
                    </div>
                    <img
                      src={closeIcon}
                      alt="Close Icon"
                      className="ml-4 w-3.5 h-3.5 filter-secondary hover:filter-white cursor-pointer"
                    />
                  </span>
                  <span className="flex items-center bg-colorsecondary py-1.5 pl-3.5 pr-2.5 rounded-full font-medium">
                    <div className="cursor-default">
                      <span className="mr-2 text-xxs">🎥</span>
                      <span>Content</span>
                    </div>
                    <img
                      src={closeIcon}
                      alt="Close Icon"
                      className="ml-4 w-3.5 h-3.5 filter-secondary hover:filter-white cursor-pointer"
                    />
                  </span>
                </div>
              </div>

              <hr className="border-0.5 border-colorborder"/>

              <div>
                <div>
                  <span className="text-blue-500 mr-1 text-sm font-medium">
                    ⵌ
                  </span>
                  <span className="font-semibold">Tags</span>
                </div>
                <div className="flex mt-1.5">
                  <Tag text={"design"} color={getTagColor(1)} />
                  <Tag text={"design-patterns"} color={getTagColor(3)} />
                </div>
              </div>

              <hr className="border-0.5 border-colorborder"/>

              <div>
                <div className="font-semibold flex justify-between">
                  <div className="flex">
                    <img src={folderIconPlain} className="w-3.5 h-3.5 mr-1.5" />
                    Folder paths
                  </div>
                  <div className="text-xxs hover:text-blue-600 font-normal text-colortextsecondary cursor-pointer">
                    Show all
                  </div>
                </div>
                <div className="flex mt-1.5 flex-col">
                  <div className="mt-2 font-mono hover:bg-colorsecondary w-full py-2 px-3 cursor-pointer rounded-md">
                    📂 /users/kavita/personal/courses/Graphics <span className="text-colorSuccess font-medium">Design</span>
                  </div>
                  <div className="mt-2 font-mono hover:bg-colorsecondary w-full py-2 px-3 cursor-pointer rounded-md">
                    📂 /users/kavita/personal/courses/
                    <span className="text-colorSuccess font-medium">
                      Design
                    </span>{" "}
                    Patterns
                  </div>
                </div>
              </div>

              <hr className="border-0.5 border-colorborder"/>

              <div>
                <div className="cursor-default font-semibold flex justify-between">
                  <div className="flex">
                    <span className="mr-1 text-xxs">🎥</span>
                    <span>Content</span>
                  </div>

                  <div className="text-xxs hover:text-blue-600 font-normal text-colortextsecondary cursor-pointer">
                    Show all
                  </div>
                </div>
                <div className="flex mt-1.5 flex-col">
                  <div className="mt-2 hover:bg-colorsecondary w-full py-2 px-3 cursor-pointer rounded-md text-xs">
                    <span className="mr-2">🎬</span>
                    <span className="text-colorSuccess font-medium">Design</span> pattern.mp4
                  </div>
                  <div className="mt-2 hover:bg-colorsecondary w-full py-2 px-3 cursor-pointer rounded-md text-xs">
                    <span className="mr-2">🎬</span>
                    Netwok <span className="text-colorSuccess font-medium">design</span>ing.mp4
                  </div>
                </div>
              </div>
            </div>
          )}
        </form>
      </div>

      {/* Settings button (Dropdown menu) */}
      <div
        className="py-1.5 transition-transform duration-150 ease-in-out hover:scale-105 flex items-center group dropdown-toggle cursor-pointer absolute right-5 top-0 h-20 "
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
            className="absolute top-1 -right-2 mt-16 bg-primarydark shadow-sm rounded-sm w-52 py-2 border border-colorborder z-20"
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
      {topRecentCourses && topRecentCourses.length > 0 && (
        <div className="mb-6">
          <div className="font-semibold text-lg mb-3">
            Continue where you left off <span className="ml-1.5">🏰</span>
          </div>
          <div className="course-list grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-10 mb-5">
            {topRecentCourses.map((course) =>
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
      {filterTags?.length > 0 && (
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
      {tags?.length > 0 && (
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
        <div className="course-list grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-10">
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

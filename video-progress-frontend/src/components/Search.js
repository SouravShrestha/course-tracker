import React, { useEffect, useState, useRef } from 'react';
import searchIcon from '../assets/images/search.png'; // Replace with actual path
import { useNavigate } from "react-router-dom";
import closeIcon from '../assets/images/close.png'; // Replace with actual path
import slashIcon from '../assets/images/slash.png'; // Replace with actual path
import folderIconPlain from '../assets/images/folder.png'; // Replace with actual path
import Tag from './Tag'; // Assuming you have a Tag component
import { getRandomColorPair } from "../utils/colorUtils";
import loadingGif  from '../assets/images/loading-small.gif';
import { fetchTags, fetchFolders, fetchVideos } from '../utils/api';

const Search = () => {
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef(null); 
  const resultRef = useRef(null);
  const [inputValue, setInputValue] = useState('');
  const [tagColors, setTagColors] = useState({});
  const [tags, setTags] = useState([]);  // To hold the fetched tags
  const [folders, setFolders] = useState([]);  // To hold the fetched folders
  const [videos, setVideos] = useState([]);  // To hold the fetched folders
  
  // Loading states for tags, folders, and videos
  const [loadingTags, setLoadingTags] = useState(false);
  const [loadingFolders, setLoadingFolders] = useState(false);
  const [loadingVideos, setLoadingVideos] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if(isFocused && inputRef){
      inputRef.current.focus();
    }else{
      inputRef.current.blur();
    }
  }, [isFocused]);

  useEffect(() => {
    // Fetch tags when input value changes
    if (inputValue) {
      setLoadingTags(true);
      setLoadingFolders(true);
      setLoadingVideos(true);
      // Debounce or wait for user to stop typing before making the API call
      const timeoutId = setTimeout(async () => {
        try {
          // Fetch Tags
          try {
            const tagResponse = await fetchTags(inputValue);
            setTags(tagResponse);
          } catch (error) {
            console.error('Error fetching tags:', error);
          } finally {
            setLoadingTags(false);
          }

          // Fetch Folders
          try {
            const folderResponse = await fetchFolders(inputValue);
            setFolders(folderResponse.slice(0, 3));  // Limit to top 3
          } catch (error) {
            console.error('Error fetching folders:', error);
          } finally {
            setLoadingFolders(false);
          }

          // Fetch Videos
          try {
            const videoResponse = await fetchVideos(inputValue);
            setVideos(videoResponse.slice(0, 3));  // Limit to top 3
          } catch (error) {
            console.error('Error fetching videos:', error);
          } finally {
            setLoadingVideos(false);
          }

        } catch (error) {
          console.error('Error fetching tags:', error);
        }
      }, 500); // Debounce by 500ms

      return () => clearTimeout(timeoutId);  // Clean up previous timeout
    } else {
      setTags([]);  // Clear tags if input is empty
      setFolders([]);
      setVideos([]);
      setLoadingTags(false);
      setLoadingFolders(false);
      setLoadingVideos(false);
    }
  }, [inputValue]);

  useEffect(() => {
    // Handle key press events
    const handleKeyDown = (event) => {
      if (event.key === '/') {
        // Only focus the input if it's not already focused
        if (
          document.activeElement !== inputRef.current &&
          !["INPUT", "TEXTAREA", "SELECT", "BUTTON"].includes(
            document.activeElement.tagName
          )
        ) {
          event.preventDefault();
          inputRef.current.focus();
        }
      }
      
      if (event.key === 'Escape') {
        // Close the dropdown when Escape is pressed
        setIsFocused(false);
        setInputValue("");
        inputRef.current.blur();
      }
    };

    // Add event listener for keydown
    document.addEventListener('keydown', handleKeyDown);

    // Cleanup the event listener on component unmount
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (resultRef.current && !resultRef.current.contains(event.target) && event.target !== inputRef.current) {
        setIsFocused(false); // Blur the input if click is outside of the input and results
      }
    };

    // Add event listener to document for clicks outside the input and result dropdown
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Handle input blur
  const handleBlur = (event, forceBlur) => {
    if (!resultRef.current || forceBlur) {
      // Clicked outside the input and resultRef, so blur the input
      setIsFocused(false);
      
    } else {
      // Otherwise, keep the input focused
      inputRef.current.focus();
    }
  };

  // Handle search query change
  const handleSearchChange = (e) => {
    setInputValue(e.target.value);
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

  const highlightMatch = (text, query) => {
    // If there's no query, return the text as is
    if (!query) return text;

    // Create a regex pattern to match the query (case-insensitive)
    const regex = new RegExp(`(${query})`, "gi");

    // Replace matched portions with highlighted span
    return text.split(regex).map((part, index) => 
      regex.test(part) ? (
        <span key={index} className="text-colorSuccess">{part}</span>  // Highlighted part
      ) : (
        part  // Non-matching part
      )
    );
  };

  // Click handler for tags
  const handleTagClick = (tag) => {
    console.log('Selected Tag:', tag);
    handleBlur(null, true);
  };

  // Click handler for folders
  const handleFolderClick = (folder) => {
    console.log('Selected Folder:', folder);
    setIsFocused(false); // Close the dropdown after selection
    navigate(`/folder/${folder.id}`);
  };

  // Click handler for videos/content
  const handleVideoClick = (video) => {
    console.log('Selected Video:', video)
    setIsFocused(false); // Close the dropdown after selection
    navigate(`/folder/${video.folder_id}?videoIdToPlay=${video.id}`);
  };

  const handleCancelClicked = () => {
    inputRef.current.value = ""; // Clear the input value
    setInputValue(""); // Optional: Clear the controlled state if using it
    setIsFocused(false); // Optional: Optionally blur the input if needed
  };

  return (
    <div className="absolute right-32 top-0 flex space-x-6 items-center">
      <form className="flex space-x-0 relative flex-col">
        <div className="relative w-full h-20 flex items-center max-h-20">
          <input
            ref={inputRef}
            type="text"
            className={`${isFocused ? 'w-100' : 'w-72'} py-1.5 bg-primary sm:text-sm sm:leading-6 border-colorborder border px-6 pl-10 pr-10 rounded-md focus:outline-none focus:ring-1 focus:ring-white placeholder:text-colortextsecondary ease transform origin-right duration-100 focus:w-100 placeholder:opacity-85`}
            placeholder="Search content here..."
            value={inputValue}
            onChange={handleSearchChange}
            onFocus={() => setIsFocused(true)}
            onBlur={handleBlur}
          />
          {/* Left Icon (search icon) */}
          <div className="absolute left-3 top-1/2 pointer-events-none transform -translate-y-1/2">
            <img
              src={searchIcon} // Replace with actual search icon
              alt="Search Icon"
              className={`w-4 h-4 ${
                isFocused ? "filter-white" : "filter-disabled"
              }`}
              onClick={handleCancelClicked}
            />
          </div>
          {/* Right Icon (clear icon) */}
          <div className="absolute right-0.5 top-1/2 transform -translate-y-1/2">
            <img
              src={isFocused ? closeIcon : slashIcon} // Replace with actual icons
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
          <div
            className="flex text-xs text-colortext bg-primarydark w-full py-3 px-4 border-colorborder border -mt-3 rounded-md flex-col space-y-2.5 z-10"
            ref={resultRef} // Ensure resultRef is attached here
            onClick={(e) => e.stopPropagation()}
          >
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
                    <span>Folder name</span>
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

            {inputValue != "" && (
              <hr className="border-0.5 border-colorborder" />
            )}

            {/* Tags result */}
            {inputValue != "" && (
              <div className="mt-2">
                <div className="flex items-center">
                  <span className="text-blue-500 mr-1.5 text-sm font-medium">
                    ⵌ
                  </span>
                  <span className="font-semibold">Tags</span>
                  {loadingTags && (
                    <img
                      src={loadingGif}
                      alt="Loading gif"
                      className="w-5 h-5 ml-1.5"
                    />
                  )}
                </div>
                <div className="flex mt-1.5 min-h-9 items-center">
                  {tags.length === 0 ? (
                    <div className="text-colortextsecondary ml-2">
                      No tag found
                    </div>
                  ) : (
                    tags.map((tag) => (
                      <div key={tag.id} onClick={() => handleTagClick(tag)} className="cursor-pointer hover:scale-105 transform ease-in-out duration-200">
                        <Tag
                          key={tag.id}
                          text={tag.name}
                          color={getTagColor(tag.id)}
                        />
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {inputValue != "" && (
              <hr className="border-0.5 border-colorborder" />
            )}

            {/* Folder result */}
            {inputValue != "" && (
              <div>
                <div className="font-semibold flex justify-between mt-2">
                  <div className="flex">
                    <img src={folderIconPlain} className="w-3.5 h-3.5 mr-2" />
                    Folder name
                    {loadingFolders && (
                      <img
                        src={loadingGif}
                        alt="Loading gif"
                        className="w-5 h-5 ml-1.5"
                      />
                    )}
                  </div>
                  <div className="text-xxs hover:text-blue-600 font-normal text-colortextsecondary cursor-pointer">
                    Show all
                  </div>
                </div>
                <div className="flex mt-1.5 min-h-10 flex-col justify-center">
                  {folders.length === 0 ? (
                    <div className="text-colortextsecondary ml-2">
                      No folder found
                    </div>
                  ) : (
                    folders.map((folder) => (
                      <div
                        key={folder.id}
                        className="mt-2 font-mono hover:bg-colorsecondary w-full py-1.5 px-3 cursor-pointer rounded-md"
                        onClick={() => handleFolderClick(folder)}
                      >
                        📂 {highlightMatch(folder.path, inputValue)}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {inputValue != "" && (
              <hr className="border-0.5 border-colorborder" />
            )}

            {/* Content result */}
            {inputValue != "" && (
              <div>
                <div className="cursor-default font-semibold flex justify-between mt-2">
                  <div className="flex">
                    <span className="mr-2 text-xxs">🎥</span>
                    <span>Content</span>
                    {loadingVideos && (
                      <img
                        src={loadingGif}
                        alt="Loading gif"
                        className="w-5 h-5 ml-1.5"
                      />
                    )}
                  </div>

                  <div className="text-xxs hover:text-blue-600 font-normal text-colortextsecondary cursor-pointer">
                    Show all
                  </div>
                </div>
                <div className="flex mt-1.5 min-h-10 justify-center flex-col">
                  {videos.length === 0 ? (
                    <div className="text-colortextsecondary ml-2">
                      No video found
                    </div>
                  ) : (
                    videos.map((video) => (
                      <div
                        key={video.id}
                        className="mt-2 text-xs hover:bg-colorsecondary w-full py-1.5 px-3 cursor-pointer rounded-md"
                        onClick={() => handleVideoClick(video)}
                      >
                        🎬 {highlightMatch(video.name, inputValue)}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </form>
    </div>
  );
};

export default Search;

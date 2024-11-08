import React, { useEffect, useState, useRef } from "react";
import checkIcon from "../assets/images/check.png";
import newIcon from "../assets/images/new.png";
import progressIcon from "../assets/images/progress.png";
import playingIcon from "../assets/images/playing.png";
import {convertDurationToSeconds} from "../utils/convertors"

const LibraryExplorer = ({ contents, onVideoClick, videoProgress, activeVideoPath }) => { 

  const [dropdownVisible, setDropdownVisible] = useState(false); // State to toggle dropdown visibility
  const contentRefs = useRef([]); // Ref to track content sections for scrolling
  const videoRefs = useRef([])
  const [dropdownPosition, setDropdownPosition] = useState(0);

  const handleContentClick = (index) => {
    setDropdownVisible(!dropdownVisible); // Toggle dropdown visibility
    contentRefs.current[index].scrollIntoView({ behavior: "smooth" }); // Scroll to the selected content
  };

  const handleChapterClick = (event) => {
    setDropdownVisible(!dropdownVisible)
    let clickedDiv = event.target;
    if (clickedDiv.tagName === 'DIV') {
      // Get the clickedDiv's child span with class "chapter"
      clickedDiv = clickedDiv.querySelector('span.chapter');
    }
    // Get the bounding rectangle of the clicked div
    const rect = clickedDiv.getBoundingClientRect();
    // The bottom Y-coordinate (end of the div)
    setDropdownPosition(rect.bottom);
  };

  // Ensure active video is visible (scroll into view)
  useEffect(() => {
    if (activeVideoPath) {
      const activeVideoElement = contents
        .flatMap((content) => content.videos)
        .find((video) => video.path === activeVideoPath);

      if (activeVideoElement && videoRefs.current[activeVideoElement.id]) {
        // Scroll the active video into view
        videoRefs.current[activeVideoElement.id].scrollIntoView({
          behavior: "smooth",
          block: "center", // Align it to the center of the container
        });
      }
    }
  }, [activeVideoPath]);

  useEffect(() => {
    // Function to find the first unwatched video
    const findFirstUnwatchedVideo = () => {
      let firstVideo = null;
      for (const contentElement of contents) {
        if (contentElement.videos && contentElement.videos.length > 0) {
          const sortedVideos = contentElement.videos.sort((a, b) =>
            a.name.localeCompare(b.name)
          );
          firstVideo = firstVideo || contentElement.videos[0];
          const unwatchedVideo = sortedVideos.find(
            (video) => video.progress < convertDurationToSeconds(video.duration)
          );
          if (unwatchedVideo) {
            return unwatchedVideo; // Return the unwatched video if found
          }
        }
      }
      return firstVideo; // No unwatched videos found
    };

    // Get the first unwatched video and click it
    const unwatchedVideo = findFirstUnwatchedVideo();
    if (unwatchedVideo) {
      onVideoClick(unwatchedVideo); // Trigger the video click event
    }
  }, [contents]); // Run the effect when contents change

  const handleVideoClick = (video) => {
    if (videoProgress.hasOwnProperty(video.id)) {
      video.progress = videoProgress[video.id]; // Set progress if key exists
    }
    onVideoClick(video);
  };

  return (
    <div className="relative ml-3 mr-3 shadow-inner">
      {dropdownVisible && (
        <div
          className="dropdown-list fixed z-20 text-base font-semibold mt-3 bg-primarydark border border-colorborder shadow-none -mx-3.5 w-1/5"
          style={{ top: `${dropdownPosition}px` }}
        >
          {contents.map((content, index) => (
            <div
              key={content.id}
              className="cursor-pointer hover:bg-primary px-3 py-3"
              onClick={() => handleContentClick(index)}
            >
              <div className="flex items-center">
                <span className="mr-3 flex items-center justify-center w-7 h-7 rounded-sm bg-colorsecondary text-white font-semibold">
                  {index + 1}
                </span>
                <span>
                  {content.name.replace(/^\d+\.\s*/, "").toUpperCase()}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
      {contents
        .filter((content) => content.videos.length > 0)
        .map((content, index) => (
          <div
            className="pb-2 relative mb-6"
            key={content.id}
            ref={(el) => (contentRefs.current[index] = el)}
          >
            <div className="text-base font-semibold cursor-pointer sticky top-0 overflow-hidden bg-primary">
              <div
                className="flex items-center pb-3"
                onClick={(e) => handleChapterClick(e)}
              >
                <span className="mr-3 flex items-center justify-center w-7 h-7 rounded-sm bg-gradient-to-r from-gradientEnd to-gradientStart text-white font-semibold">
                  {index + 1}
                </span>
                <span className="chapter">
                  {content.name.replace(/^\d+\.\s*/, "").toUpperCase()}
                </span>
              </div>
              <hr className="border-colorborder" />
            </div>
            <ul className="mt-3 mr-2 w-full space-y-3">
              {content.videos
                .sort((a, b) => a.name.localeCompare(b.name))
                .map((video, index) => (
                  <li
                  ref={(el) => (videoRefs.current[video.id] = el)}
                    className={`flex justify-between text-base py-1 items-center cursor-pointer bg-clip-text ${
                      video.path === activeVideoPath
                        ? "text-transparent font-550 bg-gradient-to-r from-gradientEnd to-gradientStart"
                        : "hover:text-colortext font-normal"
                    }
                      hover:no-underline ${
                        (videoProgress[video.id] !== undefined
                          ? videoProgress[video.id]
                          : video.progress) >=
                          convertDurationToSeconds(video.duration) &&
                        video.path != activeVideoPath
                          ? "line-through"
                          : ""
                      }
                      
                      `}
                    key={video.id}
                    onClick={() => handleVideoClick(video)}
                  >
                    <div className="flex items-center w-4/5 justify-start">
                      {video.path != activeVideoPath &&
                        ((videoProgress[video.id] !== undefined
                          ? videoProgress[video.id]
                          : video.progress) <= 0 ? (
                          <div className="w-1/5 mb-1.5">
                            <img
                              src={newIcon}
                              alt="New Icon"
                              className="inline-block w-5 h-5"
                            />
                          </div>
                        ) : (videoProgress[video.id] !== undefined
                            ? videoProgress[video.id]
                            : video.progress) >=
                          convertDurationToSeconds(video.duration) ? (
                          <div className="w-1/5 items-center">
                            <img
                              src={checkIcon}
                              alt="Check Icon"
                              className="inline-block w-7 h-7 -ml-2"
                            />
                          </div>
                        ) : (
                          <div className="w-1/5">
                            <img
                              src={progressIcon}
                              alt="Progress Icon"
                              className="inline-block w-7 h-7 -ml-1.5 items-center"
                            />
                          </div>
                        ))}
                      <div className="w-full max-w-full">
                        {video.name.replace(/\.\w+$/, "")}
                      </div>
                    </div>
                    <div className="w-auto flex justify-end">
                      {video.path != activeVideoPath ? (
                        <span
                          className={`text-sm hover:no-underline transition duration-200`}
                        >
                          {video.duration}
                        </span>
                      ) : (
                        <span className="text-lg font-bold">
                          <img
                            src={playingIcon}
                            alt="Playing Icon"
                            className="inline-block w-5 h-5 items-center"
                          />
                        </span>
                      )}
                    </div>
                  </li>
                ))}
            </ul>
          </div>
        ))}
    </div>
  );
};

export default LibraryExplorer;
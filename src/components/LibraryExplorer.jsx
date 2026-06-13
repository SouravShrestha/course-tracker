'use client';
import React, { useEffect, useState, useRef } from "react";
const checkIcon = "/images/check.png";
const newIcon = "/images/new.png";
const progressIcon = "/images/progress.png";
const playingIcon = "/images/playing.png";
import { convertDurationToSeconds } from "../utils/convertors";

const LibraryExplorer = ({
  contents,
  onVideoClick,
  videoProgress,
  activeVideoPath,
  videoIdToPlay,
  onDropdownVisibilityChange,
}) => {
  const [dropdownVisible, setDropdownVisible] = useState(false);
  const contentRefs = useRef([]);
  const videoRefs = useRef([]);
  const dropdownRef = useRef(null);
  const [dropdownPosition, setDropdownPosition] = useState(0);

  // Flatten all videos from a chapter (direct or nested under lessons)
  const getChapterVideos = (content) => {
    if (content.lessons && content.lessons.length > 0) {
      return content.lessons.flatMap(ls => ls.videos || []);
    }
    return content.videos || [];
  };

  const allVideos = contents.flatMap(getChapterVideos);

  const handleContentClick = (index) => {
    contentRefs.current[index].scrollIntoView({ behavior: "smooth" });
    setTimeout(() => setDropdownVisible(!dropdownVisible), 200);
  };

  useEffect(() => {
    onDropdownVisibilityChange(dropdownVisible);
  }, [dropdownVisible]);

  const handleChapterClick = (event) => {
    setDropdownVisible(!dropdownVisible);
    let clickedDiv = event.target;
    if (clickedDiv.tagName === "DIV") {
      clickedDiv = clickedDiv.querySelector("span.chapter");
    }
    const rect = clickedDiv.getBoundingClientRect();
    setDropdownPosition(rect.bottom);
  };

  useEffect(() => {
    if (activeVideoPath) {
      const activeVideo = allVideos.find(v => v.path === activeVideoPath);
      if (activeVideo && videoRefs.current[activeVideo.id]) {
        videoRefs.current[activeVideo.id].scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }
  }, [activeVideoPath]);

  useEffect(() => {
    const findPassedVideo = (videoId) => {
      if (!videoId) return null;
      return allVideos.find(v => v.id.toString() === videoId.toString()) ?? null;
    };

    const findFirstUnwatchedVideo = () => {
      let firstVideo = null;
      for (const video of allVideos) {
        firstVideo = firstVideo || video;
        if (video.progress < convertDurationToSeconds(video.duration)) return video;
      }
      return firstVideo;
    };

    const target = videoIdToPlay ? findPassedVideo(videoIdToPlay) : findFirstUnwatchedVideo();
    if (target) onVideoClick(target);
  }, [contents]);

  const handleVideoClick = (video) => {
    if (Object.prototype.hasOwnProperty.call(videoProgress, video.id)) {
      video.progress = videoProgress[video.id];
    }
    onVideoClick(video);
  };

  const handleClickOutside = (event) => {
    if (
      dropdownRef.current &&
      !dropdownRef.current.contains(event.target) &&
      !event.target.closest(".dropdown-toggle")
    ) {
      setDropdownVisible(false);
      onDropdownVisibilityChange(false);
    }
  };

  useEffect(() => {
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const VideoItem = ({ video }) => {
    const progress = videoProgress[video.id] !== undefined ? videoProgress[video.id] : video.progress;
    const isActive = video.path === activeVideoPath;
    const isComplete = progress >= convertDurationToSeconds(video.duration);

    return (
      <li
        ref={(el) => (videoRefs.current[video.id] = el)}
        className={`flex justify-between text-base py-1 items-center cursor-pointer bg-clip-text ${
          isActive
            ? "text-transparent font-550 bg-gradient-to-r from-gradientEnd to-gradientStart"
            : "hover:text-colortext font-normal"
        } hover:no-underline ${isComplete && !isActive ? "line-through" : ""}`}
        onClick={() => handleVideoClick(video)}
      >
        <div className="flex items-center w-4/5 justify-start">
          {!isActive && (
            progress <= 0 ? (
              <div className="w-1/5 mb-1.5">
                <img src={newIcon} alt="New" className="inline-block w-5 h-5" />
              </div>
            ) : isComplete ? (
              <div className="w-1/5 items-center">
                <img src={checkIcon} alt="Done" className="inline-block w-7 h-7 -ml-2" />
              </div>
            ) : (
              <div className="w-1/5">
                <img src={progressIcon} alt="In progress" className="inline-block w-7 h-7 -ml-1.5 items-center" />
              </div>
            )
          )}
          <div className="w-full max-w-full">{video.name.replace(/\.\w+$/, "")}</div>
        </div>
        <div className="w-auto flex justify-end">
          {!isActive ? (
            <span className="text-sm hover:no-underline transition duration-200">{video.duration}</span>
          ) : (
            <span className="text-lg font-bold">
              <img src={playingIcon} alt="Playing" className="inline-block w-5 h-5 items-center" />
            </span>
          )}
        </div>
      </li>
    );
  };

  const chaptersWithContent = contents.filter(c => getChapterVideos(c).length > 0);

  return (
    <div className="relative ml-3 mr-3">
      {/* Chapter navigation dropdown */}
      {dropdownVisible && (
        <div
          ref={dropdownRef}
          className="dropdown-list fixed z-20 text-base font-semibold mt-3 bg-primarydark border border-colorborder shadow-none -ml-4 xl:w-1/5 max-h-96 overflow-y-scroll w-80"
          style={{ top: `${dropdownPosition}px` }}
        >
          {chaptersWithContent.map((content, index) => (
            <div
              key={content.id}
              className="cursor-pointer hover:bg-primary px-3 py-3"
              onClick={() => handleContentClick(index)}
            >
              <div className="flex items-center">
                <span className="mr-3 flex items-center justify-center w-7 h-7 rounded-sm bg-colorsecondary text-white font-semibold min-w-7">
                  {index + 1}
                </span>
                <span>{content.name.replace(/^\d+[._]\s*/, "").toUpperCase()}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Chapter list */}
      {chaptersWithContent.map((content, index) => {
        const hasLessons = content.lessons && content.lessons.length > 0;

        return (
          <div
            className="pb-2 relative mb-6 z-0"
            key={content.id}
            ref={(el) => (contentRefs.current[index] = el)}
          >
            {/* Chapter header */}
            <div className="text-base font-semibold cursor-pointer sticky top-0 bg-primary -ml-1 pl-1 dropdown-toggle">
              <div
                className="flex items-center pb-3 dropdown-toggle"
                onClick={handleChapterClick}
              >
                <span className="mr-3 flex items-center justify-center w-7 h-7 rounded-sm bg-gradient-to-r from-gradientEnd to-gradientStart text-white font-semibold dropdown-toggle min-w-7">
                  {index + 1}
                </span>
                <span className="chapter">
                  {content.name.replace(/^\d+[._]\s*/, "").toUpperCase()}
                </span>
              </div>
              <hr className="border-colorborder" />
            </div>

            {hasLessons ? (
              // Pattern B: lessons grouped under chapter
              <div className="mt-3 space-y-4">
                {content.lessons
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map((lesson, lIndex) => (
                    <div key={lesson.id}>
                      <div className="text-xs font-semibold text-colortextsecondary uppercase tracking-wide ml-1 mb-2 flex items-center gap-2">
                        <span className="inline-flex items-center justify-center w-4 h-4 rounded-sm bg-colorsecondary text-white text-xs min-w-4">
                          {lIndex + 1}
                        </span>
                        {lesson.name.replace(/^\d+[._]\s*/, "")}
                      </div>
                      <ul className="mr-2 pl-3 w-full space-y-3 border-l border-colorborder ml-1">
                        {lesson.videos
                          .sort((a, b) => a.name.localeCompare(b.name))
                          .map(video => <VideoItem key={video.id} video={video} />)}
                      </ul>
                    </div>
                  ))}
              </div>
            ) : (
              // Pattern A: direct videos under chapter
              <ul className="mt-3 mr-2 pl-1 w-full space-y-3">
                {content.videos
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map(video => <VideoItem key={video.id} video={video} />)}
              </ul>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default LibraryExplorer;

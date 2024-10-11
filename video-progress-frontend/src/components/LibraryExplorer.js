import React, { useEffect } from "react";
import checkIcon from "../assets/images/check.png";
import newIcon from "../assets/images/new.png";
import progressIcon from "../assets/images/progress.png";
import playingIcon from "../assets/images/playing.png";

const LibraryExplorer = ({ contents, onVideoClick, videoProgress, activeVideoPath }) => { 

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

  // Function to convert duration "MM:SS" to seconds
  const convertDurationToSeconds = (duration) => {
    const [minutes, seconds] = duration.split(":").map(Number);
    return minutes * 60 + seconds;
  };

  return (
    <>
      {contents.map((content) => (
        <div className="py-4" key={content.id}>
          <div className="text-base font-semibold cursor-default">
            {content.name.replace(/^\d+\.\s*/, "").toUpperCase()}
          </div>
          <hr className="mt-3 border-colorborder" />
          <ul className="mt-5 mr-2 w-full space-y-3">
            {content.videos
              .sort((a, b) => a.name.localeCompare(b.name))
              .map((video) => (
                <li
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
                    <div className="w-4/5 max-w-4/5">
                      {video.name.replace(/\.\w+$/, "")}
                    </div>
                  </div>
                  <div className="w-1/4 flex justify-end">
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
    </>
  );
};

export default LibraryExplorer;

import React, { useState, useEffect, useRef } from "react";
import reloadIcon from "../assets/images/reload.png";
import reloadPlainIcon from "../assets/images/restart-plain.png";
import checkPlainIcon from "../assets/images/check-solid.png";
import pointIcon from "../assets/images/point.png";
import NoteCard from "./NoteCard";
import AddNote from "./AddNote";
import { updateVideoProgressB, getNotesB } from "../utils/api";

const VideoPlayer = ({
  videoPath,
  video,
  cUpdateVideoProgress,
  nextVideo,
  prevVideo,
  onVideoChange,
}) => {
  const [loading, setLoading] = useState(false);
  const videoRef = useRef(null);
  const [lastUpdateTime, setLastUpdateTime] = useState(0);
  const [showOverlay, setShowOverlay] = useState(false);
  const [notes, setNotes] = useState([]);
  const notesRef = useRef(null); // Reference to the first NoteCard

  const toggleSwitchRef = useRef(null);

  const [isCompletedElsewhere, setIsCompletedElsewhere] = useState(true);

  const [autoplay, setAutoplay] = useState(() => {
    // Initialize autoplay from localStorage
    const savedAutoplay = localStorage.getItem("autoplay");
    return savedAutoplay === "true" || false;
  });

  // Toggle autoplay and save it to localStorage
  const handleAutoplayToggle = () => {
    const newAutoplay = !autoplay;
    setAutoplay(newAutoplay);
    localStorage.setItem("autoplay", newAutoplay); // Save autoplay preference in localStorage
  };

  // Function to fetch the notes for a video
  const fetchNotes = async () => {
    if (!video?.id) {
      return;
    }
    var allNotes = await getNotesB(video.id);
    setNotes(allNotes);
  };

  useEffect(() => {
    fetchNotes(); // Fetch notes when the component mounts
  }, [video]);

  useEffect(() => {
    if (video) {
      setLoading(true);
    }
    setIsCompletedElsewhere(true);
    setLastUpdateTime(videoRef.current.currentTime);
  }, [video.path]);

  const goToNotes = () => {
    notesRef.current.scrollIntoView({ behavior: "smooth" });
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      videoRef.current.currentTime = video.progress;

      if (video.progress >= videoRef.current.duration.toFixed(0) || !autoplay) {
        videoRef.current.pause();
      }

      // Check if progress equals the video duration
      if (
        videoRef.current.currentTime >= videoRef.current.duration.toFixed(0)
      ) {
        setShowOverlay(true); // Show overlay if video progress is at the end
      } else {
        setShowOverlay(false); // Hide overlay if video progress is not at the end
        setIsCompletedElsewhere(false);
      }
    }
  };

  const handleCanPlay = () => {
    setLoading(false); // Hide loading bar once video can play
  };

  // Function to handle progress update
  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const currentTime = videoRef.current.currentTime;
      // Check if 15 seconds have passed since the last update
      if (
        currentTime - lastUpdateTime >= 15 ||
        currentTime < lastUpdateTime ||
        currentTime >= videoRef.current.duration ||
        lastUpdateTime >= videoRef.current.duration ||
        currentTime === 0
      ) {
        updateCurrentTime(video.id, currentTime);
      }
    }
  };

  const updateCurrentTime = (id, currentTime) => {
    updateVideoProgress(id, currentTime);
    setLastUpdateTime(currentTime);
  };

  const updateVideoProgress = async (videoId, progress) => {
    await updateVideoProgressB(videoId, progress);
    cUpdateVideoProgress(videoId, progress);
  };

  // Function to handle video end
  const handleEnded = () => {
    setShowOverlay(true); // Show overlay when video ends

    // Autoplay next video if enabled
    if (autoplay && nextVideo && !isCompletedElsewhere) {
      setTimeout(() => {
        onVideoChange(nextVideo); // Automatically change to the next video
      }, 1000); // Delay autoplay by 2 seconds
    }
  };

  // Function to restart the video
  const handleRestart = () => {
    if (videoRef.current) {
      videoRef.current.currentTime = 0; // Reset the current time to 0
      videoRef.current.play(); // Optionally, play the video after restarting
      setShowOverlay(false); // Hide the overlay after restarting
      updateCurrentTime(video.id, 0);
      setIsCompletedElsewhere(false);
    }
  };

  // Function to handle next video
  const handleNext = () => {
    if (nextVideo) {
      onVideoChange(nextVideo); // Change to the next video
    }
  };

  // Function to handle previous video
  const handlePrevious = () => {
    if (prevVideo) {
      onVideoChange(prevVideo); // Change to the previous video
    }
  };

  // Function to mark the video progress as complete and go to next video
  const handleMarkComplete = async () => {
    if (video) {
      // Update the video's progress to its duration
      const totalDuration = videoRef.current.duration;

      // Update progress in the backend
      await updateVideoProgress(video.id, totalDuration);

      // Set the last update time to the total duration
      setLastUpdateTime(totalDuration);

      // Optionally navigate to the next video
      if (nextVideo) {
        onVideoChange(nextVideo);
      }
    }
  };

  useEffect(() => {
    // Function to handle key down events
    const handleKeyDown = (event) => {
      const editableNote = document.getElementById("editableNote");

      // If the focus is on the notes textbox, we don't want spacebar or arrow keys to have any effect on the video.
      if (
        document.activeElement === editableNote &&
        event.key.toLowerCase() !== "escape"
      ) {
        return;
      }
      switch (event.key.toLowerCase()) {
        case " ":
          event.preventDefault(); // Prevent scrolling when space is pressed
          if (
            videoRef.current.currentTime < videoRef.current.duration &&
            videoRef.current
          ) {
            if (videoRef.current.paused) {
              videoRef.current.play(); // Play the video
            } else {
              videoRef.current.pause(); // Pause the video
            }
          }
          break;
        case "arrowright":
          if (videoRef.current) {
            videoRef.current.currentTime = Math.min(
              videoRef.current.currentTime + 5,
              videoRef.current.duration
            ); // Seek forward 5 seconds
          }
          break;
        case "arrowleft":
          if (videoRef.current) {
            videoRef.current.currentTime = Math.max(
              videoRef.current.currentTime - 5,
              0
            ); // Seek backward 5 seconds
          }
          break;
        case "m":
          event.preventDefault();
          if (editableNote) {
            editableNote.focus(); // Focus on the editable div for notes
          }
          break;
        case "escape":
          if (editableNote) {
            editableNote.blur(); // Focus on the editable div for notes
          }
          break;
        default:
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown); // Cleanup the event listener
    };
  }, []); // Run once on mount

  return (
    <div className="w-full my-4">
      {loading && (
        <div className="w-full h-1 loading-bar fixed top-0 left-0 gradient-loader select-none z-20"></div>
      )}
      <div className="flex flex-col items-center select-none">
        <div className="w-10/12 flex">
          {/* video player */}
          <div className="aspect-video w-11/12 bg-primarydark relative">
            <video
              ref={videoRef}
              src={videoPath}
              className="bg-primarydark w-full h-full cursor-pointer"
              onLoadedMetadata={handleLoadedMetadata}
              onTimeUpdate={handleTimeUpdate}
              onCanPlay={handleCanPlay}
              onEnded={handleEnded}
              controls
              autoPlay
            />
            {/* Overlay with Restart Button */}
            {showOverlay && (
              <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-60">
                <div
                  onClick={handleRestart}
                  className="text-accent py-2 px-4 font-bold text-5xl cursor-pointer"
                >
                  <img
                    src={reloadIcon}
                    alt="Reload Icon"
                    className="inline-block w-16 h-16"
                  />
                </div>
              </div>
            )}
          </div>
          {/* player-controls */}
          <div className="w-1/12 flex py-6 bg-primarydark flex-col space-y-12 justify-center">
            {/* autoplay */}
            <div
              className="flex flex-col items-center w-full cursor-pointer transition-transform duration-200 ease-in-out bg-clip-text hover:text-transparent hover:bg-gradient-to-r hover:from-gradientEnd hover:to-gradientStart hover:scale-105"
              onClick={handleAutoplayToggle}
            >
              <div
                ref={toggleSwitchRef}
                onClick={handleAutoplayToggle}
                className={`w-8 h-3 rounded-full relative cursor-pointer transition-all duration-300 ease-in-out
    ${
      autoplay
        ? "from-gradientEnd to-gradientStart bg-gradient-to-r"
        : "bg-colortextsecondary"
    }`}
              >
                <div
                  className={`absolute -top-0.5 transition-transform duration-300 ease-in-out 
      ${
        autoplay ? "translate-x-4" : "-translate-x-1"
      } flex items-center justify-center w-4 h-4 bg-white rounded-full`}
                >
                  {autoplay ? (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      className="w-3 h-3"
                    >
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  ) : (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      className="w-3 h-3"
                    >
                      <path d="M6 6h4v12H6V6zm8 0h4v12h-4V6z" />
                    </svg>
                  )}
                </div>
              </div>

              <span className="mt-5 text-xs">Autoplay</span>
            </div>

            {/* restart */}
            <div
              className="flex flex-col items-center w-full cursor-pointer transition-transform duration-200 ease-in-out bg-clip-text hover:text-transparent hover:bg-gradient-to-r hover:from-gradientEnd hover:to-gradientStart hover:scale-105"
              onClick={handleRestart}
            >
              <img
                src={reloadPlainIcon}
                alt="Reload Icon"
                className="inline-block w-4 h-4"
              />
              <span className="mt-3 text-xs">Restart</span>
            </div>

            {/* mark as complete */}
            <div
              className="flex flex-col items-center w-full cursor-pointer transition-transform duration-200 ease-in-out bg-clip-text hover:text-transparent hover:bg-gradient-to-r hover:from-gradientEnd hover:to-gradientStart hover:scale-105"
              onClick={handleMarkComplete}
            >
              <img
                src={checkPlainIcon}
                alt="Complete Icon"
                className="inline-block w-4 h-4"
              />
              <span className="mt-3 text-xs text-center leading-4">
                Mark complete
              </span>
            </div>
          </div>
        </div>
        {/* next/prev buttons */}
        <div className="w-10/12 flex items-start mt-5 relative">
          {/* Previous Button */}
          <div className="w-1/2 min-h-16">
            {prevVideo && (
              <button
                className="flex flex-col transition-transform duration-200 ease-in-out hover:opacity-100 opacity-40 bg-clip-text hover:text-transparent hover:bg-gradient-to-r hover:from-gradientEnd hover:to-gradientStart hover:scale-105"
                onClick={handlePrevious}
              >
                <img
                  src={pointIcon}
                  alt="Point Icon"
                  className="inline-block w-8 h-8 transform scale-x-[-1]"
                />
                <span className="mt-3 font-medium text-sm">
                  {prevVideo.name.replace(/\.\w+$/, "")}
                </span>
              </button>
            )}
          </div>

          {/* Next Button */}
          <div className="w-1/2 min-h-16 flex justify-end">
            {nextVideo && (
              <button
                className="flex flex-col transition-transform duration-200 ease-in-out hover:opacity-100 opacity-70 items-end bg-clip-text hover:text-transparent hover:bg-gradient-to-r hover:from-gradientEnd hover:to-gradientStart hover:scale-105"
                onClick={handleNext}
              >
                <img
                  src={pointIcon}
                  alt="Point Icon"
                  className="inline-block w-8 h-8"
                />
                <span className="mt-3 font-medium text-sm">
                  {nextVideo.name.replace(/\.\w+$/, "")}
                </span>
              </button>
            )}
          </div>
        </div>
        {/* notes */}
        <div className="w-10/12 mt-12">
          <span className="font-semibold text-lg cursor-default">Notes</span>
          <AddNote
            videoId={video.id}
            reloadNotes={fetchNotes}
            goToNotes={goToNotes}
          />
          <div className="mt-4 text-xs font-medium mb-10 text-colortextsecondary">
            <span className="mr-1">Pro tip 💡</span>
            <span>
              press{" "}
              <span className="bg-primarydark rounded-sm px-2 pb-1 py-0.5 mx-1 font-extrabold text-colortext">
                m
              </span>{" "}
              to add note
            </span>
          </div>

          {notes
            .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
            .map((note, index) => (
              <NoteCard
                key={index}
                note={note}
                reloadNotes={fetchNotes}
                isLast={index === notes.length - 1}
                ref={index === 0 ? notesRef : null}
              />
            ))}
        </div>
      </div>
    </div>
  );
};

export default VideoPlayer;

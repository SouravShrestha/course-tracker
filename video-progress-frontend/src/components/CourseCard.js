import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import folderImg from "../assets/images/folder.png";
import checkIcon from "../assets/images/check.png";
import newIcon from "../assets/images/new.png";
import progressIcon from "../assets/images/progress.png";
import axios from "axios";

const CourseCard = ({ course }) => {
  // State to hold the folder data
  const [folderData, setFolderData] = useState(null);

  const navigate = useNavigate();
  const handleClick = () => {
    navigate(`/folder/${course.id}`);
  };

  // Function to fetch folder data
  const fetchFolderData = async () => {
    try {
      const response = await axios.get(
        `http://localhost:8000/api/folders/${course.id}/subfolders`
      );
      setFolderData(response.data);
    } catch (error) {
      console.error("Failed to fetch folder data:", error);
    } finally {
      
    }
  };

  useEffect(() => {
    fetchFolderData();
  }, [course.id]); // Fetch data when the component mounts or course.id changes

  const convertDurationToSeconds = (duration) => {
    const [minutes, seconds] = duration.split(":").map(Number);
    return minutes * 60 + seconds;
  };

  // Calculate the number of videos and progress based on the fetched data
  const numberOfVideos = folderData
    ? folderData.reduce(
        (total, folder) => total + (folder.videos ? folder.videos.length : 0),
        0
      )
    : 0;

  const completedVideos = folderData
    ? folderData.reduce(
        (total, folder) =>
          total +
          (folder.videos
            ? folder.videos.filter(
                (video) =>
                  video.progress >= convertDurationToSeconds(video.duration)
              ).length
            : 0),
        0
      )
    : 0;

  const startedVideosCount = folderData
    ? folderData.reduce(
        (total, folder) =>
          total +
          (folder.videos
            ? folder.videos.filter((video) => video.progress > 0).length
            : 0),
        0
      )
    : 0;

  const completionPercentage =
    numberOfVideos > 0
      ? Math.floor((completedVideos / numberOfVideos) * 100)
      : 0;

  return (
    <div
      className="w-p49 border border-colorborder my-4 p-4 flex flex-col justify-between hover:bg-primarydark transition ease-in-out duration-200 cursor-pointer relative rounded-md"
      onClick={handleClick}
    >
      <div>
        <h3 className="text-lg mb-2 font-semibold max-w-4/5 overflow-x-hidden">
          {course.name}
        </h3>
        <img
          src={
            startedVideosCount <= 0
              ? newIcon
              : completionPercentage < 100
              ? progressIcon
              : checkIcon
          }
          alt="Check Icon"
          className={`${
            startedVideosCount <= 0 ? "w-6 h-6" : "w-7 h-7"
          } inline-block absolute top-3 right-3`}
        />
        <p className="text-colortextsecondary text-sm font-mono flex mt-4 max-w-4/5">
          <img
            src={folderImg}
            alt="Folder"
            className="inline-block w-4 h-4 mr-2"
          />
          {course.path}
        </p>
      </div>
      <div>
        <div className="flex justify-between mt-6 mb-3">
          <p className="text-colortextsecondary text-sm text-end">
            {numberOfVideos} {numberOfVideos > 1 ? "videos" : "video"}
          </p>
          <p className="text-colortextsecondary text-sm text-end">
            {completionPercentage}% completed
          </p>
        </div>

        {/* Progress bar */}
        <div className="relative w-full h-1 bg-colorsecondary rounded-md">
          <div
            className={`h-1 absolute rounded-md`}
            style={{
              width: `${completionPercentage}%`,
              backgroundImage:
                completionPercentage > 0 && completionPercentage < 100
                  ? "linear-gradient(to right, #f97316, #ec4899)" // Orange gradient for in-progress
                  : completionPercentage >= 100
                  ? "linear-gradient(to right, #4caf50, #81c784)" // Green gradient for completion
                  : undefined, // No gradient for 0%
              backgroundSize: "200% 200%",
            }}
          />

          {/* If completed, set width to 100% */}
          {completionPercentage >= 100 && (
            <div
              className="h-1 absolute rounded-md"
              style={{ width: "100%" }}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default CourseCard;

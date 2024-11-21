import React from "react";
import { useNavigate } from "react-router-dom";
import TextCardTiny from "./TextCardTiny";

const CourseCardTiny = ({ course, courseColor }) => {
  const navigate = useNavigate();

  const handleClick = () => {
    navigate(
      `/folder/${course.id}?videoIdToPlay=${course.last_played_video?.id}`
    );
  };

  // Calculate the remaining time in minutes or seconds
  const calculateRemainingTime = (video) => {
    if (video && video.duration && video.progress !== undefined) {
      const durationInSeconds = convertDurationToSeconds(video.duration); // Convert duration to seconds
      const watchedTimeInSeconds = video.progress;
      const remainingTimeInSeconds = durationInSeconds - watchedTimeInSeconds;

      return remainingTimeInSeconds < 0 ? 0 : remainingTimeInSeconds;
    }
    return 0; // No time left if no video data
  };

  // Calculate the completion percentage
  const calculateCompletionPercentage = (video) => {
    if (video && video.duration && video.progress !== undefined) {
      const durationInSeconds = convertDurationToSeconds(video.duration); // Convert duration to seconds
      const watchedTimeInSeconds = video.progress;

      // Calculate completion percentage based on progress
      const completionPercentage =
        (watchedTimeInSeconds / durationInSeconds) * 100;
      return Math.min(100, Math.max(0, completionPercentage)); // Clamp between 0% and 100%
    }
    return 0; // No completion if no video data
  };

  // Convert HH:MM:SS or other string formats into seconds
  const convertDurationToSeconds = (duration) => {
    const parts = duration.split(":").map((part) => parseInt(part, 10));
    if (parts.length === 3) {
      return parts[0] * 3600 + parts[1] * 60 + parts[2]; // HH:MM:SS format
    } else if (parts.length === 2) {
      return parts[0] * 60 + parts[1]; // MM:SS format
    } else {
      return 0; // Invalid format
    }
  };

  // Calculate the remaining minutes or seconds and completion percentage
  const remainingTime = course.last_played_video
    ? calculateRemainingTime(course.last_played_video)
    : 0;

  const completionPercentage = course.last_played_video
    ? calculateCompletionPercentage(course.last_played_video)
    : 0;

  return (
    <div
      className="my-1 flex hover:bg-primarydark transition ease-in-out duration-200 cursor-pointer relative rounded-md"
      onClick={handleClick}
    >
      <TextCardTiny word={course.name} color={courseColor} />
      <div className="border border-colorborder rounded-md rounded-l-none border-l-0 flex-col flex-grow justify-between h-20 flex py-2 px-3 w-0">
        <div className="font-semibold truncate">
          {course.last_played_video?.name
            ? course.last_played_video.name.replace(/\.\w+$/, "")
            : "Never Played"}
        </div>
        <div className="flex justify-between items-baseline">
          <span className="text-sm text-colortextsecondary -mt-1.5 max-w-3/5 truncate">
            {course.name}
          </span>
          <span className="text-xxs text-colortextsecondary -mt-1.5">
            🏁{" "}
            {remainingTime < 60
              ? Math.floor(remainingTime)
              : Math.max(0, (remainingTime / 60).toFixed(1))}{" "}
            {remainingTime < 60 ? "secs" : "mins"} left
          </span>
        </div>

        {/* Progress bar */}
        <div className="relative w-full h-0.8 bg-colorsecondary rounded-md">
          <div
            className={`h-0.8 absolute rounded-md`}
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
              className="h-0.8 absolute rounded-md"
              style={{ width: "100%" }}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default CourseCardTiny;

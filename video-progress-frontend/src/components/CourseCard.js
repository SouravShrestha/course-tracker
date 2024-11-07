import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import folderImg from "../assets/images/folder.png";
import checkIcon from "../assets/images/check.png";
import newIcon from "../assets/images/new.png";
import progressIcon from "../assets/images/progress.png";
import { calculateVideoStats } from "../utils/courseUtils";
import TextCard from "./TextCard";
import Tag from "./Tag";

const CourseCard = ({ course, courseColor }) => {
  const navigate = useNavigate();

  const handleClick = () => {
    navigate(`/folder/${course.id}`);
  };

  const { numberOfVideos, startedVideosCount, completionPercentage } =
    calculateVideoStats(course);

  return (
    <div
      className="my-1 flex flex-col justify-between hover:bg-primarydark transition ease-in-out duration-200 cursor-pointer relative rounded-md"
      onClick={handleClick}
    >
      <TextCard word={course.name} color={courseColor}/>
      <div className="p-4 border border-colorborder rounded-md rounded-t-none border-t-0 flex-grow">
        <div className="w-full relative">
          <h3 className="text-lg mb-0 font-semibold max-w-4/5 overflow-x-hidden">
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
            } inline-block absolute top-0 right-0`}
          />
          <div className="text-colortextsecondary text-sm font-mono mt-4 w-full">
            <div className="flex items-start">
              <img
                src={folderImg}
                alt="Folder"
                className="w-4 pt-1 pr-0.5 mr-2"
              />
              <div className="w-11/12 max-w-11/12 text-wrap break-all">
                {course.path}
              </div>
            </div>
          </div>
        </div>
        <div className="flex justify-between mt-10 mb-3">
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
        <div className="flex mt-6 flex-wrap">
          {course.tags.map((tag, index) => (
            <Tag key={index} text={tag.name} color={tag.color}/>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CourseCard;

'use client';
import React, { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import LibraryExplorer from "./LibraryExplorer";
import VideoPlayer from "./VideoPlayer";
import { fetchSubfolders, getVideoUrl } from "../utils/api";

const CourseDetail = () => {
  const params = useParams();
  const id = params?.id;
  const [contents, setContents] = useState([]);
  const [selectedVideo, setSelectedVideo] = useState("");
  const [selectedVideoPath, setSelectedVideoPath] = useState("");
  const [videoProgress, setVideoProgress] = useState({});
  const searchParams = useSearchParams();
  const videoIdToPlay = searchParams.get("videoIdToPlay");
  const [isManualChange, setIsManualChange] = useState(false);

  const handleVideoClick = (video) => {
    setIsManualChange(true); // Mark manual change
    setSelectedVideo(video);
    setSelectedVideoPath(video.path);
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await fetchSubfolders(id);
        setContents(data); // Update the state with the fetched data
      } catch (error) {
        console.error("Error fetching subfolders:", error); // Handle any errors
      }
    };

    fetchData();
  }, [id]); // Fetch data when the 'id' changes

  // Function to update video progress
  const updateVideoProgress = (videoId, progress) => {
    setVideoProgress((prevProgress) => ({
      ...prevProgress,
      [videoId]: progress,
    }));
    setIsManualChange(false)
  };

  const videoList = contents.flatMap((content) => {
    if (content.lessons && content.lessons.length > 0) {
      return content.lessons.flatMap(ls => ls.videos || []);
    }
    return content.videos || [];
  });

  const currentIndex = videoList.findIndex(
    (video) => video.id === selectedVideo.id
  );
  const nextVideo =
    currentIndex < videoList.length - 1 ? videoList[currentIndex + 1] : null;
  const prevVideo = currentIndex > 0 ? videoList[currentIndex - 1] : null;

  const [dropdownVisible, setDropdownVisible] = useState(false); // State to track dropdown visibility
  const handleDropdownVisibilityChange = (isVisible) => {
    setDropdownVisible(isVisible); // Update the parent component's dropdown visibility state
  };

  return (
    <div className="flex w-full">
      <div
        className={`float-left w-2/6 xl:w-p21 text-colortextsecondary sticky top-0 h-[calc(100vh-6.5rem)] select-none mt-4 pl-2 ${
          dropdownVisible ? "overflow-hidden pr-3.5" : "overflow-y-scroll pr-2"
        }`}
      >
        <LibraryExplorer
          contents={contents}
          onVideoClick={handleVideoClick}
          videoProgress={videoProgress}
          activeVideoPath={selectedVideoPath}
          videoIdToPlay={videoIdToPlay}
          onDropdownVisibilityChange={handleDropdownVisibilityChange}
        />
      </div>
      <div className="w-5/6 xl:w-p79 h-[calc(100vh-5rem)] overflow-y-auto">
        <VideoPlayer
          videoPath={selectedVideoPath ? getVideoUrl(selectedVideoPath) : ""}
          video={selectedVideo}
          cUpdateVideoProgress={updateVideoProgress}
          nextVideo={nextVideo}
          prevVideo={prevVideo}
          onVideoChange={handleVideoClick}
          isManualChange={isManualChange}
          setIsManualChange={setIsManualChange} 
        />
      </div>
    </div>
  );
};

export default CourseDetail;

import React, { useEffect, useState } from "react";
import { useParams, useLocation } from "react-router-dom";
import LibraryExplorer from "./LibraryExplorer"; // Import your LibraryExplorer component
import VideoPlayer from "./VideoPlayer"; // Import your VideoPlayer component

const CourseDetail = () => {
  const { id } = useParams(); // Course ID
  const [contents, setContents] = useState([]);
  const [selectedVideo, setSelectedVideo] = useState("");
  const [selectedVideoPath, setSelectedVideoPath] = useState("");
  const [videoProgress, setVideoProgress] = useState({});
  const location = useLocation(); // Get the current location (URL)
  const videoIdToPlay = new URLSearchParams(location.search).get("videoIdToPlay");

  const handleVideoClick = (video) => {
    setSelectedVideo(video);
    setSelectedVideoPath(video.path);
  };

  useEffect(() => {
    const fetchSubfolders = async () => {
      try {
        const response = await fetch(
          `http://localhost:8000/api/folders/${id}/subfolders`
        );
        const data = await response.json();
        setContents(data); // Update the state with the fetched data
      } catch (error) {
        console.error("Error fetching subfolders:", error); // Handle any errors
      }
    };

    fetchSubfolders();
  }, [id]); // Fetch data when the 'id' changes

  // Function to update video progress
  const updateVideoProgress = (videoId, progress) => {
    setVideoProgress((prevProgress) => ({
      ...prevProgress,
      [videoId]: progress,
    }));
  };

  const videoList = contents.flatMap((content) => content.videos || []);
  const currentIndex = videoList.findIndex(
    (video) => video.id === selectedVideo.id
  );
  const nextVideo =
    currentIndex < videoList.length - 1 ? videoList[currentIndex + 1] : null;
  const prevVideo = currentIndex > 0 ? videoList[currentIndex - 1] : null;

  return (
    <div className="flex w-full">
      <div className="float-left w-p21 text-colortextsecondary sticky top-0 overflow-y-auto h-[calc(100vh-6.5rem)] select-none mt-4 px-2">
        <LibraryExplorer
          contents={contents}
          onVideoClick={handleVideoClick}
          videoProgress={videoProgress}
          activeVideoPath={selectedVideoPath}
          videoIdToPlay={videoIdToPlay}
        />
      </div>
      <div className="w-p79 h-[calc(100vh-5rem)] overflow-y-auto">
        <VideoPlayer
          videoPath={
            selectedVideoPath
              ? `http://localhost:8000/videos/?video_path=${encodeURIComponent(
                  selectedVideoPath
                )}`
              : ""
          }
          video={selectedVideo}
          cUpdateVideoProgress={updateVideoProgress}
          nextVideo={nextVideo}
          prevVideo={prevVideo}
          onVideoChange={handleVideoClick}
        />
      </div>
    </div>
  );
};

export default CourseDetail;

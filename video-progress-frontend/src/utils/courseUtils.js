export const calculateVideoStats = (folders) => {
  let numberOfVideos = 0;
  let startedVideosCount = 0;
  let totalProgress = 0;

  console.log(folders);

  folders?.subfolders.forEach((subfolder) => {

    const videos = subfolder.videos;
    numberOfVideos += videos.length;

    videos.forEach((video) => {
      if (video.progress > 0) {
        startedVideosCount++;
      }
      totalProgress += video.progress;
    });
  });

  const completionPercentage =
    numberOfVideos > 0 ? (totalProgress / numberOfVideos) * 100 : 0;

  return { numberOfVideos, startedVideosCount, completionPercentage };
};

export default calculateVideoStats;
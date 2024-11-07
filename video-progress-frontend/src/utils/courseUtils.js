export const calculateVideoStats = (folders) => {
  let numberOfVideos = 0;
  let startedVideosCount = 0;
  let totalProgress = 0;

  folders?.subfolders.forEach((subfolder) => {

    const videos = subfolder.videos;
    numberOfVideos += videos.length;

    videos.forEach((video) => {
      if (video.progress > 0) {
        startedVideosCount++;
      }
      totalProgress += video.progress > 0 ? 1 : 0;
    });

  });

  const completionPercentage =
    numberOfVideos > 0 ? Math.round((totalProgress / numberOfVideos) * 100) : 0;

  return { numberOfVideos, startedVideosCount, completionPercentage };
};
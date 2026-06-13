/** @type {import('next').NextConfig} */
const nextConfig = {
  // Allow serving local video files through the /api/video route
  // by disabling the response size limit for that route
  experimental: {
    serverComponentsExternalPackages: ['better-sqlite3', 'ffprobe-static'],
  },
};

export default nextConfig;

import os from 'os';

function getLocalIp() {
  const nets = os.networkInterfaces();
  for (const iface of Object.values(nets)) {
    for (const net of iface) {
      if (net.family === 'IPv4' && !net.internal) return net.address;
    }
  }
  return 'localhost';
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['better-sqlite3', 'ffprobe-static'],
  },
  env: {
    NEXT_PUBLIC_LOCAL_IP: getLocalIp(),
  },
};

export default nextConfig;

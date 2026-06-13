const os = require('os');
const { spawn } = require('child_process');

function getLocalIp() {
  const nets = os.networkInterfaces();
  for (const iface of Object.values(nets)) {
    for (const net of iface) {
      if (net.family === 'IPv4' && !net.internal) return net.address;
    }
  }
  return null;
}

const ip = getLocalIp();
const cmd = process.argv[2] ?? 'dev';

if (ip) console.log(`\n  ➜  Network:  http://${ip}:3000\n`);

spawn('npx', ['next', cmd, '-H', '0.0.0.0'], { stdio: 'inherit', shell: true });

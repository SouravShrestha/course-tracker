export const dynamic = 'force-dynamic';
import { ok, err, ensureDb } from '@/lib/apiHelper';
import { updateProgress, search } from '@/lib/db/repositories/videoRepository';
import { createReadStream, statSync } from 'fs';

ensureDb();

// GET /api/videos?query=X  → search
// GET /api/videos?video_path=X  → stream video file
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const videoPath = searchParams.get('video_path');
  const query = searchParams.get('query');

  if (videoPath) {
    let stat;
    try {
      stat = statSync(videoPath);
    } catch {
      return new Response('File not found', { status: 404 });
    }

    const range = request.headers.get('range');
    const fileSize = stat.size;
    const ext = videoPath.split('.').pop().toLowerCase();
    const contentType = ext === 'mkv' ? 'video/x-matroska' : ext === 'avi' ? 'video/avi' : 'video/mp4';

    if (range) {
      const [startStr, endStr] = range.replace(/bytes=/, '').split('-');
      const start = parseInt(startStr, 10);
      const end = endStr ? parseInt(endStr, 10) : fileSize - 1;
      const chunkSize = end - start + 1;

      const stream = createReadStream(videoPath, { start, end });
      const nodeToWeb = new ReadableStream({
        start(controller) {
          stream.on('data', chunk => controller.enqueue(chunk));
          stream.on('end', () => controller.close());
          stream.on('error', e => controller.error(e));
        },
      });

      return new Response(nodeToWeb, {
        status: 206,
        headers: {
          'Content-Range': `bytes ${start}-${end}/${fileSize}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': String(chunkSize),
          'Content-Type': contentType,
        },
      });
    }

    const stream = createReadStream(videoPath);
    const nodeToWeb = new ReadableStream({
      start(controller) {
        stream.on('data', chunk => controller.enqueue(chunk));
        stream.on('end', () => controller.close());
        stream.on('error', e => controller.error(e));
      },
    });

    return new Response(nodeToWeb, {
      headers: {
        'Content-Length': String(fileSize),
        'Accept-Ranges': 'bytes',
        'Content-Type': contentType,
      },
    });
  }

  return ok(search(query ?? ''));
}

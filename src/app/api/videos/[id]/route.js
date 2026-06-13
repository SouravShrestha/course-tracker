export const dynamic = 'force-dynamic';
import { ok, err, ensureDb } from '@/lib/apiHelper';
import { updateProgress } from '@/lib/db/repositories/videoRepository';

ensureDb();

export async function PUT(request, { params }) {
  const { id } = await params;
  const { progress } = await request.json();
  try {
    return ok(updateProgress(Number(id), Math.round(progress)));
  } catch (e) {
    return err(e.message, 404);
  }
}

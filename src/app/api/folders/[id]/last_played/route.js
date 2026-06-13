export const dynamic = 'force-dynamic';
import { ok, err, ensureDb } from '@/lib/apiHelper';
import { updateLastPlayed, getLastPlayed } from '@/lib/db/repositories/folderRepository';

ensureDb();

export async function GET(_, { params }) {
  const { id } = await params;
  const lp = getLastPlayed(Number(id));
  if (!lp) return err('Not found', 404);
  return ok(lp);
}

export async function PUT(request, { params }) {
  const { id } = await params;
  const { video_id } = await request.json();
  return ok(updateLastPlayed(Number(id), video_id));
}

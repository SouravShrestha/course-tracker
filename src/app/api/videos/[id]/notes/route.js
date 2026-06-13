export const dynamic = 'force-dynamic';
import { ok, err, ensureDb } from '@/lib/apiHelper';
import { create, getForVideo } from '@/lib/db/repositories/noteRepository';

ensureDb();

export async function GET(_, { params }) {
  const { id } = await params;
  return ok(getForVideo(Number(id)));
}

export async function POST(request, { params }) {
  const { id } = await params;
  const { content } = await request.json();
  if (!content) return err('content is required');
  try {
    return ok(create(Number(id), content));
  } catch (e) {
    return err(e.message, 404);
  }
}

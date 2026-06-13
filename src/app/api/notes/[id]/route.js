export const dynamic = 'force-dynamic';
import { ok, err, ensureDb } from '@/lib/apiHelper';
import { remove, update } from '@/lib/db/repositories/noteRepository';

ensureDb();

export async function DELETE(_, { params }) {
  const { id } = await params;
  try {
    return ok(remove(Number(id)));
  } catch (e) {
    return err(e.message, 404);
  }
}

export async function PUT(request, { params }) {
  const { id } = await params;
  const { content } = await request.json();
  if (!content) return err('content is required');
  try {
    return ok(update(Number(id), content));
  } catch (e) {
    return err(e.message, 404);
  }
}

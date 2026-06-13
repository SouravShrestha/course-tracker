export const dynamic = 'force-dynamic';
import { ok, err, ensureDb } from '@/lib/apiHelper';
import * as repo from '@/lib/db/repositories/mainFolderRepository';

ensureDb();

export async function DELETE(_, { params }) {
  const { id } = await params;
  repo.remove(Number(id));
  return ok({ detail: 'Main folder removed.' });
}

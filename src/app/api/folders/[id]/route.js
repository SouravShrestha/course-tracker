export const dynamic = 'force-dynamic';
import { ok, err, ensureDb } from '@/lib/apiHelper';
import { getById, removeFolder } from '@/lib/db/repositories/folderRepository';

ensureDb();

export async function GET(_, { params }) {
  const { id } = await params;
  const folder = getById(Number(id));
  if (!folder) return err('Folder not found', 404);
  return ok(folder);
}

export async function DELETE(_, { params }) {
  const { id } = await params;
  removeFolder(Number(id));
  return ok({ detail: 'Folder removed.' });
}


export const dynamic = 'force-dynamic';
import { ok, err, ensureDb } from '@/lib/apiHelper';
import { getById } from '@/lib/db/repositories/folderRepository';

ensureDb();

export async function GET(_, { params }) {
  const { id } = await params;
  const folder = getById(Number(id));
  if (!folder) return err('Folder not found', 404);
  return ok(folder);
}

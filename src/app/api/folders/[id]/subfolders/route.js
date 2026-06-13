export const dynamic = 'force-dynamic';
import { ok, err, ensureDb } from '@/lib/apiHelper';
import { getSubfolders } from '@/lib/db/repositories/folderRepository';

ensureDb();

export async function GET(_, { params }) {
  const { id } = await params;
  const subs = getSubfolders(Number(id));
  if (!subs.length) return err('No subfolders found', 404);
  return ok(subs);
}

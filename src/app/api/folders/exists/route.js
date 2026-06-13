export const dynamic = 'force-dynamic';
import { ok, err, ensureDb } from '@/lib/apiHelper';
import { folderExists } from '@/lib/db/repositories/folderRepository';

ensureDb();

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const folder_path = searchParams.get('folder_path');
  if (!folder_path) return err('folder_path is required');
  if (!folderExists(folder_path)) return err('Folder does not exist or contains no videos.', 404);
  return ok({ exists: true });
}

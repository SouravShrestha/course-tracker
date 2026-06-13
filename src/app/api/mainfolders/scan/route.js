export const dynamic = 'force-dynamic';
import { ok, ensureDb } from '@/lib/apiHelper';
import { scanAllMainFolders } from '@/lib/db/repositories/folderRepository';

ensureDb();

export async function POST() {
  return ok(scanAllMainFolders());
}

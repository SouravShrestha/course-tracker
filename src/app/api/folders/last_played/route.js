export const dynamic = 'force-dynamic';
import { ok, ensureDb } from '@/lib/apiHelper';
import { getAllLastPlayed } from '@/lib/db/repositories/folderRepository';

ensureDb();

export async function GET() {
  return ok(getAllLastPlayed());
}

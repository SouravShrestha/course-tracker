export const dynamic = 'force-dynamic';
import { ok, ensureDb } from '@/lib/apiHelper';
import { getAll, search } from '@/lib/db/repositories/folderRepository';

ensureDb();

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('query');
  return query !== null ? ok(search(query)) : ok(getAll());
}

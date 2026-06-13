export const dynamic = 'force-dynamic';
import { ok, err, ensureDb } from '@/lib/apiHelper';
import { search } from '@/lib/db/repositories/tagRepository';
import { deleteUnmapped } from '@/lib/db/repositories/tagRepository';

ensureDb();

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('query') ?? '';
  return ok(search(query));
}

export async function DELETE() {
  return ok(deleteUnmapped());
}

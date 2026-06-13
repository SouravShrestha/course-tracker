export const dynamic = 'force-dynamic';
import { ok, err, ensureDb } from '@/lib/apiHelper';
import { getForFolder, addToFolder, removeFromFolder } from '@/lib/db/repositories/tagRepository';

ensureDb();

export async function GET(_, { params }) {
  const { id } = await params;
  return ok(getForFolder(Number(id)));
}

export async function PUT(request, { params }) {
  const { id } = await params;
  const { tag_name } = await request.json();
  if (!tag_name) return err('tag_name is required');
  return ok(addToFolder(Number(id), tag_name));
}

export async function DELETE(request, { params }) {
  const { id } = await params;
  const { tag_name } = await request.json();
  if (!tag_name) return err('tag_name is required');
  return ok(removeFromFolder(Number(id), tag_name));
}

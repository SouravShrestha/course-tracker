export const dynamic = 'force-dynamic';
import { ok, err, ensureDb } from '@/lib/apiHelper';
import * as repo from '@/lib/db/repositories/mainFolderRepository';
import fs from 'fs';

ensureDb();

export async function GET() {
  return ok(repo.getAll());
}

export async function POST(request) {
  const { path } = await request.json();
  if (!path) return err('Path is required');
  if (!fs.existsSync(path)) return err('The specified folder path does not exist.');
  return ok(repo.add(path));
}

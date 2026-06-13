import { getDb } from '@/lib/db/database';
import { runMigrations } from '@/lib/db/migrations';
import { NextResponse } from 'next/server';

// Ensure DB and schema are bootstrapped once on first API call
let initialized = false;
export function ensureDb() {
  if (!initialized) {
    runMigrations(getDb());
    initialized = true;
  }
  return getDb();
}

export function ok(data) {
  return NextResponse.json(data);
}

export function err(message, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

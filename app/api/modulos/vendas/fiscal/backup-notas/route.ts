import {getFiscalNoteBackupRuntime} from '@/app/vendas/lib/server/fiscal-note-backup-runtime.mjs';
import {handleFiscalNoteBackupRequest} from '@/app/vendas/lib/server/fiscal-note-backup-http.mjs';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export const maxDuration=120;
export async function GET(request:Request){return handleFiscalNoteBackupRequest({request,runtime:await getFiscalNoteBackupRuntime()});}
export async function POST(request:Request){return handleFiscalNoteBackupRequest({request,runtime:await getFiscalNoteBackupRuntime()});}

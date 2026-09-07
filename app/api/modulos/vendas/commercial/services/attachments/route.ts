import { createHash, randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { getFiscalStatusRuntime } from '@/app/vendas/lib/server/fiscal-status-runtime.mjs';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const BUCKET = 'vendas-os-anexos';
const MAX_FILE_BYTES = 10 * 1024 * 1024;
const MAX_FILES = 5;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const TYPES: Record<string, string> = {
  'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'application/pdf': 'pdf',
};

function reply(status: number, body: Record<string, unknown>) {
  return NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store, max-age=0', 'X-Content-Type-Options': 'nosniff' } });
}

function validSignature(bytes: Uint8Array, type: string) {
  if (type === 'image/jpeg') return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (type === 'image/png') return bytes.length >= 8 && [0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a].every((value, index) => bytes[index] === value);
  if (type === 'image/webp') return bytes.length >= 12 && Buffer.from(bytes.subarray(0, 4)).toString() === 'RIFF' && Buffer.from(bytes.subarray(8, 12)).toString() === 'WEBP';
  if (type === 'application/pdf') return bytes.length >= 5 && Buffer.from(bytes.subarray(0, 5)).toString() === '%PDF-';
  return false;
}

async function access(request: Request, companyId: string, permission: 'services.view' | 'services.edit') {
  const runtimeServices = await getFiscalStatusRuntime();
  if (!runtimeServices?.configured || !runtimeServices.accessResolver) return { error: reply(503, { ok: false, message: 'O armazenamento de anexos não está disponível neste ambiente.' }) };
  const resolved = await runtimeServices.accessResolver.resolve(request, { companyId }).catch(() => null);
  const boundary = resolved?.boundary;
  if (!resolved?.authenticated || !boundary?.userId || boundary.companyId !== companyId) return { error: reply(401, { ok: false, message: 'Confirme novamente sua sessão e o perfil empresarial.' }) };
  if (!(boundary.userActive && boundary.membershipActive && boundary.companyActive && boundary.moduleActive) || resolved.effectivePermissions?.[permission] !== true) return { error: reply(403, { ok: false, message: 'Seu acesso não permite utilizar anexos desta ordem de serviço.' }) };
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  if (!url || !key) return { error: reply(503, { ok: false, message: 'O armazenamento protegido não está configurado.' }) };
  return { admin: createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } }), actorId: boundary.userId };
}

export async function POST(request: Request) {
  const companyId = new URL(request.url).searchParams.get('companyId')?.trim() || '';
  if (!UUID.test(companyId)) return reply(400, { ok: false, message: 'Selecione novamente o perfil empresarial.' });
  const granted = await access(request, companyId, 'services.edit');
  if ('error' in granted) return granted.error;
  const form = await request.formData().catch(() => null);
  const orderId = String(form?.get('orderId') || '').trim();
  const files = form?.getAll('attachments').filter((item): item is File => item instanceof File) || [];
  if (!UUID.test(orderId) || !files.length || files.length > MAX_FILES) return reply(400, { ok: false, message: 'Selecione uma ordem e até cinco arquivos válidos.' });

  const { data: order } = await granted.admin.from('vendas_operacoes').select('id,tipo').eq('empresa_id', companyId).eq('id', orderId).maybeSingle();
  if (!order || order.tipo !== 'ordem_servico') return reply(404, { ok: false, message: 'Ordem de serviço não localizada neste perfil.' });
  const { count } = await granted.admin.from('vendas_os_anexos').select('id', { count: 'exact', head: true }).eq('empresa_id', companyId).eq('operacao_id', orderId);
  if ((count || 0) + files.length > MAX_FILES) return reply(409, { ok: false, message: 'Esta ordem já atingiu o limite de cinco anexos.' });

  const stored: string[] = [];
  const created: Record<string, unknown>[] = [];
  try {
    for (const file of files) {
      if (!TYPES[file.type] || file.size < 1 || file.size > MAX_FILE_BYTES) throw new Error('Use JPG, PNG, WEBP ou PDF, com até 10 MB por arquivo.');
      const bytes = new Uint8Array(await file.arrayBuffer());
      if (!validSignature(bytes, file.type)) throw new Error(`O conteúdo de “${file.name.slice(0, 100)}” não corresponde ao formato informado.`);
      const checksum = createHash('sha256').update(bytes).digest('hex');
      const path = `${companyId}/${orderId}/${randomUUID()}.${TYPES[file.type]}`;
      const uploaded = await granted.admin.storage.from(BUCKET).upload(path, bytes, { contentType: file.type, cacheControl: '3600', upsert: false });
      if (uploaded.error) throw new Error('Não foi possível guardar um dos arquivos no armazenamento privado.');
      stored.push(path);
      const inserted = await granted.admin.from('vendas_os_anexos').insert({ empresa_id: companyId, operacao_id: orderId, nome: file.name.slice(0, 255), tipo_mime: file.type, tamanho_bytes: file.size, referencia_storage: path, checksum_sha256: checksum, criado_por: granted.actorId }).select('id,nome,tipo_mime,tamanho_bytes,checksum_sha256,criado_em').single();
      if (inserted.error || !inserted.data) throw new Error('Não foi possível vincular um dos arquivos à ordem de serviço.');
      created.push({ id: inserted.data.id, name: inserted.data.nome, type: inserted.data.tipo_mime, size: Number(inserted.data.tamanho_bytes), checksum: inserted.data.checksum_sha256, addedAt: inserted.data.criado_em });
    }
    const audit = await granted.admin.from('vendas_eventos').insert({ empresa_id: companyId, recurso_tipo: 'ordem_servico', recurso_id: orderId, evento: 'anexos_adicionados', resumo: `${created.length} ${created.length === 1 ? 'evidência adicionada' : 'evidências adicionadas'} à ordem de serviço.`, metadados: { attachmentIds: created.map((item) => item.id), checksums: created.map((item) => item.checksum) }, criado_por: granted.actorId });
    if (audit.error) throw new Error('Os arquivos foram enviados, mas o histórico da ordem não pôde ser atualizado.');
    return reply(201, { ok: true, attachments: created });
  } catch (cause) {
    if (stored.length) {
      await granted.admin.from('vendas_os_anexos').delete().eq('empresa_id', companyId).eq('operacao_id', orderId).in('referencia_storage', stored);
      await granted.admin.storage.from(BUCKET).remove(stored);
    }
    return reply(400, { ok: false, message: cause instanceof Error ? cause.message : 'Não foi possível anexar os arquivos.' });
  }
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const companyId = url.searchParams.get('companyId')?.trim() || '';
  const attachmentId = url.searchParams.get('attachmentId')?.trim() || '';
  if (!UUID.test(companyId) || !UUID.test(attachmentId)) return reply(400, { ok: false, message: 'Anexo inválido.' });
  const granted = await access(request, companyId, 'services.view');
  if ('error' in granted) return granted.error;
  const { data: attachment } = await granted.admin.from('vendas_os_anexos').select('referencia_storage').eq('empresa_id', companyId).eq('id', attachmentId).maybeSingle();
  if (!attachment) return reply(404, { ok: false, message: 'Anexo não localizado neste perfil.' });
  const signed = await granted.admin.storage.from(BUCKET).createSignedUrl(attachment.referencia_storage, 300);
  if (signed.error || !signed.data?.signedUrl) return reply(502, { ok: false, message: 'Não foi possível abrir o anexo.' });
  return reply(200, { ok: true, url: signed.data.signedUrl });
}

import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { createReadStream } from 'node:fs';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { extname, join } from 'node:path';
import { timingSafeEqual } from 'node:crypto';

const PORT = Number(process.env.PORT || 8080);
const SUPABASE_URL = String(process.env.SUPABASE_URL || '').trim().replace(/\/$/, '');
const SUPABASE_SERVICE_ROLE_KEY = String(process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
const WORKER_SECRET = String(process.env.WORKER_SECRET || '').trim();
const BUCKET = process.env.STORAGE_BUCKET || 'vendas-divulgacao';
const MAX_VIDEO_BYTES = Number(process.env.MAX_VIDEO_BYTES || 110 * 1024 * 1024);

function json(res, status, payload) {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
  res.end(JSON.stringify(payload));
}

function autorizado(req) {
  const recebido = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (!recebido || !WORKER_SECRET) return false;
  const a = Buffer.from(recebido);
  const b = Buffer.from(WORKER_SECRET);
  return a.length === b.length && timingSafeEqual(a, b);
}

function caminhoCodificado(caminho) {
  return String(caminho).split('/').map(encodeURIComponent).join('/');
}

function headersSupabase(extra = {}) {
  return {
    apikey: SUPABASE_SERVICE_ROLE_KEY,
    authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    ...extra,
  };
}

async function supabaseRest(tabela, filtro, opcoes = {}) {
  const resposta = await fetch(`${SUPABASE_URL}/rest/v1/${tabela}?${filtro}`, {
    method: opcoes.method || 'GET',
    headers: headersSupabase({
      ...(opcoes.body ? { 'content-type': 'application/json' } : {}),
      ...(opcoes.prefer ? { prefer: opcoes.prefer } : {}),
    }),
    body: opcoes.body ? JSON.stringify(opcoes.body) : undefined,
  });
  if (!resposta.ok) throw new Error(`Supabase ${tabela}: ${resposta.status} ${await resposta.text()}`);
  if (resposta.status === 204) return null;
  const texto = await resposta.text();
  return texto ? JSON.parse(texto) : null;
}

async function buscarUm(tabela, id, campos = '*') {
  const dados = await supabaseRest(tabela, `id=eq.${encodeURIComponent(id)}&select=${encodeURIComponent(campos)}&limit=1`);
  return Array.isArray(dados) ? dados[0] || null : null;
}

async function atualizar(tabela, id, dados) {
  return supabaseRest(tabela, `id=eq.${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: dados,
    prefer: 'return=minimal',
  });
}

async function lerJson(req) {
  const partes = [];
  let tamanho = 0;
  for await (const parte of req) {
    tamanho += parte.length;
    if (tamanho > 64 * 1024) throw new Error('Requisição excedeu o limite permitido.');
    partes.push(parte);
  }
  return JSON.parse(Buffer.concat(partes).toString('utf8') || '{}');
}

async function executarFfmpeg(entrada, saida) {
  const argumentos = [
    '-hide_banner', '-loglevel', 'error', '-y',
    '-i', entrada,
    '-map', '0:v:0',
    '-frames:v', '1',
    '-vf', "select=eq(n\\,0),scale=720:720:force_original_aspect_ratio=decrease",
    '-q:v', '3',
    saida,
  ];
  await new Promise((resolve, reject) => {
    const processo = spawn('ffmpeg', argumentos, { stdio: ['ignore', 'ignore', 'pipe'] });
    let erro = '';
    processo.stderr.on('data', (parte) => { erro = `${erro}${parte}`.slice(-4000); });
    processo.on('error', reject);
    processo.on('close', (codigo) => codigo === 0 ? resolve() : reject(new Error(erro || `FFmpeg encerrou com código ${codigo}.`)));
  });
}

async function baixarVideo(material, destino) {
  const url = `${SUPABASE_URL}/storage/v1/object/${BUCKET}/${caminhoCodificado(material.arquivo_path)}`;
  const resposta = await fetch(url, { headers: headersSupabase() });
  if (!resposta.ok || !resposta.body) throw new Error(`Não foi possível baixar o vídeo (${resposta.status}).`);
  const tamanho = Number(resposta.headers.get('content-length') || material.tamanho_bytes || 0);
  if (tamanho > MAX_VIDEO_BYTES) throw new Error('O vídeo excede o limite aceito pelo processador.');
  const partes = [];
  let recebido = 0;
  for await (const parte of resposta.body) {
    recebido += parte.length;
    if (recebido > MAX_VIDEO_BYTES) throw new Error('O vídeo excede o limite aceito pelo processador.');
    partes.push(partes.length ? parte : Buffer.from(parte));
  }
  await writeFile(destino, Buffer.concat(partes));
}

async function enviarMiniatura(caminho, arquivo) {
  const resposta = await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${caminhoCodificado(caminho)}`, {
    method: 'POST',
    headers: headersSupabase({ 'content-type': 'image/jpeg', 'cache-control': '31536000', 'x-upsert': 'true' }),
    body: createReadStream(arquivo),
    duplex: 'half',
  });
  if (!resposta.ok) throw new Error(`Não foi possível salvar a capa (${resposta.status}): ${await resposta.text()}`);
}

function urlPublica(caminho) {
  return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${caminhoCodificado(caminho)}`;
}

function mensagemSegura(erro) {
  const mensagem = erro instanceof Error ? erro.message : String(erro || 'Falha desconhecida.');
  return mensagem.replace(SUPABASE_SERVICE_ROLE_KEY, '[segredo]').slice(0, 1000);
}

async function processar(jobId, materialId) {
  const job = await buscarUm('vendas_mobile_thumbnail_jobs', jobId, 'id,material_id,status,tentativas');
  if (!job || job.material_id !== materialId) throw new Error('Job de miniatura inválido.');
  if (job.status === 'concluido') return { concluido: true, repetido: true };

  const material = await buscarUm(
    'vendas_mobile_divulgacao_materiais',
    materialId,
    'id,empresa_id,pasta_id,tipo,arquivo_path,miniatura_url,mime_type,tamanho_bytes'
  );
  if (!material) throw new Error('Material não encontrado.');
  if (material.tipo !== 'video') throw new Error('O material não é um vídeo.');
  if (material.miniatura_url) {
    await atualizar('vendas_mobile_thumbnail_jobs', jobId, { status: 'concluido', concluido_em: new Date().toISOString(), atualizado_em: new Date().toISOString() });
    return { concluido: true, repetido: true };
  }

  const agora = new Date().toISOString();
  await atualizar('vendas_mobile_thumbnail_jobs', jobId, { status: 'processando', iniciado_em: agora, atualizado_em: agora });
  await atualizar('vendas_mobile_divulgacao_materiais', materialId, { miniatura_status: 'processando', miniatura_erro: null, atualizado_em: agora });

  const pastaTemporaria = await mkdtemp(join(tmpdir(), 'avantalab-thumb-'));
  const extensao = extname(material.arquivo_path).replace(/[^.a-zA-Z0-9]/g, '') || '.mp4';
  const entrada = join(pastaTemporaria, `video${extensao}`);
  const saida = join(pastaTemporaria, 'capa.jpg');
  const miniaturaPath = `${material.empresa_id}/${material.pasta_id}/${material.id}-capa.jpg`;

  try {
    await baixarVideo(material, entrada);
    await executarFfmpeg(entrada, saida);
    const capa = await readFile(saida);
    if (!capa.length) throw new Error('O FFmpeg não gerou uma capa válida.');
    await enviarMiniatura(miniaturaPath, saida);

    const concluidoEm = new Date().toISOString();
    await atualizar('vendas_mobile_divulgacao_materiais', materialId, {
      miniatura_path: miniaturaPath,
      miniatura_url: urlPublica(miniaturaPath),
      miniatura_status: 'pronta',
      miniatura_erro: null,
      miniatura_processada_em: concluidoEm,
      atualizado_em: concluidoEm,
    });
    await atualizar('vendas_mobile_thumbnail_jobs', jobId, {
      status: 'concluido',
      ultimo_erro: null,
      concluido_em: concluidoEm,
      atualizado_em: concluidoEm,
    });
    return { concluido: true };
  } finally {
    await rm(pastaTemporaria, { recursive: true, force: true });
  }
}

async function registrarFalha(jobId, materialId, erro) {
  const mensagem = mensagemSegura(erro);
  let tentativas = 1;
  try {
    const job = await buscarUm('vendas_mobile_thumbnail_jobs', jobId, 'tentativas');
    tentativas = Number(job?.tentativas || 1);
  } catch { /* mantém o erro original */ }
  const definitivo = tentativas >= 3;
  const agora = new Date().toISOString();
  const proxima = new Date(Date.now() + 2 * 60 * 1000).toISOString();
  await Promise.allSettled([
    atualizar('vendas_mobile_thumbnail_jobs', jobId, {
      status: 'erro', ultimo_erro: mensagem, proxima_tentativa_em: proxima, atualizado_em: agora,
    }),
    atualizar('vendas_mobile_divulgacao_materiais', materialId, {
      miniatura_status: definitivo ? 'erro' : 'pendente', miniatura_erro: mensagem, atualizado_em: agora,
    }),
  ]);
  return mensagem;
}

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !WORKER_SECRET) {
  console.error('Configuração ausente: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY e WORKER_SECRET são obrigatórios.');
  process.exit(1);
}

const servidor = createServer(async (req, res) => {
  if (req.method === 'GET' && req.url === '/health') {
    json(res, 200, { ok: true, servico: 'avantalab-video-thumbnail-worker' });
    return;
  }
  if (req.method !== 'POST' || req.url !== '/process-thumbnail') {
    json(res, 404, { erro: 'Rota não encontrada.' });
    return;
  }
  if (!autorizado(req)) {
    json(res, 401, { erro: 'Não autorizado.' });
    return;
  }

  let jobId = '';
  let materialId = '';
  try {
    const corpo = await lerJson(req);
    jobId = String(corpo.jobId || '');
    materialId = String(corpo.materialId || '');
    if (!jobId || !materialId) throw new Error('jobId e materialId são obrigatórios.');
    const resultado = await processar(jobId, materialId);
    json(res, 200, resultado);
  } catch (erro) {
    const mensagem = jobId && materialId ? await registrarFalha(jobId, materialId, erro) : mensagemSegura(erro);
    console.error(JSON.stringify({ evento: 'thumbnail_erro', jobId, materialId, mensagem }));
    json(res, 500, { concluido: false, erro: mensagem });
  }
});

servidor.listen(PORT, '0.0.0.0', () => {
  console.log(JSON.stringify({ evento: 'worker_iniciado', porta: PORT }));
});

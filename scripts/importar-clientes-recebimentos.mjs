import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import XLSX from 'xlsx';
import { createClient } from '@supabase/supabase-js';

function carregarEnv(arquivo) {
  for (const linha of fs.readFileSync(arquivo, 'utf8').split(/\r?\n/)) {
    const item = linha.trim();
    if (!item || item.startsWith('#')) continue;
    const separador = item.indexOf('=');
    if (separador < 1) continue;
    const chave = item.slice(0, separador).trim();
    let valor = item.slice(separador + 1).trim();
    if ((valor.startsWith('"') && valor.endsWith('"')) || (valor.startsWith("'") && valor.endsWith("'"))) valor = valor.slice(1, -1);
    if (!(chave in process.env)) process.env[chave] = valor;
  }
}

const [arquivoPlanilha, nomePerfil] = process.argv.slice(2);
if (!arquivoPlanilha || !nomePerfil) throw new Error('Uso: node scripts/importar-clientes-recebimentos.mjs <planilha.xlsx> <nome do perfil>');

carregarEnv(path.resolve('.env.local'));
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const chave = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !chave) throw new Error('Credenciais administrativas do Supabase não encontradas.');

const planilha = XLSX.readFile(arquivoPlanilha, { cellDates: false });
const primeiraAba = planilha.SheetNames[0];
const linhasBrutas = XLSX.utils.sheet_to_json(planilha.Sheets[primeiraAba], { defval: null });
const linhas = linhasBrutas
  .map((linha) => ({
    status: String(linha.Status ?? '').trim().toLowerCase(),
    empresa: String(linha.EMPRESA ?? '').trim(),
    subempresa: String(linha.SUBEMPRESA ?? '').trim(),
    valor: linha.Valor == null || linha.Valor === '' ? null : Number(linha.Valor),
  }))
  // Ignora rodapés, totais e linhas de formatação que não representam cliente.
  .filter((linha) => linha.empresa || linha.subempresa);

if (!linhas.length) throw new Error('A planilha não possui cadastros.');
for (const [indice, linha] of linhas.entries()) {
  if (!['ativo', 'cancelado', 'inativo'].includes(linha.status)) throw new Error(`Status inválido na linha ${indice + 2}.`);
  if (!linha.empresa || !linha.subempresa) throw new Error(`Empresa ou subempresa ausente na linha ${indice + 2}.`);
  if (linha.valor != null && (!Number.isFinite(linha.valor) || linha.valor <= 0)) throw new Error(`Valor inválido na linha ${indice + 2}.`);
}

const supabase = createClient(url, chave, { auth: { persistSession: false, autoRefreshToken: false } });
const { data, error } = await supabase.rpc('recebimentos_importar_planilha', {
  p_nome_perfil: nomePerfil,
  p_linhas: linhas,
});
if (error) throw new Error(error.message);

console.log(JSON.stringify({ origem: primeiraAba, linhas: linhas.length, semValor: linhas.filter((linha) => linha.valor == null).length, resultado: data }, null, 2));

import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';

export const NFE_CANCELLATION_XSD_REFERENCE = '2026-09-08';
export const NFE_CANCELLATION_XSD_PACKAGE = 'Evento_Canc_PL_v1.01';

const XMLLINT_PATH = '/usr/bin/xmllint';
const ROOTS = Object.freeze({ evento: 'eventoCancNFe_v1.00.xsd', envEvento: 'envEventoCancNFe_v1.00.xsd', retEnvEvento: 'retEnvEventoCancNFe_v1.00.xsd', procEventoNFe: 'procEventoCancNFe_v1.00.xsd' });
const LIMIT = 1024 * 1024;
const TIMEOUT_MS = 8_000;

const issue = (code, field, message) => ({ code, field, message });

export function getNfeCancellationXsdPath(root = 'evento') {
  const filename = ROOTS[root];
  return filename ? path.join(process.cwd(), 'schemas', 'nfe', NFE_CANCELLATION_XSD_PACKAGE, filename) : '';
}

export function nfeCancellationXsdRuntimeStatus(root = 'evento') {
  const schemaPath = getNfeCancellationXsdPath(root);
  return { available: Boolean(schemaPath && existsSync(XMLLINT_PATH) && existsSync(schemaPath)), validator: 'xmllint', schemaPath, schemaPackage: NFE_CANCELLATION_XSD_PACKAGE, schemaRoot: ROOTS[root] || '' };
}

export async function validateNfeCancellationXmlAgainstXsd(xml, root = 'evento') {
  const source = typeof xml === 'string' ? xml.trim() : '';
  const runtime = nfeCancellationXsdRuntimeStatus(root);
  const base = { executed: false, valid: false, schemaPackage: runtime.schemaPackage, schemaRoot: runtime.schemaRoot, errors: [] };
  if (!ROOTS[root]) return { ...base, errors: [issue('AV-NFE-CANCEL-XSD-ROOT', 'root', 'A raiz fiscal solicitada não pertence ao pacote de cancelamento.')] };
  if (!source || Buffer.byteLength(source, 'utf8') > LIMIT || /<!DOCTYPE|<!ENTITY|<!\[CDATA\[|<!--/i.test(source)) return { ...base, errors: [issue('AV-NFE-CANCEL-XSD-XML', 'xml', 'O XML do cancelamento é vazio, excessivo ou contém construção proibida.')] };
  if (!runtime.available) return { ...base, errors: [issue('AV-NFE-CANCEL-XSD-UNAVAILABLE', 'backend', `O pacote oficial ${NFE_CANCELLATION_XSD_PACKAGE} não está disponível no servidor.`)] };
  return new Promise((resolve) => {
    const child = spawn(XMLLINT_PATH, ['--nonet', '--schema', runtime.schemaPath, '--noout', '-'], { cwd: path.dirname(runtime.schemaPath), env: { PATH: process.env.PATH || '/usr/bin:/bin' }, stdio: ['pipe', 'ignore', 'pipe'] });
    let diagnostic = '';
    let settled = false;
    const finish = (result) => { if (!settled) { settled = true; clearTimeout(timer); resolve(result); } };
    const timer = setTimeout(() => { child.kill('SIGKILL'); finish({ ...base, executed: true, errors: [issue('AV-NFE-CANCEL-XSD-TIMEOUT', 'backend', 'A validação oficial do evento excedeu o tempo limite.')] }); }, TIMEOUT_MS);
    child.stderr.on('data', (chunk) => { if (Buffer.byteLength(diagnostic, 'utf8') < 64 * 1024) diagnostic += chunk.toString('utf8'); });
    child.on('error', () => finish({ ...base, errors: [issue('AV-NFE-CANCEL-XSD-RUNTIME', 'backend', 'O validador local do evento não pôde ser iniciado.')] }));
    child.on('close', (code) => {
      if (code === 0) { finish({ ...base, executed: true, valid: true }); return; }
      const message = diagnostic.replaceAll(runtime.schemaPath, runtime.schemaRoot).replace(/^\s*-:(\d+):\s*/gm, 'Linha $1: ').replace(/\s+/g, ' ').trim();
      finish({ ...base, executed: true, errors: [issue('NFE-CANCEL-XSD', 'xml', message.slice(0, 1000) || 'O XML foi recusado pelo XSD oficial de cancelamento.')] });
    });
    child.stdin.on('error', () => {});
    child.stdin.end(source, 'utf8');
  });
}

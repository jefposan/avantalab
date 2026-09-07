import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { NFE_SP_SCHEMA_PACKAGE } from '../nfe-sp-xml.mjs';

export const NFE_XSD_PACKAGE = NFE_SP_SCHEMA_PACKAGE;
export const NFE_XSD_ROOT = 'nfe_v4.00.xsd';
export const NFE_XSD_MAX_XML_BYTES = 1024 * 1024;

const XMLLINT_PATH = '/usr/bin/xmllint';
const MAX_DIAGNOSTIC_BYTES = 64 * 1024;
const VALIDATION_TIMEOUT_MS = 8_000;

export function getNfeXsdPath() {
  return path.join(process.cwd(), 'schemas', 'nfe', NFE_XSD_PACKAGE, NFE_XSD_ROOT);
}

function validationMessage(code, field, message, details = {}) {
  return { code, field, message, ...details };
}

function normalizeDiagnosticLine(value) {
  return String(value || '')
    .replaceAll(getNfeXsdPath(), NFE_XSD_ROOT)
    .replace(/^\s*-:(\d+):\s*/, 'Linha $1: ')
    .replace(/^\s*[^\n]*\.xsd:(\d+):\s*/, `XSD ${NFE_XSD_ROOT}, linha $1: `)
    .replace(/\s*Schemas validity error\s*:\s*/i, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseSchemaErrors(stderr) {
  const unique = [...new Set(String(stderr || '')
    .split(/\r?\n/)
    .map(normalizeDiagnosticLine)
    .filter((line) => line && !/^- validates$/i.test(line) && !/fails to validate$/i.test(line)))];
  return unique.slice(0, 30).map((message, index) => {
    const lineMatch = message.match(/^Linha (\d+):/i);
    return validationMessage('NFE-XSD', 'xml', message, { line: lineMatch ? Number(lineMatch[1]) : undefined, index: index + 1 });
  });
}

function withStructuralSignatureEnvelope(xml) {
  const accessId = xml.match(/<infNFe\s+Id="([^"]+)"/)?.[1] || '';
  const signature = [
    '  <ds:Signature xmlns:ds="http://www.w3.org/2000/09/xmldsig#">',
    '    <ds:SignedInfo>',
    '      <ds:CanonicalizationMethod Algorithm="http://www.w3.org/TR/2001/REC-xml-c14n-20010315"/>',
    '      <ds:SignatureMethod Algorithm="http://www.w3.org/2000/09/xmldsig#rsa-sha1"/>',
    `      <ds:Reference URI="#${accessId}">`,
    '        <ds:Transforms>',
    '          <ds:Transform Algorithm="http://www.w3.org/2000/09/xmldsig#enveloped-signature"/>',
    '          <ds:Transform Algorithm="http://www.w3.org/TR/2001/REC-xml-c14n-20010315"/>',
    '        </ds:Transforms>',
    '        <ds:DigestMethod Algorithm="http://www.w3.org/2000/09/xmldsig#sha1"/>',
    '        <ds:DigestValue>AA==</ds:DigestValue>',
    '      </ds:Reference>',
    '    </ds:SignedInfo>',
    '    <ds:SignatureValue>AA==</ds:SignatureValue>',
    '    <ds:KeyInfo><ds:X509Data><ds:X509Certificate>AA==</ds:X509Certificate></ds:X509Data></ds:KeyInfo>',
    '  </ds:Signature>',
  ].join('\n');
  return xml.replace(/\n<\/NFe>\s*$/, `\n${signature}\n</NFe>`);
}

export function nfeXsdRuntimeStatus() {
  const schemaPath = getNfeXsdPath();
  return {
    available: existsSync(XMLLINT_PATH) && existsSync(schemaPath),
    validator: 'xmllint',
    schemaPath,
    schemaPackage: NFE_XSD_PACKAGE,
    schemaRoot: NFE_XSD_ROOT,
  };
}

export async function validateNfeXmlAgainstXsd(xml, options = {}) {
  const source = typeof xml === 'string' ? xml : '';
  const sourceBytes = Buffer.byteLength(source, 'utf8');
  const runtime = nfeXsdRuntimeStatus();

  if (!source) {
    return { executed: false, valid: false, schemaPackage: NFE_XSD_PACKAGE, schemaRoot: NFE_XSD_ROOT, errors: [validationMessage('AV-NFE-XSD-EMPTY', 'xml', 'Não há XML para validar no pacote XSD.')] };
  }
  if (sourceBytes > NFE_XSD_MAX_XML_BYTES) {
    return { executed: false, valid: false, schemaPackage: NFE_XSD_PACKAGE, schemaRoot: NFE_XSD_ROOT, errors: [validationMessage('AV-NFE-XSD-SIZE', 'xml', 'O pré-XML excede o limite local de 1 MB para validação XSD.')] };
  }
  if (!runtime.available) {
    return { executed: false, valid: false, schemaPackage: NFE_XSD_PACKAGE, schemaRoot: NFE_XSD_ROOT, errors: [validationMessage('AV-NFE-XSD-UNAVAILABLE', 'backend', `O validador local ou o pacote ${NFE_XSD_PACKAGE} não está disponível no servidor.`)] };
  }
  const signaturePresent = /<(?:\w+:)?Signature\b/.test(source);
  if (signaturePresent && options.allowSignature !== true) {
    return { executed: false, valid: false, schemaPackage: NFE_XSD_PACKAGE, schemaRoot: NFE_XSD_ROOT, errors: [validationMessage('AV-NFE-XSD-SIGNED', 'xml', 'A etapa de pré-XML aceita somente conteúdo sem assinatura real.')] };
  }
  const validationSource = signaturePresent ? source : withStructuralSignatureEnvelope(source);
  if (!signaturePresent && validationSource === source) {
    return { executed: false, valid: false, schemaPackage: NFE_XSD_PACKAGE, schemaRoot: NFE_XSD_ROOT, errors: [validationMessage('AV-NFE-XSD-ROOT', 'xml', 'O elemento raiz NFe não pôde ser preparado para a validação estrutural.')] };
  }

  return new Promise((resolve) => {
    const child = spawn(XMLLINT_PATH, ['--nonet', '--schema', runtime.schemaPath, '--noout', '-'], {
      cwd: path.dirname(runtime.schemaPath),
      env: { PATH: process.env.PATH || '/usr/bin:/bin' },
      stdio: ['pipe', 'ignore', 'pipe'],
    });
    let stderr = '';
    let settled = false;
    const finish = (result) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(result);
    };
    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      finish({ executed: true, valid: false, schemaPackage: NFE_XSD_PACKAGE, schemaRoot: NFE_XSD_ROOT, errors: [validationMessage('AV-NFE-XSD-TIMEOUT', 'backend', 'A validação XSD excedeu o limite local de oito segundos.')] });
    }, VALIDATION_TIMEOUT_MS);
    child.stderr.on('data', (chunk) => {
      if (Buffer.byteLength(stderr, 'utf8') >= MAX_DIAGNOSTIC_BYTES) return;
      stderr += chunk.toString('utf8').slice(0, MAX_DIAGNOSTIC_BYTES);
    });
    child.on('error', () => finish({ executed: false, valid: false, schemaPackage: NFE_XSD_PACKAGE, schemaRoot: NFE_XSD_ROOT, errors: [validationMessage('AV-NFE-XSD-RUNTIME', 'backend', 'O servidor não conseguiu iniciar o validador XSD local.')] }));
    child.on('close', (code) => {
      if (code === 0) {
        finish({ executed: true, valid: true, schemaPackage: NFE_XSD_PACKAGE, schemaRoot: NFE_XSD_ROOT, errors: [] });
        return;
      }
      const errors = parseSchemaErrors(stderr);
      finish({ executed: true, valid: false, schemaPackage: NFE_XSD_PACKAGE, schemaRoot: NFE_XSD_ROOT, errors: errors.length ? errors : [validationMessage('NFE-XSD', 'xml', 'O pré-XML foi recusado pelo XSD oficial, sem detalhe adicional do validador.')] });
    });
    child.stdin.on('error', () => {});
    child.stdin.end(validationSource, 'utf8');
  });
}

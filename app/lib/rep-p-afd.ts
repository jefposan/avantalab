import 'server-only';

import { createHash } from 'node:crypto';
import forge from 'node-forge';

type RegistroArp = { nsr: number; dataHora: string; gravadoEm: string; cpf: string; coletor: string; offline: boolean };

function latin1(valor: string) { return Array.from(valor).map((caractere) => caractere.charCodeAt(0) <= 255 ? caractere : ' ').join(''); }
function campo(valor: string, tamanho: number) { return latin1(valor).slice(0, tamanho).padEnd(tamanho, ' '); }
function numero(valor: number, tamanho: number) { return String(valor).padStart(tamanho, '0').slice(-tamanho); }
function dataHora(valor: string) {
  const partes = new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date(valor));
  const obter = (tipo: string) => partes.find((parte) => parte.type === tipo)?.value || '00';
  return `${obter('year')}-${obter('month')}-${obter('day')}T${obter('hour')}:${obter('minute')}:00-0300`;
}
function crcKermit(texto: string) {
  let crc = 0;
  for (const byte of Buffer.from(texto, 'latin1')) { crc ^= byte; for (let bit = 0; bit < 8; bit += 1) crc = (crc & 1) ? (crc >>> 1) ^ 0x8408 : crc >>> 1; }
  return (crc & 0xffff).toString(16).toUpperCase().padStart(4, '0');
}
function comCrc(texto: string) { return texto + crcKermit(texto); }

export function gerarAfdRepP(dados: { documentoEmpregador: string; tipoDocumento: 'cpf' | 'cnpj'; nomeEmpregador: string; registroInpi: string; documentoDesenvolvedor: string; inicio: string; fim: string; registros: RegistroArp[] }) {
  const documento = dados.documentoEmpregador.replace(/\D/g, '');
  const desenvolvedor = dados.documentoDesenvolvedor.replace(/\D/g, '');
  if (![11, 14].includes(documento.length)) throw new Error('O CPF ou CNPJ do empregador não está configurado.');
  if (![11, 14].includes(desenvolvedor.length)) throw new Error('O CPF ou CNPJ do desenvolvedor REP-P não está configurado.');
  const inpi = dados.registroInpi.replace(/\D/g, '');
  if (!inpi) throw new Error('O número de registro do REP-P no INPI não está configurado.');
  let anterior = '';
  const marcacoes = dados.registros.map((registro) => {
    const base = numero(registro.nsr, 9) + '7' + dataHora(registro.dataHora) + campo(registro.cpf.replace(/\D/g, ''), 12) + dataHora(registro.gravadoEm) + registro.coletor + (registro.offline ? '1' : '0');
    const hash = createHash('sha256').update(base + anterior, 'latin1').digest('hex').toUpperCase();
    anterior = hash;
    return { linha: base + hash, dentro: registro.dataHora >= `${dados.inicio}T00:00:00-03:00` && registro.dataHora <= `${dados.fim}T23:59:59.999-03:00` };
  }).filter((registro) => registro.dentro).map((registro) => registro.linha);
  const agora = dataHora(new Date().toISOString());
  const cabecalhoSemCrc = '000000000' + '1' + (dados.tipoDocumento === 'cnpj' ? '1' : '2') + campo(documento, 14) + campo('', 14) + campo(dados.nomeEmpregador, 150) + campo(inpi, 17) + dados.inicio + dados.fim + agora + '003' + (desenvolvedor.length === 14 ? '1' : '2') + campo(desenvolvedor, 14) + campo('', 30);
  const trailer = '999999999' + numero(0, 9).repeat(5) + numero(marcacoes.length, 9) + '9';
  return Buffer.from([comCrc(cabecalhoSemCrc), ...marcacoes, trailer, campo('ASSINATURA_DIGITAL_EM_ARQUIVO_P7S', 100)].join('\r\n') + '\r\n', 'latin1');
}

export function assinarCadesDestacado(conteudo: Buffer, pfx: Buffer, senha: string) {
  const pacote = forge.pkcs12.pkcs12FromAsn1(forge.asn1.fromDer(forge.util.createBuffer(pfx.toString('binary'))), false, senha);
  const chave = pacote.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag })[forge.pki.oids.pkcs8ShroudedKeyBag]?.find((bolsa) => bolsa.key)?.key
    || pacote.getBags({ bagType: forge.pki.oids.keyBag })[forge.pki.oids.keyBag]?.find((bolsa) => bolsa.key)?.key;
  const certificados = pacote.getBags({ bagType: forge.pki.oids.certBag })[forge.pki.oids.certBag]?.flatMap((bolsa) => bolsa.cert ? [bolsa.cert] : []) || [];
  if (!chave || !certificados.length) throw new Error('Não foi possível ler a chave privada do certificado A1.');
  const assinatura = forge.pkcs7.createSignedData();
  assinatura.content = forge.util.createBuffer(conteudo.toString('binary'));
  certificados.forEach((certificado) => assinatura.addCertificate(certificado));
  assinatura.addSigner({ key: chave, certificate: certificados[0], digestAlgorithm: forge.pki.oids.sha256, authenticatedAttributes: [{ type: forge.pki.oids.contentType, value: forge.pki.oids.data }, { type: forge.pki.oids.messageDigest }, { type: forge.pki.oids.signingTime }] });
  assinatura.sign({ detached: true });
  return Buffer.from(forge.asn1.toDer(assinatura.toAsn1()).getBytes(), 'binary');
}

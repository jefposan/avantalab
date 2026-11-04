import { SaxesParser } from 'saxes';
const namespace = 'http://www.portalfiscal.inf.br/nfe';
/** Validação estrutural. Autenticidade, tributação e vínculo final são validados pelo ML/SEFAZ. */
export function inspectNfeXml(xml: unknown) {
  if (typeof xml !== 'string' || Buffer.byteLength(xml, 'utf8') > 2 * 1024 * 1024 || !xml.trim()) throw new Error('Selecione um XML de NF-e de até 2 MB.');
  const parser = new SaxesParser({ xmlns: true });
  const path: string[] = [], fields = new Map<string, string>();
  let id = '', invoices = 0, protocols = 0, signature = false;
  parser.on('doctype', () => { throw new Error('DTD não permitido'); });
  parser.on('processinginstruction', () => { throw new Error('Instrução externa não permitida'); });
  parser.on('opentag', tag => {
    path.push(tag.local);
    if (path.length > 40) throw new Error('XML muito profundo');
    if (tag.local === 'Signature' && tag.uri === 'http://www.w3.org/2000/09/xmldsig#' && path.join('/') === 'nfeProc/NFe/Signature') signature = true;
    if (path.length === 1 && (tag.local !== 'nfeProc' || tag.uri !== namespace)) throw new Error('XML não é nfeProc');
    if (path.slice(0, 3).join('/') === 'nfeProc/NFe/infNFe' || path.slice(0, 3).join('/') === 'nfeProc/protNFe/infProt') {
      if (tag.uri !== namespace) throw new Error('Namespace fiscal inválido');
    }
    if (path.join('/') === 'nfeProc/NFe/infNFe') { invoices++; id = tag.attributes.Id?.value || ''; }
    if (path.join('/') === 'nfeProc/protNFe/infProt') protocols++;
  });
  parser.on('text', value => {
    const key = path.join('/');
    fields.set(key, (fields.get(key) || '') + value);
  });
  parser.on('closetag', () => { path.pop(); });
  try { parser.write(xml).close(); } catch { throw new Error('XML inválido. Envie a NF-e autorizada original, sem DTD ou entidades externas.'); }
  const read = (key: string) => fields.get(key)?.trim() || '';
  const invoice = 'nfeProc/NFe/infNFe', protocol = 'nfeProc/protNFe/infProt';
  if (invoices !== 1 || protocols !== 1 || !signature || read(`${invoice}/ide/mod`) !== '55'
    || read(`${invoice}/ide/tpAmb`) !== '1' || read(`${protocol}/tpAmb`) !== '1' || !['100', '150'].includes(read(`${protocol}/cStat`))) throw new Error('Use uma NF-e individual, modelo 55, autorizada em produção. NFC-e, lote e homologação não são aceitos.');
  const key = read(`${protocol}/chNFe`), issuer = read(`${invoice}/emit/CNPJ`);
  if (!/^\d{44}$/.test(key) || id !== `NFe${key}` || !/^\d{14}$/.test(issuer)) throw new Error('A chave ou o emitente do XML não confere com o protocolo.');
  return { key, issuer };
}

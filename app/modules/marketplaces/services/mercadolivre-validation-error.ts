import { WARRANTY_TIME_HELP } from './catalog-publication.ts';
/** Extrai somente o diagnóstico de validação; nunca devolve o corpo/headers do provedor. */
const record = (value: unknown): Record<string, unknown> => value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
const names: Record<string, string> = {
  title: 'title', family_name: 'title', price: 'price', available_quantity: 'stock', plain_text: 'description', description: 'description',
  category_id: 'categoryId', listing_type_id: 'listingType', condition: 'condition', item_condition: 'condition', shipping: 'shippingMode',
  sale_terms: 'warrantyType', warranty_type: 'warrantyType', warranty_time: 'warrantyTime', pictures: 'pictureUrl', catalog_product_id: 'productId',
  attributes: 'attributes', attribute: 'attributes', gtin: 'ean', ean: 'ean', product_identifier: 'ean',
};
const special: Record<string, string> = { GTIN: 'ean', EAN: 'ean', ITEM_CONDITION: 'condition', WARRANTY_TYPE: 'warrantyType', WARRANTY_TIME: 'warrantyTime' };
export const validationFieldLabels: Record<string, string> = { title: 'Título', price: 'Preço de venda', stock: 'Saldo online disponível', description: 'Descrição', categoryId: 'Categoria', listingType: 'Tipo de anúncio', shippingMode: 'Forma de envio', condition: 'Condição', warrantyType: 'Garantia', warrantyTime: 'Prazo da garantia', pictureUrl: 'Imagem', productId: 'Produto', attributes: 'Características', ean: 'EAN / GTIN' };
const attributeLabels: Record<string, string> = { BRAND: 'Marca', MODEL: 'Modelo', VOLTAGE: 'Voltagem', COLOR: 'Cor', EMPTY_GTIN_REASON: 'Motivo da ausência de EAN', SELLER_PACKAGE_HEIGHT: 'Altura da embalagem', SELLER_PACKAGE_WIDTH: 'Largura da embalagem', SELLER_PACKAGE_LENGTH: 'Comprimento da embalagem', SELLER_PACKAGE_WEIGHT: 'Peso da embalagem' };
const fieldLabel = (field: string) => validationFieldLabels[field] || attributeLabels[field.slice(10)] || `Característica ${field.slice(10)}`;
const safeCode = (value: unknown): string => typeof value === 'string' && /^[a-z][a-z0-9_.-]{0,119}$/i.test(value) && !/app_usr|^test-|token|secret|password|^eyJ/i.test(value) ? value : '';

/** Só o pré-validador: warnings documentados não impedem POST /items.
 * Nunca inferir sucesso de criação/edição nem liberar resposta vazia ou ambígua. */
export function isWarningOnlyPrevalidation(input: unknown, status: number, path: string, method: string) {
  if (path !== '/items/validate' || method !== 'POST' || status !== 400) return false;
  const problem = record(input);
  if (problem.error !== 'validation_error' || (problem.status != null && problem.status !== 400)) return false;
  if (!Array.isArray(problem.cause) || !problem.cause.length || problem.cause.length > 1000) return false;
  return problem.cause.every(value => {
    const cause = record(value);
    return cause.type === 'warning' && !!safeCode(cause.code) && typeof cause.message === 'string' && !!cause.message.trim();
  });
}

function safeDiagnostic(value: unknown): string {
  if (typeof value !== 'string') return '';
  // O diagnóstico é texto não confiável, não HTML. Dados de autenticação, URLs,
  // e-mails e identificadores pessoais não são necessários para orientar o campo.
  return value.slice(0, 4000)
    .replace(/(?:authorization|bearer|access[_ -]?token|refresh[_ -]?token|client[_ -]?secret|password|token_sealed|api[_ -]?key)\b[^\n]*/gi, '[dado protegido]')
    .replace(/\b(?:APP_USR|TEST)-[\w-]+/g, '[dado protegido]')
    .replace(/\beyJ[\w-]+\.[\w-]+\.[\w-]+/g, '[dado protegido]')
    .replace(/https?:\/\/[^\s<>"']+/gi, '[URL omitida]')
    .replace(/\b[\w.+-]+@[\w.-]+\.[a-z]{2,}\b/gi, '[e-mail omitido]')
    .replace(/[<>\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 600);
}

function fieldsFor(cause: Record<string, unknown>, submitted: Record<string, unknown>): string[] {
  const references = Array.isArray(cause.references) ? cause.references.filter((ref): ref is string => typeof ref === 'string').slice(0, 20) : [];
  const context = [...references, typeof cause.code === 'string' ? cause.code : ''].join(' ');
  // Capturar IDs antes de remover os colchetes: sale_terms[WARRANTY_TIME],
  // attributes[BRAND] e mensagens como "attributes [BRAND, MODEL] are required".
  const message = typeof cause.message === 'string' ? cause.message.slice(0, 4000) : '';
  // required_fields pode citar a propriedade apenas na mensagem, sem references.
  if (/^body\.(?:required_fields|invalid_field_types)$/.test(String(cause.code || ''))) {
    const properties = [...message.matchAll(/(?:properties|fields|property)\s*\[([a-z0-9_, .]{1,200})\]/gi)].flatMap(match => match[1].toLowerCase().split(/[, .]+/));
    const mapped = properties.flatMap(property => Object.hasOwn(names, property) ? [names[property]] : []);
    if (mapped.length) return [...new Set(mapped)];
  }
  const indexed = references.flatMap(reference => {
    const match = reference.match(/(?:^|\.)(attributes|sale_terms)\[(\d{1,3})\]/i);
    if (!match) return [];
    const values = submitted[match[1].toLowerCase()];
    const id = Array.isArray(values) ? record(values[Number(match[2])]).id : null;
    return typeof id === 'string' && /^[A-Z][A-Z0-9_]{1,79}$/.test(id) ? [special[id] || `attribute:${id}`] : [];
  });
  if (indexed.length) return [...new Set(indexed)];
  const explicit = Object.keys(special).filter(id => new RegExp(`\\b${id}\\b`, 'i').test(`${context} ${message}`));
  if (explicit.length) return [...new Set(explicit.map(id => special[id]))];
  const groups = [...context.matchAll(/\[([A-Z][A-Z0-9_, ]{0,159})\]/g), ...message.matchAll(/(?:attributes?|atributos?|sale_terms)\s*\[([A-Z][A-Z0-9_, ]{0,159})\]/gi)];
  const ids = groups.flatMap(match => match[1].split(/[, ]+/)).filter(id => /^[A-Z][A-Z0-9_]{1,79}$/.test(id));
  const attributeContext = /attribute|sale_terms|warranty|gtin|ean/i.test(context);
  if (attributeContext && ids.length) return [...new Set(ids.map(id => special[id] || `attribute:${id}`))];
  const specific = [...context.toLowerCase().matchAll(/[a-z_]+/g)].flatMap(match => Object.hasOwn(names, match[0]) ? [names[match[0]]] : []);
  // Uma referência mais específica tem precedência sobre attributes/sale_terms.
  const fields = specific.filter(field => !['attributes', 'warrantyType'].includes(field));
  return [...new Set(fields.length ? fields : specific)];
}

function clearReason(code: string, reason: string, targets: string[]) {
  if (targets.includes('warrantyTime') && /sale_term|warranty|unit|duration/i.test(`${code} ${reason}`)) {
    return /invalid_value|unit|format/i.test(`${code} ${reason}`) ? WARRANTY_TIME_HELP : 'Revise o prazo da garantia informado. Ele não foi aceito pelo Mercado Livre para este produto.';
  }
  if (code === 'body.required_fields' && /\bfamily_name\b/.test(reason)) return 'O Mercado Livre exige o nome do produto no formato desta conta. Prepare o anúncio novamente; se continuar, informe o aviso ao suporte do AvantaLab.';
  if (code === 'body.required_fields') return 'Preencha os campos indicados antes de continuar.';
  if (code === 'body.invalid_field_types') return 'O formato do campo não foi aceito. Revise o valor informado.';
  if (code === 'item.price.invalid') {
    const token = reason.match(/minimum price (?:of |is )?([0-9][0-9.,]*)(?:\s|$)/i)?.[1].replace(/\.$/, '');
    if (token && /^\d+(?:\.\d{1,2})?$/.test(token) && Number.isFinite(Number(token))) return `O preço está abaixo do mínimo permitido para esta categoria: ${Number(token).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}. Ajuste o preço de venda.`;
    return 'O preço informado não foi aceito para esta categoria. Confira os limites de preço e ajuste o valor.';
  }
  if (code === 'item.category_id.invalid') return 'A categoria não foi aceita para esta publicação. Escolha uma categoria disponível e valide novamente.';
  if (code === 'item.listing_type_id.requiresPictures') return 'Este tipo de anúncio exige foto. Adicione uma imagem do produto.';
  if (code === 'item.pictures.max') return 'O anúncio tem mais fotos do que esta categoria permite. Reduza a quantidade de imagens.';
  if (code === 'item.pictures.invalid_size') return 'A foto não tem o tamanho exigido pelo Mercado Livre. Use uma imagem com pelo menos 500 pixels em um dos lados.';
  if (/^item\.listing_type_id\./.test(code)) return 'O tipo de anúncio não está disponível nesta conta ou categoria. Selecione uma das opções permitidas.';
  if (/^item\.available_quantity\./.test(code)) return 'A quantidade informada não foi aceita. Confira o saldo real do estoque Online e prepare o anúncio novamente.';
  if (/^item\.condition\./.test(code)) return 'A condição do produto não foi aceita nesta categoria. Selecione uma das condições disponíveis.';
  if (/^item\.pictures\./.test(code)) return 'A foto não foi aceita. Confira se a imagem do produto está acessível e atende às regras da categoria.';
  if (/^item\.attribute\.(?:product_identifier\.|invalid_product_identifier)/.test(code)) return /by_domain_catalog|invalid_product_identifier/.test(code)
    ? 'O EAN não corresponde à marca ou categoria desta publicação. Confira o código da embalagem e a ficha do produto.'
    : 'O EAN não foi aceito. Confira o código da embalagem, sem letras ou símbolos.';
  if (/^item\.attributes?\.(?:missing|invalid_length)/.test(code)) return /invalid_length/.test(code) ? 'O texto desta característica ultrapassa o limite permitido. Reduza o valor e valide novamente.' : 'Esta característica é obrigatória para a categoria. Preencha o valor indicado.';
  if (targets.some(field => field.startsWith('attribute:'))) return 'O valor desta característica não foi aceito. Confira as opções permitidas para a categoria.';
  if (targets.includes('shippingMode') && /me2.*mandatory|ME2 adoption is mandatory/i.test(`${code} ${reason}`)) return 'Esta conta exige Mercado Envios. Selecione essa forma de envio.';
  // Sem regra reconhecida, indicar o campo confirmado sem inventar a causa.
  if (targets.length) return 'O Mercado Livre não aceitou os dados deste campo. Revise o valor; se a dúvida continuar, abra os detalhes técnicos ou informe o aviso ao suporte.';
  return 'O Mercado Livre retornou uma exigência que ainda não conseguimos explicar automaticamente. Abra os detalhes técnicos e informe o aviso ao suporte.';
}

export function mercadoLivreValidationError(input: unknown, status: number, body?: unknown) {
  const problem = record(input);
  const causes = (Array.isArray(problem.cause) ? problem.cause : []).slice(0, 30).map(record);
  const fields: Record<string, string> = {};
  const reasons: string[] = [];
  const technical: string[] = [];
  for (const cause of causes) {
    const code = safeCode(cause.code);
    const reason = safeDiagnostic(cause.message);
    if (!code && !reason) continue;
    const warning = String(cause.type || '').toLowerCase() === 'warning';
    const detail = `${warning ? 'Advertência (não bloqueante): ' : ''}${reason || 'A plataforma não detalhou esta validação.'}${code ? ` (código: ${code})` : ''}`;
    const targets = fieldsFor(cause, record(body));
    technical.push(detail);
    if (warning) continue;
    const explanation = clearReason(code, reason, targets);
    reasons.push(`${targets.length ? targets.map(fieldLabel).join(' / ') + ': ' : ''}${explanation}`);
    for (const field of targets) {
      const text = `${fieldLabel(field)}: ${explanation}`;
      if (!fields[field]?.split('\n').includes(text)) fields[field] = fields[field] ? `${fields[field]}\n${text}` : text;
    }
  }
  if (!reasons.length) {
    const detail = safeDiagnostic(problem.message);
    const code = safeCode(problem.error);
    technical.push(`${detail || 'Sem detalhe retornado.'}${code ? ` (código: ${code})` : ''}`);
    reasons.push(technical.some(detail => detail.startsWith('Advertência (não bloqueante): '))
      ? 'O Mercado Livre recusou a operação, mas retornou somente advertências, sem identificar o erro que impediu a conclusão. Abra os detalhes técnicos e informe o aviso ao suporte; não altere campos por tentativa.'
      : 'O Mercado Livre não informou qual dado precisa ser corrigido. Abra os detalhes técnicos ou informe o aviso ao suporte; não altere o produto por suposição.');
  }
  return { message: `Não foi possível concluir a operação no Mercado Livre.\n${[...new Set(reasons)].join('\n')}`, fields, details: `Resposta do Mercado Livre — HTTP ${status}\n${[...new Set(technical)].join('\n')}` };
}

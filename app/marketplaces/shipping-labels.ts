// Nomes baseados na documentação oficial do Mercado Livre:
// https://developers.mercadolivre.com.br/pt_br/envio-personalizado/mercado-envios
// https://developers.mercadolivre.com.br/pt_br/api-docs-pt-br/mercado-envios-2
// https://developers.mercadolivre.com.br/pt_br/produto-autenticacao-autorizacao/importar-nota-fiscal
// Apenas apresentação: os códigos originais permanecem no snapshot da API.
const modes: Record<string, string> = {
  me2: 'Mercado Envios',
  me1: 'Mercado Envios 1',
  custom: 'Envio personalizado pelo vendedor',
  not_specified: 'Entrega a combinar com o vendedor',
};
const logistics: Record<string, string> = {
  drop_off: 'Postagem pelo vendedor',
  xd_drop_off: 'Postagem em agência Mercado Livre',
  cross_docking: 'Coleta no endereço do vendedor',
  xd_same_day: 'Coleta rápida',
  self_service: 'Flex — entrega pelo vendedor',
  fulfillment: 'Full — armazenagem e envio pelo Mercado Livre',
  default: 'Logística padrão',
  custom: 'Entrega organizada pelo vendedor',
};
const code = (value: unknown) => typeof value === 'string' ? value.trim().toLowerCase() : '';
const label = (labels: Record<string, string>, value: string) => Object.hasOwn(labels, value) ? labels[value] : undefined;

export function shippingLabels(shipping: { mode?: string | null; logisticType?: string | null; free?: boolean | null }) {
  const mode = code(shipping.mode);
  const logistic = code(shipping.logisticType);
  const freight = shipping.free === true ? 'Frete grátis para o comprador' : shipping.free === false ? 'Sem frete grátis' : 'Frete não informado';
  const modeLabel = label(modes, mode);
  const noLogistic = !logistic || logistic === 'not_specified';
  let method: string;
  if (mode === 'not_specified' && (noLogistic || logistic === 'default')) {
    method = modes.not_specified;
  } else if (mode === 'custom' && (noLogistic || logistic === 'custom' || logistic === 'default')) {
    method = modes.custom;
  } else if (!mode && noLogistic) {
    method = 'Forma de envio não informada';
  } else {
    const detail = mode === 'me1' && logistic === 'default' ? 'Logística do vendedor' : label(logistics, logistic);
    method = [modeLabel || (mode ? 'Modalidade de envio não identificada' : 'Modalidade de envio não informada'),
      detail || (noLogistic ? 'Forma de entrega não informada' : 'Forma de entrega não identificada')].join(' · ');
  }
  return { freight, method };
}

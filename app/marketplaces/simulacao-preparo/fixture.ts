import type { CatalogPreparation, PublicationForm } from '../../modules/marketplaces/services/catalog-publication';
import type { marketplaceClientRequest } from '../Anunciados';

export type SimulationScenario = 'success' | 'rejected' | 'uncertain';
export const SIMULATION_COMPANY = 'simulacao-empresa';
export const SIMULATION_ACCOUNT = 'simulacao-conta';

export function preparationFixture(): { result: CatalogPreparation; form: PublicationForm; sourceTitle: string } {
  const name = 'Ventilador Avanta Teste 40 cm — produto fictício';
  return {
    sourceTitle: name,
    result: {
      status: 'found', ean: '7891129598607', categoryId: 'MLB1234',
      product: { id: 'SIMULACAO-PRODUTO', source: 'mercadolivre_catalog', name, domainId: 'SIMULACAO', picture: '/images/simulacao-ventilador.svg', pictures: [],
        attributes: [{ id: 'BRAND', name: 'Marca', value: 'Avanta Teste (fictícia)' }, { id: 'MODEL', name: 'Modelo', value: 'Demo 40' }],
        description: 'Produto fictício para testar o preparo do anúncio. Ventilador de mesa, 40 cm, três velocidades. Nenhum anúncio será enviado ao marketplace.' },
      categories: [{ id: 'MLB1234', name: 'Ventiladores · categoria de teste' }],
      listingTypes: [{ id: 'gold_special', name: 'Clássico' }, { id: 'gold_pro', name: 'Premium' }],
      shippingModes: [{ id: 'me2', name: 'Mercado Envios' }, { id: 'custom', name: 'Envio a combinar' }],
      conditions: [{ id: 'new', name: 'Novo' }, { id: 'used', name: 'Usado' }],
      requiredAttributes: [{ id: 'VOLTAGE', name: 'Voltagem', values: [{ id: '127', name: '127 V' }, { id: '220', name: '220 V' }] }],
      optionalAttributes:[{id:'LINE',name:'Linha',values:[{id:'A',name:'Linha A'},{id:'B',name:'Linha B'}]},{id:'CAPACITY',name:'Capacidade',values:[],units:['L'],maxLength:30}],
      notice: 'Ficha fictícia. As buscas e revalidações desta página sempre retornam este exemplo; não consultam o Mercado Livre.',
    },
    form: { ean: '7891129598607', productId: 'SIMULACAO-PRODUTO', categoryId: 'MLB1234', price: 198.90, stock: 5,
      listingType: 'gold_special', shippingMode: 'me2', condition: 'new', warrantyType: 'factory', warrantyTime: '12 meses',
      attributes: { VOLTAGE: '127' }, description: 'Produto fictício para testes de interface. Nenhum envio real será realizado.' },
  };
}

/** Adaptador fechado: não importa fetch, sessão, banco ou cliente real em runtime. */
export function createSimulationRequest(scenario: SimulationScenario): typeof marketplaceClientRequest {
  const completed = new Map<string, object>();
  return async (path, body, signal, method) => {
    if (process.env.NODE_ENV === 'production') throw new Error('Simulação indisponível em produção.');
    signal?.throwIfAborted();
    const input = body as { empresaId?: string; connectionId?: string; targetConnectionId?: string; requestKey?: string; form?: PublicationForm } | undefined;
    if (input?.empresaId !== SIMULATION_COMPANY || (input?.connectionId || input?.targetConnectionId) !== SIMULATION_ACCOUNT || (method && method !== 'POST')) {
      throw new Error('Simulação bloqueada: somente a empresa e a conta fictícias são permitidas.');
    }
    if (!['preparar', 'produtos/preparar', 'preparar-copia', 'publicar/frete', 'publicar'].includes(path)) {
      throw new Error('Operação não prevista na simulação. Nenhuma chamada real foi feita.');
    }
    await new Promise(resolve => setTimeout(resolve, 350));
    signal?.throwIfAborted();
    if (['preparar', 'produtos/preparar', 'preparar-copia'].includes(path)) return preparationFixture();
    if (path === 'publicar/frete') return { quote: {
      policy: 'optional', freeShipping: input.form?.freeShipping === true,
      sellerCost: input.form?.freeShipping ? 24.90 : 0, dimensionsSource: 'category',
      notice: 'Estimativa fictícia para teste; não representa preço ou regra do Mercado Livre.',
      checkedAt: new Date().toISOString(), expiresAt: new Date(Date.now() + 15 * 60_000).toISOString(), token: 'simulacao-frete-sem-validade-real',
    } };
    if (!input.requestKey) throw new Error('A simulação precisa de uma chave de tentativa.');
    if (scenario === 'rejected') throw Object.assign(new Error('Recusa simulada: revise o prazo da garantia. Seus dados foram mantidos.'), {
      code: 'invalid_fields', fields: { warrantyTime: 'Erro fictício da garantia para testar destaque e foco no campo.' },
    });
    if (scenario === 'uncertain') throw Object.assign(new Error('Resposta incerta simulada. Seus dados e a chave da tentativa foram mantidos. Nenhum anúncio real foi enviado.'), { code: 'publication_uncertain' });
    if (!completed.has(input.requestKey)) completed.set(input.requestKey, {
      status: 'published', listing: { id: 'MLB9999999999999', title: preparationFixture().sourceTitle }, localProductId: 'simulacao-produto',
    });
    return completed.get(input.requestKey);
  };
}

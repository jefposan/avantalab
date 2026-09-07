import type { PerfilModulo } from '@/app/lib/modulos-registro';
import {
  GRUPOS_PERMISSOES_VENDAS,
  PERMISSOES_VENDAS_POR_PERFIL,
  PERMISSOES_VENDAS_PROTEGIDAS,
} from './permissions';

export const VENDAS_MODULE_ID = 'vendas';

export const MANIFESTO_VENDAS = {
  id: VENDAS_MODULE_ID,
  nome: 'Vendas e Serviços',
  descricao: 'Operação comercial integrada a clientes, custos, estoque, recebimentos e emissão fiscal.',
  versaoContrato: 1,
  superficies: ['web'] as const,
  navegacao: {
    modo: 'pagina_total' as const,
    rotuloMenu: 'Vendas e serviços',
    rota: '/vendas',
    retorno: '/gestao',
  },
  dependencias: ['custos'],
  permissoes: {
    grupos: GRUPOS_PERMISSOES_VENDAS,
    protegidas: PERMISSOES_VENDAS_PROTEGIDAS,
    padroes: PERMISSOES_VENDAS_POR_PERFIL satisfies Readonly<Record<PerfilModulo, readonly string[]>>,
  },
  integracoes: {
    catalogo: 'custos',
    financeiro: 'gestao',
    fiscal: 'backend_exclusivo',
  },
  estado: 'piloto_tridium_instalavel' as const,
} as const;

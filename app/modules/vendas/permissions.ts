import type { PerfilModulo } from '@/app/lib/modulos-registro';

export type DecisaoPermissaoModulo = 'allow' | 'deny' | 'inherit';

export type GrupoPermissoesVendas = {
  id: string;
  nome: string;
  descricao: string;
  permissoes: readonly {
    codigo: string;
    nome: string;
  }[];
};

export const GRUPOS_PERMISSOES_VENDAS: readonly GrupoPermissoesVendas[] = [
  {
    id: 'painel',
    nome: 'Visão geral',
    descricao: 'Indicadores e alertas comerciais.',
    permissoes: [{ codigo: 'dashboard.view', nome: 'Visualizar painel' }],
  },
  {
    id: 'vendas',
    nome: 'Vendas',
    descricao: 'Orçamentos, pedidos e vendas.',
    permissoes: [
      { codigo: 'sales.view', nome: 'Visualizar' },
      { codigo: 'sales.create', nome: 'Criar' },
      { codigo: 'sales.edit', nome: 'Editar' },
      { codigo: 'sales.invoice', nome: 'Faturar' },
      { codigo: 'sales.approve_discount', nome: 'Aprovar desconto' },
      { codigo: 'sales.cancel', nome: 'Cancelar' },
      { codigo: 'sales.share', nome: 'Compartilhar e imprimir' },
    ],
  },
  {
    id: 'servicos',
    nome: 'Serviços',
    descricao: 'Orçamentos e ordens de serviço.',
    permissoes: [
      { codigo: 'services.view', nome: 'Visualizar' },
      { codigo: 'services.create', nome: 'Criar' },
      { codigo: 'services.edit', nome: 'Editar' },
      { codigo: 'services.complete', nome: 'Concluir execução' },
    ],
  },
  {
    id: 'clientes',
    nome: 'Clientes',
    descricao: 'Cadastro e histórico comercial.',
    permissoes: [
      { codigo: 'clients.view', nome: 'Visualizar' },
      { codigo: 'clients.create', nome: 'Criar' },
      { codigo: 'clients.edit', nome: 'Editar' },
      { codigo: 'clients.reports', nome: 'Consultar relatórios' },
    ],
  },
  {
    id: 'catalogo',
    nome: 'Produtos e serviços',
    descricao: 'Consulta ao catálogo mantido em Custos e Precificação.',
    permissoes: [
      { codigo: 'catalog.view', nome: 'Visualizar' },
      { codigo: 'catalog.create', nome: 'Criar' },
      { codigo: 'catalog.edit', nome: 'Editar' },
      { codigo: 'catalog.view_cost', nome: 'Visualizar custos' },
    ],
  },
  {
    id: 'estoque',
    nome: 'Estoque',
    descricao: 'Saldos e movimentações.',
    permissoes: [
      { codigo: 'stock.view', nome: 'Visualizar' },
      { codigo: 'stock.entry', nome: 'Registrar entrada' },
      { codigo: 'stock.exit', nome: 'Registrar saída' },
      { codigo: 'stock.inventory', nome: 'Realizar inventário' },
      { codigo: 'stock.adjust', nome: 'Autorizar ajustes' },
    ],
  },
  {
    id: 'fiscal',
    nome: 'Fiscal',
    descricao: 'Preparação, emissão e documentos fiscais.',
    permissoes: [
      { codigo: 'fiscal.view', nome: 'Visualizar' },
      { codigo: 'fiscal.prepare', nome: 'Preparar documento' },
      { codigo: 'fiscal.configure', nome: 'Configurar regras fiscais' },
      { codigo: 'fiscal.homologate', nome: 'Gerenciar homologação' },
      { codigo: 'fiscal.issue', nome: 'Emitir nota' },
      { codigo: 'fiscal.cancel', nome: 'Cancelar nota' },
      { codigo: 'fiscal.documents.xml.download', nome: 'Baixar XML autorizado' },
      { codigo: 'fiscal.documents.danfe.download', nome: 'Baixar DANFE' },
    ],
  },
  {
    id: 'recebimentos',
    nome: 'Recebimentos',
    descricao: 'Parcelas e movimentações financeiras.',
    permissoes: [
      { codigo: 'receivables.view', nome: 'Visualizar' },
      { codigo: 'receivables.receive', nome: 'Registrar recebimento' },
      { codigo: 'receivables.refund', nome: 'Estornar recebimento' },
      { codigo: 'receivables.export', nome: 'Exportar' },
    ],
  },
  {
    id: 'relatorios',
    nome: 'Relatórios',
    descricao: 'Indicadores e exportações.',
    permissoes: [
      { codigo: 'reports.view', nome: 'Visualizar' },
      { codigo: 'reports.export', nome: 'Exportar' },
      { codigo: 'reports.view_financial', nome: 'Visualizar valores financeiros' },
    ],
  },
  {
    id: 'sistema',
    nome: 'Sistema e acessos',
    descricao: 'Configurações, permissões e auditoria.',
    permissoes: [
      { codigo: 'settings.view', nome: 'Visualizar configurações' },
      { codigo: 'settings.edit', nome: 'Editar configurações' },
      { codigo: 'access.view', nome: 'Visualizar acessos' },
      { codigo: 'access.manage', nome: 'Gerenciar acessos' },
      { codigo: 'access.audit', nome: 'Consultar auditoria' },
    ],
  },
] as const;

export const CODIGOS_PERMISSOES_VENDAS = GRUPOS_PERMISSOES_VENDAS.flatMap((grupo) =>
  grupo.permissoes.map((permissao) => permissao.codigo)
);

export const PERMISSOES_VENDAS_PROTEGIDAS = [
  'settings.view',
  'access.view',
  'access.manage',
  'access.audit',
  'fiscal.configure',
  'fiscal.homologate',
] as const;

const todas = [...CODIGOS_PERMISSOES_VENDAS];
const operadorCompleto = todas.filter((codigo) => ![
  'settings.edit',
  'access.view',
  'access.manage',
  'access.audit',
  'fiscal.configure',
  'fiscal.homologate',
  'fiscal.cancel',
  'fiscal.documents.xml.download',
  'receivables.refund',
  'catalog.view_cost',
].includes(codigo));
const operadorSimples = [
  'dashboard.view',
  'sales.view',
  'sales.create',
  'sales.share',
  'services.view',
  'services.create',
  'clients.view',
  'clients.create',
  'catalog.view',
  'stock.view',
];

export const PERMISSOES_VENDAS_POR_PERFIL: Readonly<Record<PerfilModulo, readonly string[]>> = {
  gestor_master: todas,
  administrador: todas,
  operador_completo: operadorCompleto,
  operador_simples: operadorSimples,
};

export function permissaoVendasConhecida(codigo: string) {
  return CODIGOS_PERMISSOES_VENDAS.includes(codigo);
}

export function permissaoVendasProtegida(codigo: string) {
  return PERMISSOES_VENDAS_PROTEGIDAS.includes(codigo as (typeof PERMISSOES_VENDAS_PROTEGIDAS)[number]);
}

export function resolverPermissoesVendas(
  perfil: PerfilModulo,
  excecoesPerfil: Readonly<Record<string, DecisaoPermissaoModulo>> = {},
  excecoesUsuario: Readonly<Record<string, DecisaoPermissaoModulo>> = {},
) {
  const padrao = new Set(PERMISSOES_VENDAS_POR_PERFIL[perfil]);
  return Object.fromEntries(CODIGOS_PERMISSOES_VENDAS.map((codigo) => {
    const decisaoPerfil = excecoesPerfil[codigo];
    const decisaoUsuario = excecoesUsuario[codigo];
    const herdada = decisaoPerfil === 'allow'
      ? true
      : decisaoPerfil === 'deny'
        ? false
        : padrao.has(codigo);
    const permitida = decisaoUsuario === 'allow'
      ? true
      : decisaoUsuario === 'deny'
        ? false
        : herdada;
    return [codigo, permitida];
  }));
}

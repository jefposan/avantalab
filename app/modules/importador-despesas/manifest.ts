export const importadorDespesasManifest = {
  id: 'importador-despesas',
  nome: 'Importador de despesas',
  versao: '0.3.0',
  publico: ['gestao-web'],
  permissoes: ['despesas.criar', 'despesas.importar'],
  rotas: ['/importador-despesas'],
  suporte: { web: true, mobile: false },
  integracaoFinanceira: true,
  ava: {
    permiteOrientar: true,
    dadosNoContexto: ['status da importação', 'quantidade de pendências', 'total selecionado'],
    dadosRestritos: ['arquivo original', 'linhas do extrato', 'dados bancários'],
  },
} as const;

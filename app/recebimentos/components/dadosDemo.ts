// Dados locais de demonstração — apenas para o estudo isolado.
// Nenhuma persistência: tudo vive no estado React em RecebimentosClient.
import type { Colaborador, Empresa, Recebimento, Subempresa } from './types';

export const COR_PRIMARIA = '#003E73';

// Empresa operadora à qual o colaborador está vinculado (aparece no topo do app).
export const EMPRESA_OPERADORA = 'LimpQuality';

export const empresasDemo: Empresa[] = [
  { id: 'e1', tipoCadastro: 'local_agrupador', nome: 'Shopping Morumbi', endereco: 'Av. Roque Petroni Jr, 1089 · São Paulo/SP', cep: '04707-900', logradouro: 'Av. Roque Petroni Jr', bairro: 'Jardim das Acácias', cidade: 'São Paulo', estado: 'SP', numero: '1089', complemento: '', responsavel: '', telefone: '', email: '', valorCombinado: null, frequenciaRecebimento: null, configuracaoRecorrencia: null, ativo: true },
  { id: 'e2', tipoCadastro: 'local_agrupador', nome: 'Shopping Eldorado', endereco: 'Av. Rebouças, 3970 · São Paulo/SP', cep: '05402-600', logradouro: 'Av. Rebouças', bairro: 'Pinheiros', cidade: 'São Paulo', estado: 'SP', numero: '3970', complemento: '', responsavel: '', telefone: '', email: '', valorCombinado: null, frequenciaRecebimento: null, configuracaoRecorrencia: null, ativo: true },
  { id: 'e3', tipoCadastro: 'local_agrupador', nome: 'Galeria Central', endereco: 'Rua 24 de Maio, 250 · São Paulo/SP', cep: '01041-000', logradouro: 'Rua 24 de Maio', bairro: 'República', cidade: 'São Paulo', estado: 'SP', numero: '250', complemento: '', responsavel: '', telefone: '', email: '', valorCombinado: null, frequenciaRecebimento: null, configuracaoRecorrencia: null, ativo: true },
  { id: 'e4', tipoCadastro: 'cliente_direto', nome: 'Clínica Horizonte', endereco: 'Rua das Flores, 310 · São Paulo/SP', cep: '01430-001', logradouro: 'Rua das Flores', bairro: 'Jardins', cidade: 'São Paulo', estado: 'SP', numero: '310', complemento: 'Conjunto 42', responsavel: 'Fernanda Alves', telefone: '(11) 98888-7000', email: 'financeiro@clinicahorizonte.com.br', valorCombinado: 880, frequenciaRecebimento: 'mensal', configuracaoRecorrencia: { diasSemana: [], diaMes: 30, mesInicio: null }, ativo: true },
];

export const subempresasDemo: Subempresa[] = [
  {
    id: 's1', empresaId: 'e1', nome: 'Loja Renner',
    endereco: 'Av. Roque Petroni Jr, 1089 — Piso Térreo, L112', cep: '04707-900', logradouro: 'Av. Roque Petroni Jr', bairro: 'Jardim das Acácias', cidade: 'São Paulo', estado: 'SP', numero: '1089',
    complemento: 'Piso Térreo', shoppingGaleria: 'Shopping Morumbi', lojaSala: 'Loja 112',
    responsavel: 'Gerente Renner', valorCombinado: 1200, frequenciaRecebimento: 'mensal', configuracaoRecorrencia: { diasSemana: [], diaMes: 10, mesInicio: null }, ativo: true,
  },
  {
    id: 's2', empresaId: 'e1', nome: 'Loja C&A',
    endereco: 'Av. Roque Petroni Jr, 1089 — Piso L2, L205', cep: '04707-900', logradouro: 'Av. Roque Petroni Jr', bairro: 'Jardim das Acácias', cidade: 'São Paulo', estado: 'SP', numero: '1089',
    complemento: 'Piso Superior', shoppingGaleria: 'Shopping Morumbi', lojaSala: 'Loja 205',
    responsavel: 'Gerente C&A', valorCombinado: 950, frequenciaRecebimento: 'mensal', configuracaoRecorrencia: { diasSemana: [], diaMes: 5, mesInicio: null }, ativo: true,
  },
  {
    id: 's3', empresaId: 'e2', nome: 'Loja Riachuelo',
    endereco: 'Av. Rebouças, 3970 — Piso 1, L134', cep: '05402-600', logradouro: 'Av. Rebouças', bairro: 'Pinheiros', cidade: 'São Paulo', estado: 'SP', numero: '3970',
    complemento: 'Piso 1', shoppingGaleria: 'Shopping Eldorado', lojaSala: 'Loja 134',
    responsavel: 'Gerente Riachuelo', valorCombinado: 1500, frequenciaRecebimento: 'mensal', configuracaoRecorrencia: { diasSemana: [], diaMes: 8, mesInicio: null }, ativo: true,
  },
  {
    id: 's4', empresaId: 'e3', nome: 'Sala 42',
    endereco: 'Rua 24 de Maio, 250 — Sala 42', cep: '01041-000', logradouro: 'Rua 24 de Maio', bairro: 'República', cidade: 'São Paulo', estado: 'SP', numero: '250',
    complemento: '4º andar', shoppingGaleria: 'Galeria Central', lojaSala: 'Sala 42',
    responsavel: 'Sr. Antônio', valorCombinado: 600, frequenciaRecebimento: 'mensal', configuracaoRecorrencia: { diasSemana: [], diaMes: 15, mesInicio: null }, ativo: true,
  },
];

export const colaboradoresDemo: Colaborador[] = [
  { id: 'c1', nome: 'João Silva', celular: '(11) 98888-1010', email: 'joao@avantalab.com.br', cpf: '52998224725', senha: '1234', ativo: true },
  { id: 'c2', nome: 'Maria Santos', celular: '(11) 97777-2020', email: 'maria@avantalab.com.br', cpf: '11144477735', senha: '1234', ativo: true },
];

// O colaborador "logado" na simulação da visão mobile.
export const colaboradorAtualId = 'c1';

// Referência de datas do estudo (alinhada a 17/07/2026).
export const recebimentosDemo: Recebimento[] = [
  // 1) Pagamento EXATO registrado hoje → aguardando conferência
  {
    id: 'r1', empresaId: 'e1', subempresaId: 's1', vencimento: '2026-07-10', valorCombinado: 1200,
    valorRecebido: 1200, colaboradorId: 'c1', recebidoEm: '2026-07-17T09:20:00', observacao: null,
    situacao: 'aguardando_conferencia', baixadoPor: null, baixadoEm: null,
  },
  // 2) Pagamento a MENOR (hoje) → recebido a menor
  {
    id: 'r2', empresaId: 'e1', subempresaId: 's2', vencimento: '2026-07-05', valorCombinado: 950,
    valorRecebido: 800, colaboradorId: 'c1', recebidoEm: '2026-07-17T10:05:00',
    observacao: 'Cliente pagou parcial; restante prometido para próxima semana.',
    situacao: 'recebido_a_menor', baixadoPor: null, baixadoEm: null,
  },
  // 3) Pagamento a MAIOR (ontem) → recebido a maior
  {
    id: 'r3', empresaId: 'e2', subempresaId: 's3', vencimento: '2026-07-08', valorCombinado: 1500,
    valorRecebido: 1550, colaboradorId: 'c2', recebidoEm: '2026-07-16T16:40:00',
    observacao: 'Cliente arredondou o valor para cima.',
    situacao: 'recebido_a_maior', baixadoPor: null, baixadoEm: null,
  },
  // 4) Já BAIXADO por gestor
  {
    id: 'r4', empresaId: 'e3', subempresaId: 's4', vencimento: '2026-06-15', valorCombinado: 600,
    valorRecebido: 600, colaboradorId: 'c1', recebidoEm: '2026-06-15T11:00:00', observacao: null,
    situacao: 'baixado', baixadoPor: 'Gestor (demo)', baixadoEm: '2026-06-16T08:30:00',
  },
  // 5) Cobrança VENCIDA e não baixada → em atraso
  {
    id: 'r5', empresaId: 'e2', subempresaId: 's3', vencimento: '2026-06-08', valorCombinado: 1500,
    valorRecebido: null, colaboradorId: null, recebidoEm: null, observacao: null,
    situacao: 'em_atraso', baixadoPor: null, baixadoEm: null,
  },
  // 6) PREVISTO (vencimento futuro, ainda não recebido)
  {
    id: 'r6', empresaId: 'e1', subempresaId: 's1', vencimento: '2026-08-10', valorCombinado: 1200,
    valorRecebido: null, colaboradorId: null, recebidoEm: null, observacao: null,
    situacao: 'previsto', baixadoPor: null, baixadoEm: null,
  },
  // 7) Outra baixa (mês anterior) para alimentar o gráfico
  {
    id: 'r7', empresaId: 'e1', subempresaId: 's2', vencimento: '2026-05-05', valorCombinado: 950,
    valorRecebido: 950, colaboradorId: 'c2', recebidoEm: '2026-05-05T14:10:00', observacao: null,
    situacao: 'baixado', baixadoPor: 'Administrador (demo)', baixadoEm: '2026-05-06T09:00:00',
  },
  {
    id: 'r8', empresaId: 'e4', subempresaId: null, vencimento: '2026-07-30', valorCombinado: 880,
    valorRecebido: null, colaboradorId: null, recebidoEm: null, observacao: null,
    situacao: 'previsto', baixadoPor: null, baixadoEm: null,
  },
];

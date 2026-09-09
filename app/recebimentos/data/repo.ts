import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase as supabasePrincipal } from '@/app/lib/supabase';
import type { AvaliacaoServico, Colaborador, Empresa, FormaPagamentoRecebimento, Recebimento, Servico, SituacaoRecebimento, Subempresa } from '../components/types';
import { validarNomeCompleto } from '@/app/lib/nome-pessoa';

export type DadosRecebimentos = {
  empresas: Empresa[];
  subempresas: Subempresa[];
  colaboradores: Colaborador[];
  recebimentos: Recebimento[];
  servicos: Servico[];
};

export type DadosNovoColaborador = Omit<Colaborador, 'id'>;
export type DadosEditarColaborador = Omit<Colaborador, 'id' | 'ativo'>;

export type IntegracaoFinanceiraRecebimentos = {
  nomeEntrada: string;
  tituloEtiqueta: string;
  integrado: boolean;
  valorSincronizado: number;
};

export type ComprovanteRecebimento = {
  url: string;
  nome: string;
  mimeType: string;
  tamanho: number;
  enviadoEm: string;
};

export type DadosSubempresaEditavel = Pick<Subempresa, 'nome' | 'endereco' | 'cep' | 'logradouro' | 'bairro' | 'cidade' | 'estado' | 'numero' | 'tipoNivel' | 'identificacaoNivel' | 'complemento' | 'responsavel' | 'valorCombinado' | 'diaVencimento' | 'herdaExecucaoServico' | 'frequenciaExecucaoServico' | 'configuracaoExecucaoServico'>;
export type DadosEmpresaEditavel = Omit<Empresa, 'id' | 'ativo'>;

export interface RecebimentosRepo {
  carregar(): Promise<DadosRecebimentos>;
  salvarEmpresa(dados: Omit<Empresa, 'id'>): Promise<void>;
  editarEmpresa(id: string, dados: DadosEmpresaEditavel): Promise<void>;
  excluirEmpresa(id: string): Promise<void>;
  alternarEmpresa(id: string, ativo: boolean): Promise<void>;
  salvarSubempresa(dados: Omit<Subempresa, 'id'>): Promise<void>;
  editarSubempresa(id: string, dados: DadosSubempresaEditavel): Promise<void>;
  excluirSubempresa(id: string): Promise<void>;
  alternarSubempresa(id: string, ativo: boolean): Promise<void>;
  criarColaborador(dados: DadosNovoColaborador): Promise<void>;
  editarColaborador(id: string, dados: DadosEditarColaborador): Promise<void>;
  excluirColaborador(id: string): Promise<void>;
  alternarColaborador(id: string, ativo: boolean): Promise<void>;
  registrarRecebimento(empresaRecebimentoId: string, subempresaId: string | null, valor: number, observacao: string, formaPagamento: FormaPagamentoRecebimento, comprovante?: File | null): Promise<void>;
  receberCobranca(lancamentoId: string, valor: number, observacao: string, formaPagamento: FormaPagamentoRecebimento, comprovante?: File | null, dataPagamento?: string | null): Promise<void>;
  registrarServico(empresaRecebimentoId: string, subempresaId: string | null, clienteNome: string, assinatura: string, avaliacao: AvaliacaoServico, observacaoCliente: string): Promise<void>;
  concluirAvisoServico(servicoId: string): Promise<void>;
  reabrirAvisoServico(servicoId: string): Promise<void>;
  obterComprovante(lancamentoId: string): Promise<ComprovanteRecebimento>;
  obterComprovanteServico(servicoId: string): Promise<ComprovanteRecebimento>;
  confirmarBaixa(lancamentoId: string, formaPagamento?: FormaPagamentoRecebimento): Promise<void>;
  devolver(lancamentoId: string, motivo: string): Promise<void>;
  divergencia(lancamentoId: string, motivo: string): Promise<void>;
  estornar(lancamentoId: string, motivo: string): Promise<void>;
  obterIntegracaoFinanceira(ano: number, mes: number): Promise<IntegracaoFinanceiraRecebimentos>;
  atualizarTitulosFinanceiro(ano: number, mes: number, nomeEntrada: string, tituloEtiqueta: string): Promise<IntegracaoFinanceiraRecebimentos>;
  definirIntegracaoFinanceira(ano: number, mes: number, ativa: boolean): Promise<IntegracaoFinanceiraRecebimentos>;
  assinarAtualizacoes?(callback: () => void): () => void;
}

function exigirResponsavelValido(valor: string) {
  if (valor.trim() && !validarNomeCompleto(valor)) {
    throw new Error('Informe o nome completo do responsável, com nome e sobrenome.');
  }
}


type Linha = Record<string, unknown>;
const texto = (v: unknown) => String(v ?? '');
const numero = (v: unknown) => Number(v ?? 0);

function mapIntegracao(row: Linha | null | undefined): IntegracaoFinanceiraRecebimentos {
  return {
    nomeEntrada: texto(row?.nome_entrada) || 'Recebimentos em campo',
    tituloEtiqueta: texto(row?.titulo_etiqueta) || 'Recebimentos',
    integrado: row?.integrado === true,
    valorSincronizado: numero(row?.valor_sincronizado),
  };
}

function mapEmpresa(row: Linha): Empresa {
  const tipoCadastro = texto(row.tipo_cadastro) === 'cliente_direto' ? 'cliente_direto' : 'local_agrupador';
  const diaExecucaoMes = row.dia_execucao_mes == null ? (row.dia_mes == null ? null : numero(row.dia_mes)) : numero(row.dia_execucao_mes);
  const diaVencimento = row.dia_vencimento == null ? diaExecucaoMes : numero(row.dia_vencimento);
  const diasExecucao = row.dias_execucao_semana ?? row.dias_semana;
  return {
    id: texto(row.id), tipoCadastro, nome: texto(row.nome), endereco: texto(row.endereco), cep: texto(row.cep), logradouro: texto(row.logradouro), bairro: texto(row.bairro), cidade: texto(row.cidade), estado: texto(row.estado), numero: texto(row.numero), tipoNivel: (texto(row.tipo_nivel) || null) as Empresa['tipoNivel'], identificacaoNivel: texto(row.identificacao_nivel), complemento: texto(row.complemento),
    responsavel: texto(row.responsavel), telefone: texto(row.telefone), email: texto(row.email),
    valorCombinado: row.valor_combinado == null ? null : numero(row.valor_combinado),
    diaVencimento: tipoCadastro === 'cliente_direto' ? diaVencimento : null,
    frequenciaExecucaoServico: texto(row.frequencia_execucao_servico ?? row.frequencia_recebimento) ? texto(row.frequencia_execucao_servico ?? row.frequencia_recebimento) as Empresa['frequenciaExecucaoServico'] : null,
    configuracaoExecucaoServico: {
      diasSemana: Array.isArray(diasExecucao) ? diasExecucao.map(numero).filter((dia) => dia >= 0 && dia <= 6) : [],
      diaMes: diaExecucaoMes,
      mesInicio: row.mes_inicio_execucao == null ? (row.mes_inicio == null ? null : numero(row.mes_inicio)) : numero(row.mes_inicio_execucao),
    },
    ativo: row.ativo !== false,
  };
}

function mapSubempresa(row: Linha): Subempresa {
  const diasExecucao = row.dias_execucao_semana ?? row.dias_semana;
  return {
    id: texto(row.id), empresaId: texto(row.recebimento_empresa_id), nome: texto(row.nome), endereco: texto(row.endereco),
    cep: texto(row.cep), logradouro: texto(row.logradouro), bairro: texto(row.bairro), cidade: texto(row.cidade), estado: texto(row.estado), numero: texto(row.numero), tipoNivel: (texto(row.tipo_nivel) || null) as Subempresa['tipoNivel'], identificacaoNivel: texto(row.identificacao_nivel), complemento: texto(row.complemento),
    shoppingGaleria: texto(row.shopping_galeria), lojaSala: texto(row.loja_sala), responsavel: texto(row.responsavel),
    valorCombinado: row.valor_combinado == null ? null : numero(row.valor_combinado),
    diaVencimento: row.dia_vencimento == null ? (row.dia_mes == null ? 1 : numero(row.dia_mes)) : numero(row.dia_vencimento),
    herdaExecucaoServico: row.herda_execucao_servico !== false,
    frequenciaExecucaoServico: (texto(row.frequencia_execucao_servico ?? row.frequencia_recebimento) || 'mensal') as Subempresa['frequenciaExecucaoServico'],
    configuracaoExecucaoServico: {
      diasSemana: Array.isArray(diasExecucao) ? diasExecucao.map(numero).filter((dia) => dia >= 0 && dia <= 6) : [],
      diaMes: row.dia_execucao_mes == null ? (row.dia_mes == null ? null : numero(row.dia_mes)) : numero(row.dia_execucao_mes),
      mesInicio: row.mes_inicio_execucao == null ? (row.mes_inicio == null ? null : numero(row.mes_inicio)) : numero(row.mes_inicio_execucao),
    },
    ativo: row.ativo !== false,
  };
}

function mapColaborador(row: Linha): Colaborador {
  return {
    id: texto(row.user_id), nome: texto(row.nome), celular: texto(row.celular),
    email: texto(row.email_contato), cpf: texto(row.cpf), senha: '',
    podeRecebimentos: row.pode_recebimentos !== false,
    podeServicos: row.pode_servicos === true,
    ativo: row.ativo !== false,
  };
}

function mapServico(row: Linha): Servico {
  return {
    id: texto(row.id), empresaId: texto(row.recebimento_empresa_id),
    subempresaId: row.subempresa_id == null ? null : texto(row.subempresa_id),
    dataProgramada: texto(row.data_programada),
    situacao: texto(row.situacao) as Servico['situacao'],
    colaboradorId: row.colaborador_user_id == null ? null : texto(row.colaborador_user_id),
    clienteNome: row.cliente_nome == null ? null : texto(row.cliente_nome),
    assinaturaArquivoPath: row.assinatura_arquivo_path == null ? null : texto(row.assinatura_arquivo_path),
    assinatura: row.assinatura == null ? null : texto(row.assinatura),
    avaliacao: row.avaliacao == null ? null : texto(row.avaliacao) as AvaliacaoServico,
    observacaoCliente: row.observacao_cliente == null ? null : texto(row.observacao_cliente),
    realizadoEm: row.realizado_em == null ? null : texto(row.realizado_em),
    avisoConcluidoEm: row.aviso_concluido_em == null ? null : texto(row.aviso_concluido_em),
  };
}

function mapRecebimento(row: Linha): Recebimento {
  return {
    id: texto(row.id), empresaId: texto(row.recebimento_empresa_id), subempresaId: row.subempresa_id == null ? null : texto(row.subempresa_id),
    vencimento: texto(row.vencimento), valorCombinado: numero(row.valor_combinado),
    valorRecebido: row.valor_recebido == null ? null : numero(row.valor_recebido),
    colaboradorId: row.colaborador_user_id == null ? null : texto(row.colaborador_user_id),
    recebidoEm: row.recebido_em == null ? null : texto(row.recebido_em), observacao: row.observacao == null ? null : texto(row.observacao),
    formaPagamento: row.forma_pagamento == null ? null : texto(row.forma_pagamento) as FormaPagamentoRecebimento,
    temComprovante: row.tem_comprovante === true,
    situacao: texto(row.situacao) as SituacaoRecebimento,
    baixadoPor: row.baixado_por == null ? null : texto(row.baixado_por), baixadoEm: row.baixado_em == null ? null : texto(row.baixado_em),
  };
}

function erroMensagem(error: unknown, fallback: string) {
  if (error && typeof error === 'object' && 'message' in error) return String(error.message);
  return fallback;
}

async function chamarApi(cliente: SupabaseClient, rota: string, corpo: Record<string, unknown>) {
  const { data } = await cliente.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error('Sessão não encontrada. Entre novamente.');
  const resposta = await fetch(rota, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(corpo),
  });
  const json = await resposta.json().catch(() => ({}));
  if (!resposta.ok || json.erro) throw new Error(String(json.mensagem ?? 'Não foi possível concluir a operação.'));
  return json;
}

async function tokenSessao(cliente: SupabaseClient) {
  const { data } = await cliente.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error('Sessão não encontrada. Entre novamente.');
  return token;
}

async function registrarViaApi(
  cliente: SupabaseClient,
  dados: {
    empresaId: string;
    lancamentoId?: string | null;
    recebimentoEmpresaId?: string | null;
    subempresaId?: string | null;
    valor: number;
    observacao: string;
    formaPagamento: FormaPagamentoRecebimento;
    comprovante?: File | null;
    dataPagamento?: string | null;
  },
) {
  const form = new FormData();
  form.set('empresaId', dados.empresaId);
  if (dados.lancamentoId) form.set('lancamentoId', dados.lancamentoId);
  if (dados.recebimentoEmpresaId) form.set('recebimentoEmpresaId', dados.recebimentoEmpresaId);
  if (dados.subempresaId) form.set('subempresaId', dados.subempresaId);
  form.set('valorRecebido', dados.valor.toFixed(2));
  form.set('observacao', dados.observacao);
  form.set('formaPagamento', dados.formaPagamento);
  if (dados.dataPagamento) form.set('dataPagamento', dados.dataPagamento);
  if (dados.comprovante) form.set('comprovante', dados.comprovante);
  const resposta = await fetch('/api/recebimentos/registrar', {
    method: 'POST',
    headers: { Authorization: `Bearer ${await tokenSessao(cliente)}` },
    body: form,
  });
  const json = await resposta.json().catch(() => ({}));
  if (!resposta.ok || json.erro) throw new Error(String(json.mensagem ?? 'Não foi possível registrar o recebimento.'));
}

export function criarRepoSupabase(empresaId: string, cliente: SupabaseClient = supabasePrincipal): RecebimentosRepo {
  async function exigir<T>(promessa: PromiseLike<{ data: T; error: unknown }>, mensagem: string): Promise<T> {
    const { data, error } = await promessa;
    if (error) throw new Error(erroMensagem(error, mensagem));
    return data;
  }

  async function carregarTodosRecebimentos(): Promise<Linha[]> {
    const tamanhoPagina = 1000;
    const todasAsLinhas: Linha[] = [];

    for (let inicio = 0; ; inicio += tamanhoPagina) {
      const fim = inicio + tamanhoPagina - 1;
      const { data, error } = await cliente
        .from('recebimentos_lancamentos')
        .select('*')
        .eq('empresa_id', empresaId)
        .order('vencimento', { ascending: false })
        .order('id', { ascending: true })
        .range(inicio, fim);

      if (error) throw new Error(erroMensagem(error, 'Erro ao carregar recebimentos.'));
      const pagina = (data ?? []) as Linha[];
      todasAsLinhas.push(...pagina);
      if (pagina.length < tamanhoPagina) break;
    }

    return todasAsLinhas;
  }

  async function carregarTodosServicos(): Promise<Linha[]> {
    const { data, error } = await cliente
      .from('recebimentos_servicos')
      .select('*')
      .eq('empresa_id', empresaId)
      .order('data_programada', { ascending: false })
      .limit(2000);
    // A tela continua operável antes da migração de Serviços chegar ao ambiente.
    if (error && ['PGRST205', '42P01'].includes(String((error as { code?: string }).code ?? ''))) return [];
    if (error) throw new Error(erroMensagem(error, 'Erro ao carregar serviços.'));
    return (data ?? []) as Linha[];
  }

  return {
    async carregar() {
      // A migration de recorrência pode ainda não ter sido aplicada em um
      // ambiente já publicado. Nesse intervalo, o módulo continua legível;
      // assim que a rotina existir, a sincronização volta a ser automática.
      const { error: erroRecorrencia } = await cliente.rpc('recebimentos_sincronizar_recorrencias', { p_empresa_id: empresaId });
      if (erroRecorrencia && erroRecorrencia.code !== 'PGRST202') {
        throw new Error(erroMensagem(erroRecorrencia, 'Erro ao atualizar as cobranças recorrentes.'));
      }
      const { error: erroServicos } = await cliente.rpc('recebimentos_sincronizar_servicos', { p_empresa_id: empresaId });
      if (erroServicos && !['PGRST202', 'PGRST205', '42P01'].includes(String(erroServicos.code ?? ''))) {
        throw new Error(erroMensagem(erroServicos, 'Erro ao atualizar a programação de serviços.'));
      }
      const [empresas, subempresas, colaboradores, recebimentos, comprovantes, servicos] = await Promise.all([
        exigir(cliente.from('recebimentos_empresas').select('*').eq('empresa_id', empresaId).order('nome'), 'Erro ao carregar empresas.'),
        exigir(cliente.from('recebimentos_subempresas').select('*').eq('empresa_id', empresaId).order('nome'), 'Erro ao carregar subempresas.'),
        exigir(cliente.from('recebimentos_colaboradores').select('*').eq('empresa_id', empresaId).order('nome'), 'Erro ao carregar colaboradores.'),
        carregarTodosRecebimentos(),
        cliente.from('recebimentos_comprovantes').select('lancamento_id').eq('empresa_id', empresaId),
        carregarTodosServicos(),
      ]);
      if (comprovantes.error && !['PGRST205', '42P01'].includes(String(comprovantes.error.code ?? ''))) {
        throw new Error(erroMensagem(comprovantes.error, 'Erro ao carregar os comprovantes.'));
      }
      const idsComComprovante = new Set(
        comprovantes.error ? [] : ((comprovantes.data ?? []) as Linha[]).map((item) => texto(item.lancamento_id)),
      );
      return {
        empresas: (empresas as Linha[]).map(mapEmpresa), subempresas: (subempresas as Linha[]).map(mapSubempresa),
        colaboradores: (colaboradores as Linha[]).map(mapColaborador),
        recebimentos: (recebimentos as Linha[]).map((item) => mapRecebimento({
          ...item,
          tem_comprovante: idsComComprovante.has(texto(item.id)),
        })),
        servicos: servicos.map(mapServico),
      };
    },
    async salvarEmpresa(dados) {
      exigirResponsavelValido(dados.responsavel);
      await exigir(cliente.from('recebimentos_empresas').insert({
        empresa_id: empresaId, nome: dados.nome, tipo_cadastro: dados.tipoCadastro, endereco: dados.endereco, cep: dados.cep, logradouro: dados.logradouro, bairro: dados.bairro, cidade: dados.cidade, estado: dados.estado, numero: dados.numero, tipo_nivel: dados.tipoNivel, identificacao_nivel: dados.identificacaoNivel, complemento: dados.complemento, responsavel: dados.responsavel, telefone: dados.telefone, email: dados.email, valor_combinado: dados.valorCombinado, dia_vencimento: dados.diaVencimento, frequencia_execucao_servico: dados.frequenciaExecucaoServico, dias_execucao_semana: dados.configuracaoExecucaoServico?.diasSemana ?? [], dia_execucao_mes: dados.configuracaoExecucaoServico?.diaMes ?? null, mes_inicio_execucao: dados.configuracaoExecucaoServico?.mesInicio ?? null, frequencia_recebimento: dados.tipoCadastro === 'cliente_direto' ? 'mensal' : null, dias_semana: [], dia_mes: dados.diaVencimento, mes_inicio: null, ativo: dados.ativo,
      }).select('id').single(), 'Erro ao cadastrar empresa.');
    },
    async editarEmpresa(id, dados) {
      exigirResponsavelValido(dados.responsavel);
      await exigir(cliente.from('recebimentos_empresas').update({
        nome: dados.nome, tipo_cadastro: dados.tipoCadastro, endereco: dados.endereco, cep: dados.cep, logradouro: dados.logradouro, bairro: dados.bairro, cidade: dados.cidade, estado: dados.estado, numero: dados.numero, tipo_nivel: dados.tipoNivel, identificacao_nivel: dados.identificacaoNivel, complemento: dados.complemento, responsavel: dados.responsavel, telefone: dados.telefone, email: dados.email, valor_combinado: dados.valorCombinado, dia_vencimento: dados.diaVencimento, frequencia_execucao_servico: dados.frequenciaExecucaoServico, dias_execucao_semana: dados.configuracaoExecucaoServico?.diasSemana ?? [], dia_execucao_mes: dados.configuracaoExecucaoServico?.diaMes ?? null, mes_inicio_execucao: dados.configuracaoExecucaoServico?.mesInicio ?? null, frequencia_recebimento: dados.tipoCadastro === 'cliente_direto' ? 'mensal' : null, dias_semana: [], dia_mes: dados.diaVencimento, mes_inicio: null, atualizado_em: new Date().toISOString(),
      }).eq('empresa_id', empresaId).eq('id', id).select('id').single(), 'Erro ao editar empresa.');
    },
    async excluirEmpresa(id) { await exigir(cliente.from('recebimentos_empresas').delete().eq('empresa_id', empresaId).eq('id', id).select('id'), 'Erro ao excluir empresa.'); },
    async alternarEmpresa(id, ativo) { await exigir(cliente.from('recebimentos_empresas').update({ ativo, atualizado_em: new Date().toISOString() }).eq('empresa_id', empresaId).eq('id', id).select('id'), 'Erro ao alterar empresa.'); },
    async salvarSubempresa(dados) {
      exigirResponsavelValido(dados.responsavel);
      await exigir(cliente.from('recebimentos_subempresas').insert({
        empresa_id: empresaId, recebimento_empresa_id: dados.empresaId, nome: dados.nome, endereco: dados.endereco,
        logradouro: dados.logradouro, numero: dados.numero, tipo_nivel: dados.tipoNivel, identificacao_nivel: dados.identificacaoNivel, complemento: dados.complemento,
        cep: dados.cep, bairro: dados.bairro, cidade: dados.cidade, estado: dados.estado,
        shopping_galeria: dados.shoppingGaleria, loja_sala: dados.lojaSala, responsavel: dados.responsavel,
        valor_combinado: dados.valorCombinado, dia_vencimento: dados.diaVencimento, herda_execucao_servico: dados.herdaExecucaoServico,
        frequencia_execucao_servico: dados.frequenciaExecucaoServico, dias_execucao_semana: dados.configuracaoExecucaoServico.diasSemana,
        dia_execucao_mes: dados.configuracaoExecucaoServico.diaMes, mes_inicio_execucao: dados.configuracaoExecucaoServico.mesInicio,
        frequencia_recebimento: 'mensal', dias_semana: [], dia_mes: dados.diaVencimento, mes_inicio: null,
        ativo: dados.ativo,
      }).select('id').single(), 'Erro ao cadastrar subempresa.');
    },
    async editarSubempresa(id, dados) { exigirResponsavelValido(dados.responsavel); await exigir(cliente.from('recebimentos_subempresas').update({ nome: dados.nome, endereco: dados.endereco, cep: dados.cep, logradouro: dados.logradouro, bairro: dados.bairro, cidade: dados.cidade, estado: dados.estado, numero: dados.numero, tipo_nivel: dados.tipoNivel, identificacao_nivel: dados.identificacaoNivel, complemento: dados.complemento, responsavel: dados.responsavel, valor_combinado: dados.valorCombinado, dia_vencimento: dados.diaVencimento, herda_execucao_servico: dados.herdaExecucaoServico, frequencia_execucao_servico: dados.frequenciaExecucaoServico, dias_execucao_semana: dados.configuracaoExecucaoServico.diasSemana, dia_execucao_mes: dados.configuracaoExecucaoServico.diaMes, mes_inicio_execucao: dados.configuracaoExecucaoServico.mesInicio, frequencia_recebimento: 'mensal', dias_semana: [], dia_mes: dados.diaVencimento, mes_inicio: null, atualizado_em: new Date().toISOString() }).eq('empresa_id', empresaId).eq('id', id).select('id'), 'Erro ao editar subempresa.'); },
    async excluirSubempresa(id) { await exigir(cliente.from('recebimentos_subempresas').delete().eq('empresa_id', empresaId).eq('id', id).select('id'), 'Erro ao excluir subempresa.'); },
    async alternarSubempresa(id, ativo) { await exigir(cliente.from('recebimentos_subempresas').update({ ativo, atualizado_em: new Date().toISOString() }).eq('empresa_id', empresaId).eq('id', id).select('id'), 'Erro ao alterar subempresa.'); },
    async criarColaborador(dados) { await chamarApi(cliente, '/api/recebimentos/criar-colaborador', { empresaId, ...dados }); },
    async editarColaborador(id, dados) {
      await chamarApi(cliente, '/api/recebimentos/atualizar-colaborador', { empresaId, colaboradorUserId: id, ...dados });
      if (dados.senha) await chamarApi(cliente, '/api/recebimentos/redefinir-senha-colaborador', { empresaId, colaboradorUserId: id, novaSenha: dados.senha });
    },
    async excluirColaborador(id) { await chamarApi(cliente, '/api/recebimentos/excluir-colaborador', { empresaId, colaboradorUserId: id }); },
    async alternarColaborador(id, ativo) {
      const { data, error } = await cliente.from('recebimentos_colaboradores').select('nome, cpf, celular, email_contato, pode_recebimentos, pode_servicos').eq('empresa_id', empresaId).eq('user_id', id).single();
      if (error || !data) throw new Error('Colaborador não encontrado.');
      await chamarApi(cliente, '/api/recebimentos/atualizar-colaborador', { empresaId, colaboradorUserId: id, nome: data.nome, cpf: data.cpf, celular: data.celular, email: data.email_contato, podeRecebimentos: data.pode_recebimentos !== false, podeServicos: data.pode_servicos === true, ativo });
    },
    async registrarRecebimento(empresaRecebimentoId, subempresaId, valor, observacao, formaPagamento, comprovante) {
      await registrarViaApi(cliente, {
        empresaId,
        recebimentoEmpresaId: empresaRecebimentoId,
        subempresaId,
        valor,
        observacao,
        formaPagamento,
        comprovante,
      });
    },
    async receberCobranca(id, valor, observacao, formaPagamento, comprovante, dataPagamento) {
      await registrarViaApi(cliente, {
        empresaId,
        lancamentoId: id,
        valor,
        observacao,
        formaPagamento,
        comprovante,
        dataPagamento,
      });
    },
    async registrarServico(recebimentoEmpresaId, subempresaId, clienteNome, assinatura, avaliacao, observacaoCliente) {
      await chamarApi(cliente, '/api/recebimentos/registrar-servico', {
        empresaId, recebimentoEmpresaId, subempresaId, clienteNome, assinatura, avaliacao, observacaoCliente,
      });
    },
    async concluirAvisoServico(servicoId) {
      await chamarApi(cliente, '/api/recebimentos/concluir-aviso-servico', { empresaId, servicoId });
    },
    async reabrirAvisoServico(servicoId) {
      await chamarApi(cliente, '/api/recebimentos/reabrir-aviso-servico', { empresaId, servicoId });
    },
    async obterComprovante(id) {
      const resposta = await fetch(`/api/recebimentos/comprovante?lancamentoId=${encodeURIComponent(id)}`, {
        headers: { Authorization: `Bearer ${await tokenSessao(cliente)}` },
        cache: 'no-store',
      });
      const json = await resposta.json().catch(() => ({}));
      if (!resposta.ok || json.erro) throw new Error(String(json.mensagem ?? 'Não foi possível abrir o comprovante.'));
      return {
        url: String(json.url ?? ''),
        nome: String(json.nome ?? 'Comprovante'),
        mimeType: String(json.mimeType ?? ''),
        tamanho: Number(json.tamanho ?? 0),
        enviadoEm: String(json.enviadoEm ?? ''),
      };
    },
    async obterComprovanteServico(id) {
      const resposta = await fetch(`/api/recebimentos/comprovante-servico?empresaId=${encodeURIComponent(empresaId)}&servicoId=${encodeURIComponent(id)}`, {
        headers: { Authorization: `Bearer ${await tokenSessao(cliente)}` },
        cache: 'no-store',
      });
      const json = await resposta.json().catch(() => ({}));
      if (!resposta.ok || json.erro) throw new Error(String(json.mensagem ?? 'Não foi possível abrir a assinatura.'));
      return {
        url: String(json.url ?? ''),
        nome: String(json.nome ?? 'Assinatura do atendimento'),
        mimeType: String(json.mimeType ?? 'image/png'),
        tamanho: Number(json.tamanho ?? 0),
        enviadoEm: String(json.enviadoEm ?? ''),
      };
    },
    async confirmarBaixa(id, formaPagamento) {
      await exigir(cliente.rpc('recebimentos_baixar', {
        p_lancamento_id: id,
        p_motivo: null,
        p_forma_pagamento: formaPagamento ?? null,
      }), 'Erro ao confirmar baixa.');
    },
    async devolver(id, motivo) { await exigir(cliente.rpc('recebimentos_devolver', { p_lancamento_id: id, p_motivo: motivo }), 'Erro ao devolver recebimento.'); },
    async divergencia(id, motivo) { await exigir(cliente.rpc('recebimentos_registrar_divergencia', { p_lancamento_id: id, p_motivo: motivo }), 'Erro ao registrar divergência.'); },
    async estornar(id, motivo) { await exigir(cliente.rpc('recebimentos_estornar', { p_lancamento_id: id, p_motivo: motivo }), 'Erro ao estornar recebimento.'); },
    async obterIntegracaoFinanceira(ano, mes) {
      const data = await exigir(cliente.rpc('recebimentos_obter_integracao_financeira', {
        p_empresa_id: empresaId, p_ano: ano, p_mes: mes,
      }), 'Erro ao carregar a integração financeira.');
      return mapIntegracao(data as Linha);
    },
    async atualizarTitulosFinanceiro(ano, mes, nomeEntrada, tituloEtiqueta) {
      const data = await exigir(cliente.rpc('recebimentos_atualizar_titulos_financeiro', {
        p_empresa_id: empresaId, p_ano: ano, p_mes: mes,
        p_nome_entrada: nomeEntrada, p_titulo_etiqueta: tituloEtiqueta,
      }), 'Erro ao atualizar os títulos da integração.');
      return mapIntegracao(data as Linha);
    },
    async definirIntegracaoFinanceira(ano, mes, ativa) {
      const data = await exigir(cliente.rpc('recebimentos_definir_integracao_financeira', {
        p_empresa_id: empresaId, p_ano: ano, p_mes: mes, p_ativa: ativa,
      }), ativa ? 'Erro ao adicionar os valores às receitas.' : 'Erro ao retirar os valores das receitas.');
      return mapIntegracao(data as Linha);
    },
    assinarAtualizacoes(callback) {
      const canal = cliente.channel(`recebimentos-${empresaId}-${Math.random()}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'recebimentos_lancamentos', filter: `empresa_id=eq.${empresaId}` }, callback)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'recebimentos_servicos', filter: `empresa_id=eq.${empresaId}` }, callback)
        .subscribe();
      return () => { void cliente.removeChannel(canal); };
    },
  };
}

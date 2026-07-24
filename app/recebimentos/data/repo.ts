import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase as supabasePrincipal } from '@/app/lib/supabase';
import type { Colaborador, Empresa, FormaPagamentoRecebimento, Recebimento, SituacaoRecebimento, Subempresa } from '../components/types';
import { colaboradoresDemo, empresasDemo, recebimentosDemo, subempresasDemo } from '../components/dadosDemo';
import { situacaoPorValor } from '../components/helpers';

export type DadosRecebimentos = {
  empresas: Empresa[];
  subempresas: Subempresa[];
  colaboradores: Colaborador[];
  recebimentos: Recebimento[];
};

export type DadosNovoColaborador = Omit<Colaborador, 'id'>;
export type DadosEditarColaborador = Omit<Colaborador, 'id' | 'ativo'>;

export type IntegracaoFinanceiraRecebimentos = {
  nomeEntrada: string;
  tituloEtiqueta: string;
  integrado: boolean;
  valorSincronizado: number;
};

export type DadosSubempresaEditavel = Pick<Subempresa, 'nome' | 'endereco' | 'cep' | 'logradouro' | 'bairro' | 'cidade' | 'estado' | 'numero' | 'complemento' | 'responsavel' | 'valorCombinado' | 'frequenciaRecebimento' | 'configuracaoRecorrencia'>;
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
  registrarRecebimento(empresaRecebimentoId: string, subempresaId: string | null, valor: number, observacao: string): Promise<void>;
  receberCobranca(lancamentoId: string, valor: number, observacao: string): Promise<void>;
  confirmarBaixa(lancamentoId: string, formaPagamento?: FormaPagamentoRecebimento): Promise<void>;
  devolver(lancamentoId: string, motivo: string): Promise<void>;
  divergencia(lancamentoId: string, motivo: string): Promise<void>;
  estornar(lancamentoId: string, motivo: string): Promise<void>;
  obterIntegracaoFinanceira(ano: number, mes: number): Promise<IntegracaoFinanceiraRecebimentos>;
  atualizarTitulosFinanceiro(ano: number, mes: number, nomeEntrada: string, tituloEtiqueta: string): Promise<IntegracaoFinanceiraRecebimentos>;
  definirIntegracaoFinanceira(ano: number, mes: number, ativa: boolean): Promise<IntegracaoFinanceiraRecebimentos>;
  assinarAtualizacoes?(callback: () => void): () => void;
}

function copia<T>(valor: T): T {
  return JSON.parse(JSON.stringify(valor)) as T;
}

function hojeIso() {
  const agora = new Date();
  return new Date(agora.getTime() - agora.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

export function criarRepoDemo(): RecebimentosRepo {
  const dados: DadosRecebimentos = {
    empresas: copia(empresasDemo),
    subempresas: copia(subempresasDemo),
    colaboradores: copia(colaboradoresDemo),
    recebimentos: copia(recebimentosDemo),
  };
  let integracaoAtiva = true;
  let nomeEntradaIntegracao = 'Recebimentos em campo';
  let tituloEtiquetaIntegracao = 'Recebimentos';
  const valorIntegrado = (ano: number, mes: number) => {
    if (!integracaoAtiva) return 0;
    const chave = `${ano}-${String(mes).padStart(2, '0')}`;
    return dados.recebimentos.reduce((total, recebimento) => {
      const dataBaixa = recebimento.baixadoEm ?? recebimento.recebidoEm ?? '';
      return recebimento.situacao === 'baixado' && dataBaixa.slice(0, 7) === chave
        ? total + (recebimento.valorRecebido ?? 0)
        : total;
    }, 0);
  };
  const colaboradorAtual = () => dados.colaboradores[0];
  return {
    async carregar() { return copia(dados); },
    async salvarEmpresa(valor) { dados.empresas.push({ ...valor, id: `e-${Date.now()}` }); },
    async editarEmpresa(id, valor) { dados.empresas = dados.empresas.map((e) => e.id === id ? { ...e, ...valor } : e); },
    async excluirEmpresa(id) {
      const subs = new Set(dados.subempresas.filter((s) => s.empresaId === id).map((s) => s.id));
      dados.recebimentos = dados.recebimentos.filter((r) => r.empresaId !== id && (!r.subempresaId || !subs.has(r.subempresaId)));
      dados.subempresas = dados.subempresas.filter((s) => s.empresaId !== id);
      dados.empresas = dados.empresas.filter((e) => e.id !== id);
    },
    async alternarEmpresa(id, ativo) { dados.empresas = dados.empresas.map((e) => e.id === id ? { ...e, ativo } : e); },
    async salvarSubempresa(valor) { dados.subempresas.push({ ...valor, id: `s-${Date.now()}` }); },
    async editarSubempresa(id, valor) { dados.subempresas = dados.subempresas.map((s) => s.id === id ? { ...s, ...valor } : s); },
    async excluirSubempresa(id) {
      dados.recebimentos = dados.recebimentos.filter((r) => r.subempresaId !== id);
      dados.subempresas = dados.subempresas.filter((s) => s.id !== id);
    },
    async alternarSubempresa(id, ativo) { dados.subempresas = dados.subempresas.map((s) => s.id === id ? { ...s, ativo } : s); },
    async criarColaborador(valor) { dados.colaboradores.push({ ...valor, id: `c-${Date.now()}` }); },
    async editarColaborador(id, valor) { dados.colaboradores = dados.colaboradores.map((c) => c.id === id ? { ...c, ...valor } : c); },
    async excluirColaborador(id) {
      dados.recebimentos = dados.recebimentos.map((r) => r.colaboradorId === id ? { ...r, colaboradorId: null } : r);
      dados.colaboradores = dados.colaboradores.filter((c) => c.id !== id);
    },
    async alternarColaborador(id, ativo) { dados.colaboradores = dados.colaboradores.map((c) => c.id === id ? { ...c, ativo } : c); },
    async registrarRecebimento(empresaRecebimentoId, subempresaId, valor, observacao) {
      const sub = subempresaId ? dados.subempresas.find((s) => s.id === subempresaId) : null;
      const empresa = dados.empresas.find((item) => item.id === empresaRecebimentoId);
      const colaborador = colaboradorAtual();
      if ((!sub && (!empresa || empresa.tipoCadastro !== 'cliente_direto')) || !colaborador) throw new Error('Cliente ou colaborador não encontrado.');
      const valorCombinado = sub?.valorCombinado ?? empresa?.valorCombinado ?? 0;
      const agora = new Date();
      dados.recebimentos.unshift({
        id: `r-${Date.now()}`, empresaId: sub?.empresaId ?? empresaRecebimentoId, subempresaId: sub?.id ?? null,
        vencimento: hojeIso(),
        valorCombinado, valorRecebido: valor, colaboradorId: colaborador.id,
        recebidoEm: agora.toISOString(), observacao: observacao.trim() || null,
        situacao: situacaoPorValor(valorCombinado, valor), baixadoPor: null, baixadoEm: null,
      });
    },
    async receberCobranca(id, valor, observacao) {
      const colaborador = colaboradorAtual();
      dados.recebimentos = dados.recebimentos.map((r) => r.id === id ? {
        ...r, valorRecebido: valor, colaboradorId: colaborador?.id ?? null, recebidoEm: new Date().toISOString(),
        observacao: observacao.trim() || r.observacao, situacao: situacaoPorValor(r.valorCombinado, valor),
      } : r);
    },
    async confirmarBaixa(id, formaPagamento) {
      dados.recebimentos = dados.recebimentos.map((r) => r.id === id ? {
        ...r,
        valorRecebido: r.valorRecebido ?? r.valorCombinado,
        recebidoEm: r.recebidoEm ?? new Date().toISOString(),
        formaPagamento: formaPagamento ?? r.formaPagamento ?? null,
        situacao: 'baixado',
        baixadoPor: 'Gestor (demo)',
        baixadoEm: new Date().toISOString(),
      } : r);
    },
    async devolver(id, motivo) { dados.recebimentos = dados.recebimentos.map((r) => r.id === id ? { ...r, situacao: 'devolvido_para_correcao', observacao: `${r.observacao ? `${r.observacao} · ` : ''}Devolvido: ${motivo}` } : r); },
    async divergencia(id, motivo) { dados.recebimentos = dados.recebimentos.map((r) => r.id === id ? { ...r, situacao: 'baixado', baixadoPor: 'Gestor (demo)', baixadoEm: new Date().toISOString(), observacao: `${r.observacao ? `${r.observacao} · ` : ''}Divergência: ${motivo}` } : r); },
    async estornar(id, motivo) { dados.recebimentos = dados.recebimentos.map((r) => r.id === id ? { ...r, situacao: r.vencimento < hojeIso() ? 'em_atraso' : 'previsto', valorRecebido: null, colaboradorId: null, recebidoEm: null, formaPagamento: null, baixadoPor: null, baixadoEm: null, observacao: `Estornado: ${motivo}` } : r); },
    async obterIntegracaoFinanceira(ano, mes) {
      return copia({ nomeEntrada: nomeEntradaIntegracao, tituloEtiqueta: tituloEtiquetaIntegracao, integrado: integracaoAtiva, valorSincronizado: valorIntegrado(ano, mes) });
    },
    async atualizarTitulosFinanceiro(ano, mes, nomeEntrada, tituloEtiqueta) {
      nomeEntradaIntegracao = nomeEntrada.trim();
      tituloEtiquetaIntegracao = tituloEtiqueta.trim();
      return copia({ nomeEntrada: nomeEntradaIntegracao, tituloEtiqueta: tituloEtiquetaIntegracao, integrado: integracaoAtiva, valorSincronizado: valorIntegrado(ano, mes) });
    },
    async definirIntegracaoFinanceira(ano, mes, ativa) {
      integracaoAtiva = ativa;
      return copia({ nomeEntrada: nomeEntradaIntegracao, tituloEtiqueta: tituloEtiquetaIntegracao, integrado: integracaoAtiva, valorSincronizado: valorIntegrado(ano, mes) });
    },
  };
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
  const diaMes = row.dia_mes == null ? null : numero(row.dia_mes);
  return {
    id: texto(row.id), tipoCadastro, nome: texto(row.nome), endereco: texto(row.endereco), cep: texto(row.cep), logradouro: texto(row.logradouro), bairro: texto(row.bairro), cidade: texto(row.cidade), estado: texto(row.estado), numero: texto(row.numero), complemento: texto(row.complemento),
    responsavel: texto(row.responsavel), telefone: texto(row.telefone), email: texto(row.email),
    valorCombinado: row.valor_combinado == null ? null : numero(row.valor_combinado),
    frequenciaRecebimento: row.frequencia_recebimento == null ? null : texto(row.frequencia_recebimento) as Empresa['frequenciaRecebimento'],
    configuracaoRecorrencia: tipoCadastro === 'cliente_direto' ? { diasSemana: Array.isArray(row.dias_semana) ? row.dias_semana.map(numero) : [], diaMes, mesInicio: row.mes_inicio == null ? null : numero(row.mes_inicio) } : null,
    ativo: row.ativo !== false,
  };
}

function mapSubempresa(row: Linha): Subempresa {
  return {
    id: texto(row.id), empresaId: texto(row.recebimento_empresa_id), nome: texto(row.nome), endereco: texto(row.endereco),
    cep: texto(row.cep), logradouro: texto(row.logradouro), bairro: texto(row.bairro), cidade: texto(row.cidade), estado: texto(row.estado), numero: texto(row.numero), complemento: texto(row.complemento),
    shoppingGaleria: texto(row.shopping_galeria), lojaSala: texto(row.loja_sala), responsavel: texto(row.responsavel),
    valorCombinado: row.valor_combinado == null ? null : numero(row.valor_combinado),
    frequenciaRecebimento: (texto(row.frequencia_recebimento) || 'mensal') as Subempresa['frequenciaRecebimento'],
    configuracaoRecorrencia: {
      diasSemana: Array.isArray(row.dias_semana) ? row.dias_semana.map(numero).filter((dia) => dia >= 0 && dia <= 6) : [],
      diaMes: row.dia_mes == null ? null : numero(row.dia_mes),
      mesInicio: row.mes_inicio == null ? null : numero(row.mes_inicio),
    },
    ativo: row.ativo !== false,
  };
}

function mapColaborador(row: Linha): Colaborador {
  return {
    id: texto(row.user_id), nome: texto(row.nome), celular: texto(row.celular),
    email: texto(row.email_contato), cpf: texto(row.cpf), senha: '', ativo: row.ativo !== false,
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

  return {
    async carregar() {
      // A migration de recorrência pode ainda não ter sido aplicada em um
      // ambiente já publicado. Nesse intervalo, o módulo continua legível;
      // assim que a rotina existir, a sincronização volta a ser automática.
      const { error: erroRecorrencia } = await cliente.rpc('recebimentos_sincronizar_recorrencias', { p_empresa_id: empresaId });
      if (erroRecorrencia && erroRecorrencia.code !== 'PGRST202') {
        throw new Error(erroMensagem(erroRecorrencia, 'Erro ao atualizar as cobranças recorrentes.'));
      }
      const [empresas, subempresas, colaboradores, recebimentos] = await Promise.all([
        exigir(cliente.from('recebimentos_empresas').select('*').eq('empresa_id', empresaId).order('nome'), 'Erro ao carregar empresas.'),
        exigir(cliente.from('recebimentos_subempresas').select('*').eq('empresa_id', empresaId).order('nome'), 'Erro ao carregar subempresas.'),
        exigir(cliente.from('recebimentos_colaboradores').select('*').eq('empresa_id', empresaId).order('nome'), 'Erro ao carregar colaboradores.'),
        carregarTodosRecebimentos(),
      ]);
      return {
        empresas: (empresas as Linha[]).map(mapEmpresa), subempresas: (subempresas as Linha[]).map(mapSubempresa),
        colaboradores: (colaboradores as Linha[]).map(mapColaborador), recebimentos: (recebimentos as Linha[]).map(mapRecebimento),
      };
    },
    async salvarEmpresa(dados) {
      await exigir(cliente.from('recebimentos_empresas').insert({
        empresa_id: empresaId, nome: dados.nome, tipo_cadastro: dados.tipoCadastro, endereco: dados.endereco, cep: dados.cep, logradouro: dados.logradouro, bairro: dados.bairro, cidade: dados.cidade, estado: dados.estado, numero: dados.numero, complemento: dados.complemento, responsavel: dados.responsavel, telefone: dados.telefone, email: dados.email, valor_combinado: dados.valorCombinado, frequencia_recebimento: dados.frequenciaRecebimento, dias_semana: dados.configuracaoRecorrencia?.diasSemana ?? [], dia_mes: dados.configuracaoRecorrencia?.diaMes ?? null, mes_inicio: dados.configuracaoRecorrencia?.mesInicio ?? null, dia_vencimento: dados.configuracaoRecorrencia?.diaMes ?? null, ativo: dados.ativo,
      }).select('id').single(), 'Erro ao cadastrar empresa.');
    },
    async editarEmpresa(id, dados) {
      await exigir(cliente.from('recebimentos_empresas').update({
        nome: dados.nome, tipo_cadastro: dados.tipoCadastro, endereco: dados.endereco, cep: dados.cep, logradouro: dados.logradouro, bairro: dados.bairro, cidade: dados.cidade, estado: dados.estado, numero: dados.numero, complemento: dados.complemento, responsavel: dados.responsavel, telefone: dados.telefone, email: dados.email, valor_combinado: dados.valorCombinado, frequencia_recebimento: dados.frequenciaRecebimento, dias_semana: dados.configuracaoRecorrencia?.diasSemana ?? [], dia_mes: dados.configuracaoRecorrencia?.diaMes ?? null, mes_inicio: dados.configuracaoRecorrencia?.mesInicio ?? null, dia_vencimento: dados.configuracaoRecorrencia?.diaMes ?? null, atualizado_em: new Date().toISOString(),
      }).eq('empresa_id', empresaId).eq('id', id).select('id').single(), 'Erro ao editar empresa.');
    },
    async excluirEmpresa(id) { await exigir(cliente.from('recebimentos_empresas').delete().eq('empresa_id', empresaId).eq('id', id).select('id'), 'Erro ao excluir empresa.'); },
    async alternarEmpresa(id, ativo) { await exigir(cliente.from('recebimentos_empresas').update({ ativo, atualizado_em: new Date().toISOString() }).eq('empresa_id', empresaId).eq('id', id).select('id'), 'Erro ao alterar empresa.'); },
    async salvarSubempresa(dados) {
      await exigir(cliente.from('recebimentos_subempresas').insert({
        empresa_id: empresaId, recebimento_empresa_id: dados.empresaId, nome: dados.nome, endereco: dados.endereco,
        logradouro: dados.logradouro, numero: dados.numero, complemento: dados.complemento,
        cep: dados.cep, bairro: dados.bairro, cidade: dados.cidade, estado: dados.estado,
        shopping_galeria: dados.shoppingGaleria, loja_sala: dados.lojaSala, responsavel: dados.responsavel,
        valor_combinado: dados.valorCombinado, frequencia_recebimento: dados.frequenciaRecebimento,
        dias_semana: dados.configuracaoRecorrencia.diasSemana, dia_mes: dados.configuracaoRecorrencia.diaMes,
        mes_inicio: dados.configuracaoRecorrencia.mesInicio, dia_vencimento: dados.configuracaoRecorrencia.diaMes,
        ativo: dados.ativo,
      }).select('id').single(), 'Erro ao cadastrar subempresa.');
    },
    async editarSubempresa(id, dados) { await exigir(cliente.from('recebimentos_subempresas').update({ nome: dados.nome, endereco: dados.endereco, cep: dados.cep, logradouro: dados.logradouro, bairro: dados.bairro, cidade: dados.cidade, estado: dados.estado, numero: dados.numero, complemento: dados.complemento, responsavel: dados.responsavel, valor_combinado: dados.valorCombinado, frequencia_recebimento: dados.frequenciaRecebimento, dias_semana: dados.configuracaoRecorrencia.diasSemana, dia_mes: dados.configuracaoRecorrencia.diaMes, mes_inicio: dados.configuracaoRecorrencia.mesInicio, dia_vencimento: dados.configuracaoRecorrencia.diaMes, atualizado_em: new Date().toISOString() }).eq('empresa_id', empresaId).eq('id', id).select('id'), 'Erro ao editar subempresa.'); },
    async excluirSubempresa(id) { await exigir(cliente.from('recebimentos_subempresas').delete().eq('empresa_id', empresaId).eq('id', id).select('id'), 'Erro ao excluir subempresa.'); },
    async alternarSubempresa(id, ativo) { await exigir(cliente.from('recebimentos_subempresas').update({ ativo, atualizado_em: new Date().toISOString() }).eq('empresa_id', empresaId).eq('id', id).select('id'), 'Erro ao alterar subempresa.'); },
    async criarColaborador(dados) { await chamarApi(cliente, '/api/recebimentos/criar-colaborador', { empresaId, ...dados }); },
    async editarColaborador(id, dados) {
      await chamarApi(cliente, '/api/recebimentos/atualizar-colaborador', { empresaId, colaboradorUserId: id, ...dados });
      if (dados.senha) await chamarApi(cliente, '/api/recebimentos/redefinir-senha-colaborador', { empresaId, colaboradorUserId: id, novaSenha: dados.senha });
    },
    async excluirColaborador(id) { await chamarApi(cliente, '/api/recebimentos/excluir-colaborador', { empresaId, colaboradorUserId: id }); },
    async alternarColaborador(id, ativo) {
      const { data, error } = await cliente.from('recebimentos_colaboradores').select('nome, cpf, celular, email_contato').eq('empresa_id', empresaId).eq('user_id', id).single();
      if (error || !data) throw new Error('Colaborador não encontrado.');
      await chamarApi(cliente, '/api/recebimentos/atualizar-colaborador', { empresaId, colaboradorUserId: id, nome: data.nome, cpf: data.cpf, celular: data.celular, email: data.email_contato, ativo });
    },
    async registrarRecebimento(empresaRecebimentoId, subempresaId, valor, observacao) {
      const [{ data: alvo, error: erroAlvo }, { data: auth }] = await Promise.all([
        subempresaId
          ? cliente.from('recebimentos_subempresas').select('recebimento_empresa_id, valor_combinado').eq('empresa_id', empresaId).eq('id', subempresaId).single()
          : cliente.from('recebimentos_empresas').select('id, valor_combinado, tipo_cadastro').eq('empresa_id', empresaId).eq('id', empresaRecebimentoId).eq('tipo_cadastro', 'cliente_direto').single(),
        cliente.auth.getUser(),
      ]);
      if (erroAlvo || !alvo || !auth.user) throw new Error('Não foi possível identificar a cobrança.');
      const agora = new Date();
      const vencimento = hojeIso();
      await exigir(cliente.from('recebimentos_lancamentos').insert({
        empresa_id: empresaId, recebimento_empresa_id: subempresaId ? (alvo as { recebimento_empresa_id: string }).recebimento_empresa_id : empresaRecebimentoId, subempresa_id: subempresaId,
        colaborador_user_id: auth.user.id, vencimento, valor_combinado: alvo.valor_combinado, valor_recebido: valor,
        recebido_em: agora.toISOString(), observacao: observacao.trim() || null,
        situacao: situacaoPorValor(Number(alvo.valor_combinado), valor),
      }).select('id').single(), 'Erro ao registrar recebimento.');
    },
    async receberCobranca(id, valor, observacao) {
      const { data: auth } = await cliente.auth.getUser();
      if (!auth.user) throw new Error('Sessão não encontrada.');
      const { data: atual, error } = await cliente.from('recebimentos_lancamentos').select('valor_combinado').eq('empresa_id', empresaId).eq('id', id).single();
      if (error || !atual) throw new Error('Cobrança não encontrada.');
      await exigir(cliente.from('recebimentos_lancamentos').update({ colaborador_user_id: auth.user.id, valor_recebido: valor, recebido_em: new Date().toISOString(), observacao: observacao.trim() || null, situacao: situacaoPorValor(Number(atual.valor_combinado), valor), atualizado_em: new Date().toISOString() }).eq('empresa_id', empresaId).eq('id', id).select('id'), 'Erro ao receber cobrança.');
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
        .subscribe();
      return () => { void cliente.removeChannel(canal); };
    },
  };
}

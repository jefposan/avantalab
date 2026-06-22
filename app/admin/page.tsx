'use client';

import { useMemo, useState } from 'react';

type Feedback = {
  id: string;
  empresa_id: string | null;
  usuario_id: string | null;
  acesso_id: string | null;
  nome_empresa: string | null;
  nome_usuario: string | null;
  email_usuario: string | null;
  tipo: 'sugestao' | 'duvida' | 'reclamacao' | 'avaliacao';
  mensagem: string;
  status: 'novo' | 'em_analise' | 'respondido' | 'arquivado';
  created_at: string;
};

function formatarTipo(tipo: string) {
  if (tipo === 'sugestao') return 'Sugestão';
  if (tipo === 'duvida') return 'Dúvida';
  if (tipo === 'reclamacao') return 'Reclamação';
  if (tipo === 'avaliacao') return 'Avaliação';

  return 'Feedback';
}

function formatarStatus(status: string) {
  if (status === 'novo') return 'Novo';
  if (status === 'em_analise') return 'Em análise';
  if (status === 'respondido') return 'Resolvido';
  if (status === 'arquivado') return 'Arquivado';

  return status;
}

function formatarData(data: string) {
  if (!data) return '-';

  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(data));
}

function getClasseTipo(tipo: string) {
  if (tipo === 'sugestao') {
    return 'border-sky-200 bg-sky-50 text-sky-800';
  }

  if (tipo === 'duvida') {
    return 'border-emerald-200 bg-emerald-50 text-emerald-800';
  }

  if (tipo === 'reclamacao') {
    return 'border-red-200 bg-red-50 text-red-800';
  }

  if (tipo === 'avaliacao') {
    return 'border-violet-200 bg-violet-50 text-violet-800';
  }

  return 'border-slate-200 bg-slate-50 text-slate-700';
}

function getClasseStatus(status: string) {
  if (status === 'novo') {
    return 'border-emerald-200 bg-emerald-50 text-emerald-800';
  }

  if (status === 'em_analise') {
    return 'border-amber-200 bg-amber-50 text-amber-800';
  }

  if (status === 'respondido') {
    return 'border-emerald-300 bg-emerald-100 text-emerald-900';
  }

  if (status === 'arquivado') {
    return 'border-slate-200 bg-slate-100 text-slate-600';
  }

  return 'border-slate-200 bg-slate-50 text-slate-700';
}

export default function PaginaAdminFeedbacks() {
  const [token, setToken] = useState('');
  const [acessoLiberado, setAcessoLiberado] = useState(false);
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState('');
  const [feedbackAtualizandoId, setFeedbackAtualizandoId] = useState<string | null>(
    null
  );
  const [filtroTipo, setFiltroTipo] = useState<
    'todos' | 'sugestao' | 'duvida' | 'reclamacao' | 'avaliacao'
  >('todos');

  const [novidadeTitulo, setNovidadeTitulo] = useState('Novidade no AvantaLab');
  const [novidadeMensagem, setNovidadeMensagem] = useState('');
  const [enviandoNovidade, setEnviandoNovidade] = useState(false);
  const [resultadoNovidade, setResultadoNovidade] = useState('');

  const dispararNovidade = async () => {
    const tokenLimpo = token.trim();
    const mensagem = novidadeMensagem.trim();
    const titulo = novidadeTitulo.trim() || 'Novidade';

    if (!mensagem) {
      setResultadoNovidade('Digite a mensagem.');
      return;
    }

    if (!window.confirm('Enviar este aviso para TODOS os usuários?')) return;

    setEnviandoNovidade(true);
    setResultadoNovidade('');

    try {
      const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || '') + '/functions/v1/broadcast';
      const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
      const resposta = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: anon,
          Authorization: `Bearer ${anon}`,
        },
        body: JSON.stringify({ token: tokenLimpo, titulo, corpo: mensagem }),
      });
      const dados = await resposta.json();

      if (!resposta.ok || !dados.ok) {
        setResultadoNovidade(dados.erro || 'Não foi possível enviar.');
      } else {
        setResultadoNovidade(
          `Enviado! Avisos criados: ${dados.usuarios}, notificações push: ${dados.enviados}.`
        );
        setNovidadeMensagem('');
      }
    } catch {
      setResultadoNovidade('Erro ao enviar.');
    } finally {
      setEnviandoNovidade(false);
    }
  };

  const feedbacksFiltrados = useMemo(() => {
    if (filtroTipo === 'todos') return feedbacks;

    return feedbacks.filter((feedback) => feedback.tipo === filtroTipo);
  }, [feedbacks, filtroTipo]);

  const totalNovos = feedbacks.filter(
    (feedback) => feedback.status === 'novo'
  ).length;

  const totalResolvidos = feedbacks.filter(
    (feedback) => feedback.status === 'respondido'
  ).length;

  const carregarFeedbacks = async (tokenInformado = token) => {
    const tokenLimpo = tokenInformado.trim();

    if (!tokenLimpo) {
      setErro('Informe a senha administrativa para acessar.');
      return;
    }

    setCarregando(true);
    setErro('');

    try {
      const resposta = await fetch('/api/admin-feedbacks', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${tokenLimpo}`,
        },
      });

      const dados = await resposta.json().catch(() => null);

      if (!resposta.ok || dados?.erro) {
        setAcessoLiberado(false);
        setFeedbacks([]);
        setErro(dados?.mensagem || 'Não foi possível carregar os feedbacks.');
        return;
      }

      setFeedbacks(dados.feedbacks || []);
      setAcessoLiberado(true);
    } catch (error) {
      console.error('Erro ao carregar feedbacks:', error);
      setAcessoLiberado(false);
      setFeedbacks([]);
      setErro('Erro inesperado ao carregar os feedbacks.');
    } finally {
      setCarregando(false);
    }
  };

  const atualizarStatusFeedback = async (
    feedbackId: string,
    novoStatus: 'novo' | 'em_analise' | 'respondido' | 'arquivado'
  ) => {
    const tokenLimpo = token.trim();

    if (!tokenLimpo) {
      setErro('Sessão administrativa expirada. Faça login novamente.');
      setAcessoLiberado(false);
      return;
    }

    setFeedbackAtualizandoId(feedbackId);
    setErro('');

    try {
      const resposta = await fetch('/api/admin-feedbacks', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenLimpo}`,
        },
        body: JSON.stringify({
          id: feedbackId,
          status: novoStatus,
        }),
      });

      const dados = await resposta.json().catch(() => null);

      if (!resposta.ok || dados?.erro) {
        setErro(dados?.mensagem || 'Não foi possível atualizar o feedback.');
        return;
      }

      setFeedbacks((feedbacksAtuais) =>
        feedbacksAtuais.map((feedback) =>
          feedback.id === feedbackId
            ? {
                ...feedback,
                status: novoStatus,
              }
            : feedback
        )
      );
    } catch (error) {
      console.error('Erro ao atualizar status do feedback:', error);
      setErro('Erro inesperado ao atualizar o feedback.');
    } finally {
      setFeedbackAtualizandoId(null);
    }
  };

  const sair = () => {
    setToken('');
    setAcessoLiberado(false);
    setFeedbacks([]);
    setErro('');
    setFiltroTipo('todos');
  };

  return (
    <main className="min-h-screen bg-slate-50 px-5 pb-4 text-slate-800">
      <div className="mx-auto max-w-5xl pt-4">
        <header className="fixed left-0 right-0 top-0 z-50 bg-slate-50/95 px-5 py-3 backdrop-blur">
  <div className="mx-auto max-w-5xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg">
          <div className="flex flex-col gap-3 border-b border-slate-100 bg-gradient-to-r from-slate-950 via-sky-950 to-cyan-800 px-5 py-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan-200">
                AvantaLab Admin
              </p>

              <h1 className="mt-1 text-xl font-black tracking-tight text-white">
                Feedbacks recebidos
              </h1>

              <p className="mt-1 max-w-2xl text-xs leading-snug text-sky-100/80">
                Área administrativa para visualizar mensagens enviadas pelo chat
                do sistema.
              </p>
            </div>

            {acessoLiberado && (
              <button
                type="button"
                onClick={sair}
                className="rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-xs font-black uppercase tracking-wide text-white transition hover:bg-white/20"
              >
                Sair
              </button>
            )}
          </div>

          {acessoLiberado && (
            <div className="grid gap-3 bg-white p-3 md:grid-cols-4">
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-[10px] font-black uppercase tracking-wide text-slate-500">
                  Total
                </p>
                <p className="mt-0.5 text-2xl font-black text-slate-900">
                  {feedbacks.length}
                </p>
              </div>

              <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
                <p className="text-[10px] font-black uppercase tracking-wide text-emerald-700">
                  Novos
                </p>
                <p className="mt-0.5 text-2xl font-black text-emerald-800">
                  {totalNovos}
                </p>
              </div>

              <div className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-3">
                <p className="text-[10px] font-black uppercase tracking-wide text-sky-700">
                  Exibindo
                </p>
                <p className="mt-0.5 text-2xl font-black text-sky-800">
                  {feedbacksFiltrados.length}
                </p>
              </div>

              <div className="rounded-xl border border-emerald-300 bg-emerald-100 px-4 py-3">
                <p className="text-[10px] font-black uppercase tracking-wide text-emerald-800">
                  Resolvidos
                </p>
                <p className="mt-0.5 text-2xl font-black text-emerald-900">
                  {totalResolvidos}
                </p>
              </div>
            </div>
          )}
          </div>
</header>

<div className={acessoLiberado ? 'h-[220px]' : 'h-[145px]'} />

        {!acessoLiberado && (
          <section className="mx-auto max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-lg">
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-sky-50 text-xl font-black text-sky-700">
              A
            </div>

            <h2 className="text-lg font-black text-slate-900">
              Acesso administrativo
            </h2>

            <p className="mt-1 text-sm leading-relaxed text-slate-500">
              Informe a senha administrativa para carregar os feedbacks do
              AvantaLab.
            </p>

            <div className="mt-4">
              <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-slate-500">
                Senha administrativa
              </label>

              <input
                type="password"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    carregarFeedbacks();
                  }
                }}
                placeholder="Digite a senha"
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-sky-600 focus:ring-2 focus:ring-sky-600/20"
              />
            </div>

            {erro && (
              <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                {erro}
              </div>
            )}

            <button
              type="button"
              onClick={() => carregarFeedbacks()}
              disabled={carregando}
              className="mt-4 w-full rounded-xl bg-sky-700 px-5 py-2.5 text-xs font-black uppercase tracking-wide text-white shadow-lg shadow-sky-900/20 transition hover:bg-sky-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {carregando ? 'Carregando...' : 'Acessar feedbacks'}
            </button>
          </section>
        )}

        {acessoLiberado && (
          <>
            <section className="mb-5 rounded-2xl border border-slate-200 bg-white p-4 shadow">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                Comunicação
              </p>
              <h2 className="mt-0.5 text-lg font-black text-slate-900">
                Disparar aviso para usuários
              </h2>
              <p className="mt-0.5 text-xs text-slate-500">
                Envia notificação push e aviso no sininho (mobile e web) para todos os usuários.
              </p>
              <div className="mt-3 grid gap-2">
                <input
                  value={novidadeTitulo}
                  onChange={(e) => setNovidadeTitulo(e.target.value)}
                  placeholder="Título (ex: Novidade!)"
                  className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-bold text-slate-800 outline-none transition focus:border-sky-600 focus:ring-2 focus:ring-sky-600/20"
                />
                <textarea
                  value={novidadeMensagem}
                  onChange={(e) => setNovidadeMensagem(e.target.value)}
                  rows={3}
                  placeholder="Mensagem curta..."
                  className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-sky-600 focus:ring-2 focus:ring-sky-600/20"
                />
                <button
                  type="button"
                  onClick={dispararNovidade}
                  disabled={enviandoNovidade}
                  className="rounded-xl bg-sky-700 px-5 py-2.5 text-xs font-black uppercase tracking-wide text-white shadow-lg shadow-sky-900/20 transition hover:bg-sky-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {enviandoNovidade ? 'Enviando...' : 'Disparar para todos'}
                </button>
                {resultadoNovidade && (
                  <p className="text-xs font-bold text-slate-600">{resultadoNovidade}</p>
                )}
              </div>
            </section>

            <section className="mb-5 rounded-2xl border border-slate-200 bg-white p-4 shadow">
              <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                    Filtros
                  </p>

                  <h2 className="mt-0.5 text-lg font-black text-slate-900">
                    Lista de feedbacks
                  </h2>

                  <p className="mt-0.5 text-xs text-slate-500">
                    Visualize as mensagens recebidas do mais recente para o mais
                    antigo.
                  </p>
                </div>

                <div className="flex flex-col gap-2 sm:flex-row">
                  <select
                    value={filtroTipo}
                    onChange={(e) =>
                      setFiltroTipo(
                        e.target.value as
                          | 'todos'
                          | 'sugestao'
                          | 'duvida'
                          | 'reclamacao'
                          | 'avaliacao'
                      )
                    }
                    className="min-w-[210px] rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-bold text-slate-800 outline-none transition focus:border-sky-600 focus:ring-2 focus:ring-sky-600/20"
                  >
                    <option value="todos">Todos os tipos</option>
                    <option value="sugestao">Sugestões</option>
                    <option value="duvida">Dúvidas</option>
                    <option value="reclamacao">Reclamações</option>
                    <option value="avaliacao">Avaliações</option>
                  </select>

                  <button
                    type="button"
                    onClick={() => carregarFeedbacks()}
                    disabled={carregando}
                    className="rounded-xl border border-slate-300 bg-slate-900 px-4 py-2.5 text-xs font-black uppercase tracking-wide text-white transition hover:bg-slate-800 disabled:opacity-60"
                  >
                    {carregando ? 'Atualizando...' : 'Atualizar'}
                  </button>
                </div>
              </div>
            </section>

            {erro && (
              <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                {erro}
              </div>
            )}

            {feedbacksFiltrados.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-500 shadow">
                Nenhum feedback encontrado para este filtro.
              </div>
            ) : (
              <div className="grid gap-3">
                {feedbacksFiltrados.map((feedback) => (
                  <article
                    key={feedback.id}
                    className={`overflow-hidden rounded-2xl border shadow transition ${
                      feedback.status === 'respondido'
                        ? 'border-emerald-300 bg-emerald-50 shadow-emerald-900/10'
                        : 'border-slate-200 bg-white'
                    }`}
                  >
                    <div
                      className={`flex flex-col gap-3 border-b px-4 py-3 md:flex-row md:items-start md:justify-between ${
                        feedback.status === 'respondido'
                          ? 'border-emerald-200 bg-emerald-100/70'
                          : 'border-slate-100 bg-slate-50'
                      }`}
                    >
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ${getClasseTipo(
                              feedback.tipo
                            )}`}
                          >
                            {formatarTipo(feedback.tipo)}
                          </span>

                          <span
                            className={`rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ${getClasseStatus(
                              feedback.status
                            )}`}
                          >
                            {formatarStatus(feedback.status)}
                          </span>
                        </div>

                        <h2 className="mt-2 text-base font-black text-slate-900">
                          {feedback.nome_empresa || 'Empresa não informada'}
                        </h2>

                        <p className="mt-0.5 text-xs text-slate-500">
                          Usuário:{' '}
                          <span className="font-bold text-slate-800">
                            {feedback.nome_usuario || 'Não informado'}
                          </span>
                          {feedback.email_usuario && (
                            <>
                              {' '}
                              ·{' '}
                              <span className="text-slate-500">
                                {feedback.email_usuario}
                              </span>
                            </>
                          )}
                        </p>
                      </div>

                      <p className="text-xs font-semibold text-slate-500">
                        {formatarData(feedback.created_at)}
                      </p>
                    </div>

                    <div className="p-4">
                      <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">
                          Mensagem
                        </p>

                        {feedback.status === 'respondido' ? (
                          <button
                            type="button"
                            onClick={() =>
                              atualizarStatusFeedback(feedback.id, 'novo')
                            }
                            disabled={feedbackAtualizandoId === feedback.id}
                            className="rounded-full border border-emerald-300 bg-white px-3.5 py-1.5 text-[10px] font-black uppercase tracking-wide text-emerald-700 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {feedbackAtualizandoId === feedback.id
                              ? 'Atualizando...'
                              : 'Reabrir'}
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() =>
                              atualizarStatusFeedback(
                                feedback.id,
                                'respondido'
                              )
                            }
                            disabled={feedbackAtualizandoId === feedback.id}
                            className="rounded-full border border-emerald-300 bg-emerald-600 px-3.5 py-1.5 text-[10px] font-black uppercase tracking-wide text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {feedbackAtualizandoId === feedback.id
                              ? 'Atualizando...'
                              : 'Marcar como resolvido'}
                          </button>
                        )}
                      </div>

                      {feedback.status === 'respondido' && (
                        <div className="mb-3 rounded-xl border border-emerald-200 bg-emerald-100 px-3 py-2 text-xs font-bold text-emerald-800">
                          Este feedback já foi marcado como resolvido.
                        </div>
                      )}

                      <div className="rounded-xl border border-slate-200 bg-white p-3">
                        <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
                          {feedback.mensagem}
                        </p>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
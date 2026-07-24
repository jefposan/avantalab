'use client';

import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import styles from '../recebimentos.module.css';
import type { Colaborador, Recebimento } from './types';
import { aguardandoConferencia, cpfValido, formatarCpf, formatarMoeda, formatarNomeProprio, formatarTelefone } from './helpers';
import CampoSenha from './CampoSenha';

type DadosColaborador = Omit<Colaborador, 'id' | 'ativo'>;

type Props = {
  colaboradores: Colaborador[];
  recebimentos: Recebimento[];
  onAdicionar: (dados: Omit<Colaborador, 'id'>) => void;
  onEditar: (id: string, dados: DadosColaborador) => void;
  onExcluir: (id: string) => void;
  onAlternar: (id: string) => void;
  mostrarLinkAcesso?: boolean;
  /** Destino no platô do AvantaCard para a ação principal. */
  portalAcoesId?: string;
};

function IconeAcoes() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" width="15" height="15" aria-hidden="true">
      <circle cx="12" cy="5" r="1.8" />
      <circle cx="12" cy="12" r="1.8" />
      <circle cx="12" cy="19" r="1.8" />
    </svg>
  );
}

export default function ListaColaboradores({ colaboradores, recebimentos, onAdicionar, onEditar, onExcluir, onAlternar, mostrarLinkAcesso = false, portalAcoesId }: Props) {
  // Formulário aberto para cadastro (novo) ou edição (id).
  const [formAberto, setFormAberto] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [acoesAbertas, setAcoesAbertas] = useState<Record<string, boolean>>({});
  const [confirmandoExclusao, setConfirmandoExclusao] = useState(false);
  const [erro, setErro] = useState('');
  const [linkCopiado, setLinkCopiado] = useState(false);
  const [portalAcoes, setPortalAcoes] = useState<HTMLElement | null>(null);

  const [nome, setNome] = useState('');
  const [celular, setCelular] = useState('');
  const [email, setEmail] = useState('');
  const [cpf, setCpf] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');

  useEffect(() => {
    if (!portalAcoesId) return;
    setPortalAcoes(document.getElementById(portalAcoesId));
  }, [portalAcoesId]);

  const totais = useMemo(() => {
    const map: Record<string, { recebido: number; aguardando: number }> = {};
    for (const c of colaboradores) map[c.id] = { recebido: 0, aguardando: 0 };
    for (const r of recebimentos) {
      if (!r.colaboradorId || !map[r.colaboradorId]) continue;
      map[r.colaboradorId].recebido += r.valorRecebido ?? 0;
      if (aguardandoConferencia(r.situacao)) map[r.colaboradorId].aguardando += r.valorRecebido ?? 0;
    }
    return map;
  }, [colaboradores, recebimentos]);

  function limparForm() {
    setNome(''); setCelular(''); setEmail(''); setCpf(''); setSenha(''); setConfirmarSenha('');
    setErro('');
    setConfirmandoExclusao(false);
    setFormAberto(false);
    setEditandoId(null);
  }

  function abrirNovo() {
    setNome(''); setCelular(''); setEmail(''); setCpf(''); setSenha(''); setConfirmarSenha('');
    setErro('');
    setConfirmandoExclusao(false);
    setEditandoId(null);
    setFormAberto(true);
  }

  function abrirEdicao(c: Colaborador) {
    setNome(c.nome); setCelular(c.celular); setEmail(c.email); setCpf(formatarCpf(c.cpf));
    setSenha(c.senha); setConfirmarSenha(c.senha);
    setErro('');
    setConfirmandoExclusao(false);
    setEditandoId(c.id);
    setFormAberto(true);
    setAcoesAbertas({});
  }

  function alternarAcoes(id: string) {
    setAcoesAbertas((p) => ({ ...p, [id]: !p[id] }));
  }

  function salvar() {
    setErro('');
    // Todos os campos são obrigatórios.
    if (!nome.trim() || !celular.trim() || !email.trim() || !cpf.trim() || !senha.trim() || !confirmarSenha.trim()) {
      return setErro('Preencha todos os campos: nome, CPF, celular, e-mail, senha e confirmação.');
    }
    // O CPF é o login do colaborador no PWA — precisa ser válido.
    if (!cpfValido(cpf)) {
      return setErro('Informe um CPF válido (ele será o login do colaborador).');
    }
    if (senha !== confirmarSenha) {
      return setErro('A senha e a confirmação não coincidem.');
    }
    const dados: DadosColaborador = {
      nome: nome.trim(),
      celular: celular.trim(),
      email: email.trim(),
      cpf: cpf.replace(/\D/g, ''),
      senha: senha.trim(),
    };
    if (editandoId) {
      onEditar(editandoId, dados);
    } else {
      onAdicionar({ ...dados, ativo: true });
    }
    limparForm();
  }

  function excluirEmEdicao() {
    if (!editandoId) return;
    if (!confirmandoExclusao) return setConfirmandoExclusao(true);
    onExcluir(editandoId);
    limparForm();
  }

  function formulario(edicao: boolean) {
    return (
      <div className={`${styles.subItem} ${styles.formCompacto} ${styles.blocoEditando}`} style={{ marginBottom: 10 }}>
        <div className={styles.formTitulo}>{edicao ? 'Editar colaborador' : 'Novo colaborador'}</div>
        {/* 1ª linha: nome. */}
        <div className={styles.field}><label className={styles.label}>Nome *</label><input className={styles.input} placeholder="Ex: João Silva" value={nome} onChange={(e) => setNome(formatarNomeProprio(e.target.value))} /></div>
        {/* 2ª linha: CPF (login), senha e confirmação. */}
        <div style={{ display: 'flex', gap: 8 }}>
          <div className={styles.field} style={{ flex: 1 }}><label className={styles.label}>CPF (login) *</label><input className={`${styles.input} ${styles.inputCentro}`} inputMode="numeric" placeholder="000.000.000-00" value={cpf} onChange={(e) => setCpf(formatarCpf(e.target.value))} /></div>
          <div className={styles.field} style={{ flex: 1 }}>
            <label className={styles.label} htmlFor="recebimentos-colaborador-senha">Senha *</label>
            <CampoSenha
              id="recebimentos-colaborador-senha"
              name="recebimentos-nova-senha"
              autoComplete={edicao ? 'current-password' : 'new-password'}
              placeholder="Digite a senha"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
            />
          </div>
          <div className={styles.field} style={{ flex: 1 }}>
            <label className={styles.label} htmlFor="recebimentos-colaborador-confirmar-senha">Confirmar senha *</label>
            <CampoSenha
              id="recebimentos-colaborador-confirmar-senha"
              autoComplete="new-password"
              placeholder="Repita a senha"
              value={confirmarSenha}
              onChange={(e) => setConfirmarSenha(e.target.value)}
            />
          </div>
        </div>
        {/* 3ª linha: celular, e-mail e ações. */}
        <div className={styles.linhaTelefoneAcoes}>
          <div className={styles.field} style={{ flex: '1 1 130px', marginBottom: 0 }}>
            <label className={styles.label}>Celular *</label>
            <input className={styles.input} inputMode="tel" placeholder="(11) 99999-9999" value={celular} onChange={(e) => setCelular(formatarTelefone(e.target.value))} />
          </div>
          <div className={styles.field} style={{ flex: '1 1 160px', marginBottom: 0 }}>
            <label className={styles.label}>E-mail *</label>
            <input className={styles.input} placeholder="Ex: joao@empresa.com.br" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className={styles.acoesForm}>
            <button type="button" className={`${styles.btn} ${styles.btnGhost} ${styles.btnSm}`} onClick={limparForm}>
              Cancelar
            </button>
            {edicao && (
              <button type="button" className={`${styles.btn} ${styles.btnDanger} ${styles.btnExcluir} ${styles.btnSm}`} onClick={excluirEmEdicao}>
                {confirmandoExclusao ? 'Confirmar' : 'Excluir'}
              </button>
            )}
            <button type="button" className={`${styles.btn} ${styles.btnPrimary} ${styles.btnSm}`} onClick={salvar}>
              Salvar
            </button>
          </div>
        </div>
        {erro && <div className={styles.aviso} style={{ marginTop: 8 }}>{erro}</div>}
      </div>
    );
  }

  const acaoTopo = (
    <div className={styles.listaTopoAcoes}>
      <button
        type="button"
        className={`${styles.btn} ${styles.btnPrimary} ${styles.listaAcaoPrincipal}`}
        onClick={() => (formAberto && !editandoId ? limparForm() : abrirNovo())}
      >
        {formAberto && !editandoId ? 'Fechar cadastro' : '+ Novo colaborador'}
      </button>
    </div>
  );

  return (
    <div className={styles.listaShell}>
      <div className={styles.listaTopo}>
        <h3 className={styles.sectionTitle} style={{ margin: 0 }}>Colaboradores</h3>
        {!portalAcoes && acaoTopo}
      </div>
      {portalAcoes && createPortal(acaoTopo, portalAcoes)}

      {mostrarLinkAcesso && (
        <div className={styles.linkAcessoBox}>
          <div className={styles.linkAcessoLinhaTitulo}>
            <div className={styles.linkAcessoTitulo}>Link de acesso dos colaboradores</div>
            <button
              type="button"
              className={`${styles.btn} ${styles.btnGhost} ${styles.btnSm} ${styles.linkAcessoCopiar}`}
              onClick={async () => {
                await navigator.clipboard.writeText('https://avantalab.com.br/recebimentos/colaborador');
                setLinkCopiado(true);
                window.setTimeout(() => setLinkCopiado(false), 1800);
              }}
            >
              {linkCopiado ? 'COPIADO' : 'COPIAR'}
            </button>
          </div>
          <div>
            <div className={styles.linkAcessoUrl}>https://avantalab.com.br/recebimentos/colaborador</div>
            <div className={styles.subMeta}>Entram com CPF e senha · mesmo link para todas as empresas.</div>
          </div>
        </div>
      )}

      {/* Apenas esta área rola; o topo acima é estático (imune ao elástico). */}
      <div className={styles.listaRolavel}>
        {formAberto && !editandoId && formulario(false)}

        {colaboradores.map((c) => {
          const editandoEste = formAberto && editandoId === c.id;
          const t = totais[c.id] ?? { recebido: 0, aguardando: 0 };
          return (
            <div key={c.id} className={`${styles.subItem} ${styles.blocoFoco} ${editandoEste ? styles.blocoEditando : ''}`}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center' }}>
                <div style={{ minWidth: 0 }}>
                  <div className={styles.subNome}>{c.nome}</div>
                  <div className={styles.subMeta}>{c.celular} · CPF {formatarCpf(c.cpf)}</div>
                  <div className={styles.subMeta}>Recebido: {formatarMoeda(t.recebido)} · Aguardando: {formatarMoeda(t.aguardando)}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                  <span className={`${styles.chip} ${c.ativo ? styles.chipOn : styles.chipOff}`}>{c.ativo ? 'Ativo' : 'Inativo'}</span>
                  <div className={`${styles.acoesGrupo} ${acoesAbertas[c.id] ? styles.acoesGrupoAberto : ''}`}>
                    <div className={styles.acoesBotoes}>
                      <button type="button" className={`${styles.btn} ${styles.btnGhost} ${styles.btnXs}`} onClick={() => abrirEdicao(c)}>
                        Editar
                      </button>
                      <button type="button" className={`${styles.btn} ${styles.btnGhost} ${styles.btnXs}`} onClick={() => onAlternar(c.id)}>
                        {c.ativo ? 'Desativar' : 'Ativar'}
                      </button>
                    </div>
                    <button type="button" className={styles.acoesTrigger} onClick={() => alternarAcoes(c.id)} aria-label={`Ações de ${c.nome}`}>
                      <IconeAcoes />
                    </button>
                  </div>
                </div>
              </div>
              {editandoEste && <div style={{ marginTop: 8 }}>{formulario(true)}</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

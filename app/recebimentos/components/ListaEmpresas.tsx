'use client';

import { useMemo, useRef, useState } from 'react';
import styles from '../recebimentos.module.css';
import type { Empresa, Subempresa } from './types';
import {
  formatarMoeda,
  formatarNomeProprio,
  formatarTelefone,
  formatarValorInput,
  parseValorBR,
  valorParaInput,
} from './helpers';

type DadosEmpresa = Omit<Empresa, 'id' | 'ativo'>;
type DadosSubempresa = Pick<Subempresa, 'nome' | 'endereco' | 'responsavel' | 'valorCombinado' | 'diaVencimento'>;

type Props = {
  empresas: Empresa[];
  subempresas: Subempresa[];
  onAdicionarEmpresa: (dados: Omit<Empresa, 'id'>) => void;
  onEditarEmpresa: (id: string, dados: DadosEmpresa) => void;
  onExcluirEmpresa: (id: string) => void;
  onAlternarEmpresa: (id: string) => void;
  onAdicionarSubempresa: (dados: Omit<Subempresa, 'id'>) => void;
  onEditarSubempresa: (id: string, dados: DadosSubempresa) => void;
  onExcluirSubempresa: (id: string) => void;
  onAlternarSubempresa: (id: string) => void;
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

export default function ListaEmpresas({
  empresas,
  subempresas,
  onAdicionarEmpresa,
  onEditarEmpresa,
  onExcluirEmpresa,
  onAlternarEmpresa,
  onAdicionarSubempresa,
  onEditarSubempresa,
  onExcluirSubempresa,
  onAlternarSubempresa,
}: Props) {
  const [expandidas, setExpandidas] = useState<Record<string, boolean>>({});
  // Formulário de empresa: aberto para cadastro (novo) ou edição (id).
  const [formEmpresaAberto, setFormEmpresaAberto] = useState(false);
  const [editandoEmpresaId, setEditandoEmpresaId] = useState<string | null>(null);
  // Formulário de subempresa: empresa dona + id em edição (null = novo).
  const [subDe, setSubDe] = useState<string | null>(null);
  const [editandoSubId, setEditandoSubId] = useState<string | null>(null);
  // Grupo de ações aberto por toque (além do hover).
  const [acoesAbertas, setAcoesAbertas] = useState<Record<string, boolean>>({});
  // Exclusão em duas etapas dentro do formulário de edição.
  const [confirmandoExclusao, setConfirmandoExclusao] = useState(false);
  // Busca fixa com filtro instantâneo.
  const [busca, setBusca] = useState('');
  const [erroEmpresa, setErroEmpresa] = useState('');
  const [erroSub, setErroSub] = useState('');

  // Referências dos blocos para rolar a empresa em edição ao topo do scroll.
  const blocosRef = useRef<Record<string, HTMLDivElement | null>>({});

  // Form empresa — todos os campos obrigatórios.
  const [eNome, setENome] = useState('');
  const [eResp, setEResp] = useState('');
  const [eTel, setETel] = useState('');
  const [eEmail, setEEmail] = useState('');

  // Form subempresa — todos os campos obrigatórios.
  const [sNome, setSNome] = useState('');
  const [sEndereco, setSEndereco] = useState('');
  const [sResp, setSResp] = useState('');
  const [sValor, setSValor] = useState('');
  const [sVenc, setSVenc] = useState('');

  const termo = busca.trim().toLowerCase();

  // Filtro instantâneo por letras/números: empresa (nome, responsável,
  // telefone, e-mail) e subempresas (nome, endereço, responsável).
  const empresasFiltradas = useMemo(() => {
    if (!termo) return empresas;
    return empresas.filter((emp) => {
      const alvoEmpresa = `${emp.nome} ${emp.responsavel} ${emp.telefone} ${emp.email}`.toLowerCase();
      if (alvoEmpresa.includes(termo)) return true;
      return subempresas.some(
        (s) => s.empresaId === emp.id && `${s.nome} ${s.endereco} ${s.responsavel}`.toLowerCase().includes(termo),
      );
    });
  }, [empresas, subempresas, termo]);

  function subsVisiveis(empresaId: string) {
    const subs = subempresas.filter((s) => s.empresaId === empresaId);
    if (!termo) return subs;
    const empresa = empresas.find((e) => e.id === empresaId);
    const empresaBate = empresa
      ? `${empresa.nome} ${empresa.responsavel} ${empresa.telefone} ${empresa.email}`.toLowerCase().includes(termo)
      : false;
    if (empresaBate) return subs;
    return subs.filter((s) => `${s.nome} ${s.endereco} ${s.responsavel}`.toLowerCase().includes(termo));
  }

  // Rola o bloco da empresa para o topo do corpo rolável, com fôlego para
  // não encostar no cabeçalho (scroll-margin-top no CSS).
  function focarBloco(empresaId: string) {
    window.setTimeout(() => {
      blocosRef.current[empresaId]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 40);
  }

  function alternarAcoes(id: string, ev: React.MouseEvent) {
    ev.stopPropagation();
    setAcoesAbertas((p) => ({ ...p, [id]: !p[id] }));
  }

  function limparFormEmpresa() {
    setENome(''); setEResp(''); setETel(''); setEEmail('');
    setErroEmpresa('');
    setConfirmandoExclusao(false);
    setFormEmpresaAberto(false);
    setEditandoEmpresaId(null);
  }

  function limparFormSub() {
    setSNome(''); setSEndereco(''); setSResp(''); setSValor(''); setSVenc('');
    setErroSub('');
    setConfirmandoExclusao(false);
    setSubDe(null);
    setEditandoSubId(null);
  }

  function abrirNovaEmpresa() {
    limparFormSub();
    setENome(''); setEResp(''); setETel(''); setEEmail('');
    setErroEmpresa('');
    setConfirmandoExclusao(false);
    setEditandoEmpresaId(null);
    setFormEmpresaAberto(true);
  }

  function abrirEdicaoEmpresa(emp: Empresa) {
    limparFormSub();
    setENome(emp.nome); setEResp(emp.responsavel); setETel(emp.telefone); setEEmail(emp.email);
    setErroEmpresa('');
    setConfirmandoExclusao(false);
    setEditandoEmpresaId(emp.id);
    setFormEmpresaAberto(true);
    setAcoesAbertas({});
    // A empresa em edição passa a ser o foco da lista.
    focarBloco(emp.id);
  }

  function abrirNovaSub(empresaId: string) {
    limparFormEmpresa();
    setSNome(''); setSEndereco(''); setSResp(''); setSValor(''); setSVenc('');
    setErroSub('');
    setConfirmandoExclusao(false);
    setEditandoSubId(null);
    setSubDe(empresaId);
  }

  function abrirEdicaoSub(s: Subempresa) {
    limparFormEmpresa();
    setSNome(s.nome);
    setSEndereco(s.endereco);
    setSResp(s.responsavel);
    setSValor(valorParaInput(s.valorCombinado));
    setSVenc(String(s.diaVencimento));
    setErroSub('');
    setConfirmandoExclusao(false);
    setEditandoSubId(s.id);
    setSubDe(s.empresaId);
    setExpandidas((p) => ({ ...p, [s.empresaId]: true }));
    setAcoesAbertas({});
    focarBloco(s.empresaId);
  }

  function salvarEmpresa() {
    setErroEmpresa('');
    // Todos os campos são obrigatórios.
    if (!eNome.trim() || !eResp.trim() || !eTel.trim() || !eEmail.trim()) {
      return setErroEmpresa('Preencha todos os campos: nome, responsável, telefone e e-mail.');
    }
    const dados: DadosEmpresa = { nome: eNome.trim(), responsavel: eResp.trim(), telefone: eTel.trim(), email: eEmail.trim() };
    if (editandoEmpresaId) {
      onEditarEmpresa(editandoEmpresaId, dados);
    } else {
      onAdicionarEmpresa({ ...dados, ativo: true });
    }
    limparFormEmpresa();
  }

  // Exclusão em duas etapas: o primeiro clique pede confirmação no próprio botão.
  function excluirEmpresaEmEdicao() {
    if (!editandoEmpresaId) return;
    if (!confirmandoExclusao) return setConfirmandoExclusao(true);
    onExcluirEmpresa(editandoEmpresaId);
    limparFormEmpresa();
  }

  function excluirSubEmEdicao() {
    if (!editandoSubId) return;
    if (!confirmandoExclusao) return setConfirmandoExclusao(true);
    onExcluirSubempresa(editandoSubId);
    limparFormSub();
  }

  function salvarSub(empresaId: string) {
    setErroSub('');
    const valor = parseValorBR(sValor);
    const venc = Number(sVenc.replace(/\D/g, ''));
    // Todos os campos são obrigatórios.
    if (!sNome.trim() || !sEndereco.trim() || !sResp.trim() || !sValor.trim() || !sVenc.trim()) {
      return setErroSub('Preencha todos os campos: nome, endereço, responsável, valor e dia de vencimento.');
    }
    if (Number.isNaN(valor) || valor <= 0) return setErroSub('Informe um valor combinado maior que zero.');
    if (!Number.isInteger(venc) || venc < 1 || venc > 31) return setErroSub('Informe um dia de vencimento entre 1 e 31.');

    const dados: DadosSubempresa = {
      nome: sNome.trim(),
      endereco: sEndereco.trim(),
      responsavel: sResp.trim(),
      valorCombinado: valor,
      diaVencimento: venc,
    };
    if (editandoSubId) {
      onEditarSubempresa(editandoSubId, dados);
    } else {
      onAdicionarSubempresa({
        empresaId,
        ...dados,
        logradouro: '', numero: '', complemento: '', shoppingGaleria: '', lojaSala: '',
        ativo: true,
      });
    }
    limparFormSub();
  }

  function formEmpresa(edicao: boolean) {
    return (
      <div className={`${styles.subItem} ${styles.formCompacto} ${styles.blocoEditando}`} style={{ marginBottom: 10 }}>
        <div className={styles.formTitulo}>{edicao ? 'Editar empresa' : 'Nova empresa'}</div>
        <div className={styles.field}><label className={styles.label}>Nome *</label><input className={styles.input} placeholder="Ex: Shopping Morumbi" value={eNome} onChange={(e) => setENome(formatarNomeProprio(e.target.value))} /></div>
        <div className={styles.field}><label className={styles.label}>Responsável *</label><input className={styles.input} placeholder="Ex: Carla Menezes" value={eResp} onChange={(e) => setEResp(formatarNomeProprio(e.target.value))} /></div>
        {/* Telefone, e-mail e as ações na mesma linha. */}
        <div className={styles.linhaTelefoneAcoes}>
          <div className={styles.field} style={{ flex: '1 1 130px', marginBottom: 0 }}>
            <label className={styles.label}>Telefone *</label>
            <input className={styles.input} inputMode="tel" placeholder="(11) 99999-9999" value={eTel} onChange={(e) => setETel(formatarTelefone(e.target.value))} />
          </div>
          <div className={styles.field} style={{ flex: '1 1 160px', marginBottom: 0 }}>
            <label className={styles.label}>E-mail *</label>
            <input className={styles.input} placeholder="Ex: financeiro@empresa.com.br" value={eEmail} onChange={(e) => setEEmail(e.target.value)} />
          </div>
          <div className={styles.acoesForm}>
            <button type="button" className={`${styles.btn} ${styles.btnGhost} ${styles.btnSm}`} onClick={limparFormEmpresa}>
              Cancelar
            </button>
            {edicao && (
              <button type="button" className={`${styles.btn} ${styles.btnDanger} ${styles.btnSm}`} onClick={excluirEmpresaEmEdicao}>
                {confirmandoExclusao ? 'Confirmar' : 'Excluir'}
              </button>
            )}
            <button type="button" className={`${styles.btn} ${styles.btnPrimary} ${styles.btnSm}`} onClick={salvarEmpresa}>
              Salvar
            </button>
          </div>
        </div>
        {erroEmpresa && <div className={styles.aviso} style={{ marginTop: 8 }}>{erroEmpresa}</div>}
      </div>
    );
  }

  return (
    <div className={styles.listaShell}>
      <div className={styles.listaTopo}>
        <h3 className={styles.sectionTitle} style={{ margin: 0 }}>Empresas e subempresas</h3>
        <div className={styles.listaTopoAcoes}>
          {/* Busca fixa, sempre visível: filtra a cada letra ou número. */}
          <div className={styles.buscaFixa}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} width="13" height="13" aria-hidden="true">
              <circle cx="11" cy="11" r="7" />
              <path strokeLinecap="round" d="m20 20-3.4-3.4" />
            </svg>
            <input
              className={styles.buscaFixaInput}
              placeholder="Pesquisar…"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              aria-label="Pesquisar empresas e subempresas"
            />
            {busca && (
              <button type="button" className={styles.buscaLimpar} onClick={() => setBusca('')} aria-label="Limpar pesquisa">
                ×
              </button>
            )}
          </div>
          <button type="button" className={`${styles.btn} ${styles.btnPrimary} ${styles.btnSm}`} onClick={() => (formEmpresaAberto && !editandoEmpresaId ? limparFormEmpresa() : abrirNovaEmpresa())}>
            + Nova empresa
          </button>
        </div>
      </div>

      {/* Apenas esta área rola; o topo acima é estático (imune ao elástico). */}
      <div className={styles.listaRolavel}>
      {formEmpresaAberto && !editandoEmpresaId && formEmpresa(false)}

      {termo && empresasFiltradas.length === 0 && (
        <p className={styles.muted}>Nenhum resultado para “{busca.trim()}”.</p>
      )}

      {empresasFiltradas.map((emp) => {
        const subs = subsVisiveis(emp.id);
        const totalSubs = subempresas.filter((s) => s.empresaId === emp.id).length;
        const aberta = termo ? true : (expandidas[emp.id] ?? true);
        const editandoEsta = formEmpresaAberto && editandoEmpresaId === emp.id;
        return (
          <div
            key={emp.id}
            ref={(el) => { blocosRef.current[emp.id] = el; }}
            className={`${styles.empresaBloco} ${styles.blocoFoco} ${editandoEsta ? styles.blocoEditando : ''}`}
          >
            <div className={styles.empresaHeader} onClick={() => setExpandidas((p) => ({ ...p, [emp.id]: !aberta }))}>
              <span style={{ transform: aberta ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s', color: '#64748b', fontSize: 12 }}>▸</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className={styles.empresaNome}>{emp.nome}</div>
                <div className={styles.subMeta}>{emp.responsavel} · {emp.telefone} · {totalSubs} subempresa(s)</div>
              </div>
              <span className={`${styles.chip} ${emp.ativo ? styles.chipOn : styles.chipOff}`}>{emp.ativo ? 'Ativo' : 'Inativo'}</span>
              {/* Ações ocultas: surgem deslizando para a esquerda no hover/toque. */}
              <div
                className={`${styles.acoesGrupo} ${acoesAbertas[emp.id] ? styles.acoesGrupoAberto : ''}`}
                onClick={(ev) => ev.stopPropagation()}
              >
                <div className={styles.acoesBotoes}>
                  <button type="button" className={`${styles.btn} ${styles.btnGhost} ${styles.btnXs}`} onClick={() => abrirEdicaoEmpresa(emp)}>
                    Editar
                  </button>
                  <button type="button" className={`${styles.btn} ${styles.btnGhost} ${styles.btnXs}`} onClick={() => onAlternarEmpresa(emp.id)}>
                    {emp.ativo ? 'Desativar' : 'Ativar'}
                  </button>
                </div>
                <button type="button" className={styles.acoesTrigger} onClick={(ev) => alternarAcoes(emp.id, ev)} aria-label={`Ações de ${emp.nome}`}>
                  <IconeAcoes />
                </button>
              </div>
            </div>

            {editandoEsta && <div style={{ padding: '8px 12px 10px' }}>{formEmpresa(true)}</div>}

            {aberta && (
              <div className={styles.subLista}>
                {subs.map((s) =>
                  editandoSubId === s.id && subDe === emp.id ? (
                    <div key={s.id} className={`${styles.subItem} ${styles.formCompacto} ${styles.blocoEditando}`}>
                      <div className={styles.formTitulo}>Editar subempresa</div>
                      <div className={styles.field}><label className={styles.label}>Nome da subempresa *</label><input className={styles.input} placeholder="Ex: Loja Renner" value={sNome} onChange={(e) => setSNome(formatarNomeProprio(e.target.value))} /></div>
                      <div className={styles.field}><label className={styles.label}>Endereço/localização *</label><input className={styles.input} placeholder="Ex: Av. Roque Petroni Jr, 1089 — L112" value={sEndereco} onChange={(e) => setSEndereco(e.target.value)} /></div>
                      <div className={styles.field}><label className={styles.label}>Responsável *</label><input className={styles.input} placeholder="Ex: Gerente da loja" value={sResp} onChange={(e) => setSResp(formatarNomeProprio(e.target.value))} /></div>
                      {/* Valor combinado, dia de vencimento e ações na mesma linha. */}
                      <div className={styles.linhaTelefoneAcoes}>
                        <div className={styles.field} style={{ flex: '1 1 110px', marginBottom: 0 }}>
                          <label className={styles.label}>Valor combinado *</label>
                          <input className={`${styles.input} ${styles.inputCentro}`} inputMode="decimal" placeholder="0,00" value={sValor} onChange={(e) => setSValor(formatarValorInput(e.target.value))} />
                        </div>
                        <div className={styles.field} style={{ flex: '1 1 96px', marginBottom: 0 }}>
                          <label className={styles.label}>Dia de vencimento *</label>
                          <div className={styles.inputSufixoWrap}>
                            <input className={styles.inputInterno} inputMode="numeric" placeholder="11" value={sVenc} onChange={(e) => setSVenc(e.target.value.replace(/\D/g, '').slice(0, 2))} />
                            <span className={styles.inputSufixo}>/mm</span>
                          </div>
                        </div>
                        <div className={styles.acoesForm}>
                          <button type="button" className={`${styles.btn} ${styles.btnGhost} ${styles.btnSm}`} onClick={limparFormSub}>Cancelar</button>
                          <button type="button" className={`${styles.btn} ${styles.btnDanger} ${styles.btnSm}`} onClick={excluirSubEmEdicao}>
                            {confirmandoExclusao ? 'Confirmar' : 'Excluir'}
                          </button>
                          <button type="button" className={`${styles.btn} ${styles.btnPrimary} ${styles.btnSm}`} onClick={() => salvarSub(emp.id)}>Salvar</button>
                        </div>
                      </div>
                      {erroSub && <div className={styles.aviso} style={{ marginTop: 8 }}>{erroSub}</div>}
                    </div>
                  ) : (
                    <div key={s.id} className={styles.subItem}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center' }}>
                        <div style={{ minWidth: 0 }}>
                          <div className={styles.subNome}>{s.nome}</div>
                          <div className={styles.subMeta}>{s.endereco}</div>
                          <div className={styles.subMeta}>Responsável: {s.responsavel} · Venc. dia {s.diaVencimento} · {formatarMoeda(s.valorCombinado)}</div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                          <span className={`${styles.chip} ${s.ativo ? styles.chipOn : styles.chipOff}`}>{s.ativo ? 'Ativo' : 'Inativo'}</span>
                          <div className={`${styles.acoesGrupo} ${acoesAbertas[s.id] ? styles.acoesGrupoAberto : ''}`}>
                            <div className={styles.acoesBotoes}>
                              <button type="button" className={`${styles.btn} ${styles.btnGhost} ${styles.btnXs}`} onClick={() => abrirEdicaoSub(s)}>
                                Editar
                              </button>
                              <button type="button" className={`${styles.btn} ${styles.btnGhost} ${styles.btnXs}`} onClick={() => onAlternarSubempresa(s.id)}>
                                {s.ativo ? 'Desativar' : 'Ativar'}
                              </button>
                            </div>
                            <button type="button" className={styles.acoesTrigger} onClick={(ev) => alternarAcoes(s.id, ev)} aria-label={`Ações de ${s.nome}`}>
                              <IconeAcoes />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ),
                )}

                {subDe === emp.id && !editandoSubId ? (
                  <div className={`${styles.subItem} ${styles.formCompacto}`} style={{ background: '#f8fafc' }}>
                    <div className={styles.formTitulo}>Nova subempresa</div>
                    <div className={styles.field}><label className={styles.label}>Nome da subempresa *</label><input className={styles.input} placeholder="Ex: Loja Renner" value={sNome} onChange={(e) => setSNome(formatarNomeProprio(e.target.value))} /></div>
                    <div className={styles.field}><label className={styles.label}>Endereço/localização *</label><input className={styles.input} placeholder="Ex: Av. Roque Petroni Jr, 1089 — L112" value={sEndereco} onChange={(e) => setSEndereco(e.target.value)} /></div>
                    <div className={styles.field}><label className={styles.label}>Responsável *</label><input className={styles.input} placeholder="Ex: Gerente da loja" value={sResp} onChange={(e) => setSResp(formatarNomeProprio(e.target.value))} /></div>
                    {/* Valor combinado, dia de vencimento e ações na mesma linha. */}
                    <div className={styles.linhaTelefoneAcoes}>
                      <div className={styles.field} style={{ flex: '1 1 110px', marginBottom: 0 }}>
                        <label className={styles.label}>Valor combinado *</label>
                        <input className={`${styles.input} ${styles.inputCentro}`} inputMode="decimal" placeholder="0,00" value={sValor} onChange={(e) => setSValor(formatarValorInput(e.target.value))} />
                      </div>
                      <div className={styles.field} style={{ flex: '1 1 96px', marginBottom: 0 }}>
                        <label className={styles.label}>Dia de vencimento *</label>
                        <div className={styles.inputSufixoWrap}>
                          <input className={styles.inputInterno} inputMode="numeric" placeholder="11" value={sVenc} onChange={(e) => setSVenc(e.target.value.replace(/\D/g, '').slice(0, 2))} />
                          <span className={styles.inputSufixo}>/mm</span>
                        </div>
                      </div>
                      <div className={styles.acoesForm}>
                        <button type="button" className={`${styles.btn} ${styles.btnGhost} ${styles.btnSm}`} onClick={limparFormSub}>Cancelar</button>
                        <button type="button" className={`${styles.btn} ${styles.btnPrimary} ${styles.btnSm}`} onClick={() => salvarSub(emp.id)}>Salvar</button>
                      </div>
                    </div>
                    {erroSub && <div className={styles.aviso} style={{ marginTop: 8 }}>{erroSub}</div>}
                  </div>
                ) : subDe !== emp.id ? (
                  <button type="button" className={`${styles.btn} ${styles.btnPrimary} ${styles.btnXs}`} style={{ justifySelf: 'end' }} onClick={() => abrirNovaSub(emp.id)}>
                    + Nova subempresa
                  </button>
                ) : null}
              </div>
            )}
          </div>
        );
      })}
      </div>
    </div>
  );
}

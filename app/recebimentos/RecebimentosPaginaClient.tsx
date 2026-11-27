'use client';
import SeletorModulos from '@/app/components/SeletorModulos';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { destinoInicioModulo } from '@/app/lib/retorno-modulos';
import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import RodapeAvanta from '@/app/components/RodapeAvanta';
import AberturaModulo, { useAvisarModuloPronto } from '@/app/components/AberturaModulo';
import TransicaoNavegacaoInterna from '@/app/components/TransicaoNavegacaoInterna';
import { AdaptiveModuleLogo, ModuleHeaderNavigation } from '@/app/components/ModuloHeader';
import { solicitarRetornoAoModuloHospedeiro, type ContextoNavegacaoModulo } from '@/app/lib/navegacao-modulos';
import { supabase } from '@/app/lib/supabase';
import { Icon } from '@/app/projetos/components/Icon';
import { criarRepoSupabase } from './data/repo';
import AjustesOperacoesCampo from './components/AjustesOperacoesCampo';
import RecebimentosClient from './RecebimentosClient';
import styles from './recebimentos.module.css';

type AcessoRecebimentos = {
  empresa: { id: string; nome: string; corPrimaria: string; temaEscuro: boolean; logoUrl?: string };
  perfil: 'gestor_master' | 'administrador' | 'operador_completo' | 'operador_simples';
  podeGerenciarModulo: boolean;
};

export default function RecebimentosPaginaClient({ empresaId, initialContext }: { empresaId: string; initialContext?: ContextoNavegacaoModulo | null }) {
  const router = useRouter();
  const [contextoInicial] = useState(() => initialContext ?? null);
  const [acesso, setAcesso] = useState<AcessoRecebimentos | null>(() => contextoInicial?.podeGerenciarModulo ? {
    empresa: { id: contextoInicial.empresaId, ...contextoInicial.empresa },
    perfil: contextoInicial.perfil,
    podeGerenciarModulo: contextoInicial.podeGerenciarModulo,
  } : null);
  const [erro, setErro] = useState('');
  const [acessoConfirmado, setAcessoConfirmado] = useState(false);
  const [dadosIniciaisProntos, setDadosIniciaisProntos] = useState(false);
  useAvisarModuloPronto('recebimentos_presencial', empresaId, Boolean(erro));
  const [ajustesAbertos, setAjustesAbertos] = useState(false);
  const [operacaoEmAndamento, setOperacaoEmAndamento] = useState(false);

  useEffect(() => {
    let ativo = true;
    async function verificarAcesso() {
      if (!empresaId) {
        router.replace('/gestao?abrirModulo=recebimentos_presencial');
        return;
      }
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) {
        if (ativo) setErro('Sua sessão não está disponível. Volte ao AvantaLab e entre novamente.');
        return;
      }
      const resposta = await fetch(`/api/modulos/acesso?empresaId=${encodeURIComponent(empresaId)}&moduloId=recebimentos_presencial`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      });
      const dados = await resposta.json().catch(() => ({}));
      if (!ativo) return;
      if (!resposta.ok) {
        setErro(dados.mensagem || 'Não foi possível abrir Operações de Campo.');
        return;
      }
      if (!['gestor_master', 'administrador'].includes(String(dados.perfil))) {
        setErro('Seu perfil possui acesso somente de visualização a este módulo.');
        return;
      }
      setAcesso(dados as AcessoRecebimentos);
      setAcessoConfirmado(true);
    }
    void verificarAcesso().catch(() => { if (ativo) setErro('Não foi possível consultar o acesso a Operações de Campo.'); });
    return () => { ativo = false; };
  }, [contextoInicial, empresaId, router]);

  const empresaDoRepo = acesso?.empresa.id;
  const repo = useMemo(() => empresaDoRepo ? criarRepoSupabase(empresaDoRepo) : null, [empresaDoRepo]);
  const inicioHref = empresaId ? `/gestao?inicio=1&empresaId=${encodeURIComponent(empresaId)}` : '/gestao';

  useEffect(() => {
    router.prefetch(empresaId ? destinoInicioModulo(empresaId) : inicioHref);
  }, [inicioHref, empresaId, router]);

  if (erro) return (
    <main className={styles.acessoModuloEstado}>
      <section>
        <span aria-hidden="true">◇</span>
        <h1>Operações de Campo</h1>
        <p>{erro}</p>
        <Link href={inicioHref}>‹ Início</Link>
      </section>
    </main>
  );
  if (!acesso || !repo) {
    return <TransicaoNavegacaoInterna destino="Operações de Campo" />;
  }

  const retornarInicio = () => {
    if (solicitarRetornoAoModuloHospedeiro()) return;
    router.push(empresaId ? destinoInicioModulo(empresaId) : inicioHref);
  };

  return (
    <AberturaModulo key={empresaId} modulo="recebimentos_presencial" titulo="Operações de Campo" empresaId={empresaId} pronta={acessoConfirmado && dadosIniciaisProntos}>
    <main
      className={`${styles.paginaModulo} ${acesso.empresa.temaEscuro ? styles.paginaModuloEscura : ''}`}
      style={{ '--cp': acesso.empresa.corPrimaria } as CSSProperties}
    >
      <header className={styles.cabecalhoModulo}>
        <ModuleHeaderNavigation title="Operações de Campo" corPrimaria={acesso.empresa.corPrimaria} darkMode={acesso.empresa.temaEscuro}>
        {empresaId ? <SeletorModulos compact empresaId={empresaId} moduloAtual="recebimentos_presencial" corPrimaria={acesso.empresa.corPrimaria} darkMode={acesso.empresa.temaEscuro} ocupado={operacaoEmAndamento} /> : <button type="button" onClick={retornarInicio} className={styles.botaoInicio} aria-label="Voltar ao início do AvantaLab"><Icon name="back" size={16} /> Início</button>}
        </ModuleHeaderNavigation>
        <div className={styles.identidadeModulo}>
          {acesso.empresa.logoUrl
            ? <AdaptiveModuleLogo key={acesso.empresa.logoUrl} src={acesso.empresa.logoUrl} alt={acesso.empresa.nome} className={styles.logoEmpresaModulo} />
            : <span className={styles.nomeEmpresaModulo}>{acesso.empresa.nome}</span>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifySelf: 'end' }}>
          <button type="button" className={styles.botaoAjustes} onClick={() => setAjustesAbertos(true)} aria-label="Abrir ajustes de Operações de Campo" title="Ajustes">⚙</button>
        </div>
      </header>
      <section className={styles.areaModulo} aria-labelledby="recebimentos-pagina-titulo">
        <div className={styles.tituloPaginaModulo}>
          <div className={styles.tituloPaginaModuloTexto}>
            <h1 id="recebimentos-pagina-titulo">Operações de Campo</h1>
          </div>
        </div>
        <div className={styles.workspaceModulo}>
          <RecebimentosClient
            repo={repo}
            integrado
            perfilInicial={acesso.perfil === 'administrador' ? 'administrador' : 'gestor'}
            darkMode={acesso.empresa.temaEscuro}
            corPrimaria={acesso.empresa.corPrimaria}
            nomeEmpresa={acesso.empresa.nome}
            mostrarLinkColaboradores
            rascunhoEscopo={`pagina:${acesso.empresa.id}`}
            onBusyChange={setOperacaoEmAndamento}
            onAberturaConcluida={setDadosIniciaisProntos}
          />
        </div>
      </section>
      <RodapeAvanta darkMode={acesso.empresa.temaEscuro} />
      <AjustesOperacoesCampo
        aberto={ajustesAbertos}
        empresaId={acesso.empresa.id}
        repo={repo}
        temaEscuro={acesso.empresa.temaEscuro}
        onFechar={() => setAjustesAbertos(false)}
        onTemaAtualizado={(temaEscuro) => setAcesso((atual) => atual ? { ...atual, empresa: { ...atual.empresa, temaEscuro } } : atual)}
      />
    </main>
    </AberturaModulo>
  );
}

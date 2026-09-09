'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import TelaCarregandoAcesso from '@/app/components/TelaCarregandoAcesso';
import { supabase } from '@/app/lib/supabase';
import { criarRepoSupabase } from './data/repo';
import RecebimentosClient from './RecebimentosClient';
import styles from './recebimentos.module.css';

type AcessoRecebimentos = {
  empresa: { id: string; nome: string; corPrimaria: string; temaEscuro: boolean };
  perfil: 'gestor_master' | 'administrador' | 'operador_completo' | 'operador_simples';
  podeGerenciarModulo: boolean;
};

export default function RecebimentosPaginaClient({ empresaId }: { empresaId: string }) {
  const router = useRouter();
  const [acesso, setAcesso] = useState<AcessoRecebimentos | null>(null);
  const [erro, setErro] = useState('');

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
    }
    void verificarAcesso();
    return () => { ativo = false; };
  }, [empresaId, router]);

  const repo = useMemo(() => acesso ? criarRepoSupabase(acesso.empresa.id) : null, [acesso]);
  const inicioHref = empresaId ? `/gestao?empresaId=${encodeURIComponent(empresaId)}` : '/gestao';

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
  if (!acesso || !repo) return <TelaCarregandoAcesso titulo="Validando acesso" mensagem="Confirmando o módulo e seu perfil…" />;

  return (
    <main
      className={`${styles.paginaModulo} ${acesso.empresa.temaEscuro ? styles.paginaModuloEscura : ''}`}
      style={{ '--cp': acesso.empresa.corPrimaria } as CSSProperties}
    >
      <header className={styles.cabecalhoModulo}>
        <Link href={inicioHref} className={styles.botaoInicio} aria-label="Voltar ao início do AvantaLab">‹ Início</Link>
        <div className={styles.identidadeModulo}>
          <Image src="/images/logo-avantalab-oficial.png" alt="AvantaLab — Do zero ao operacional" width={160} height={40} priority className={styles.logoModulo} />
          <span>{acesso.empresa.nome} · Operações de Campo</span>
        </div>
        <Link href={inicioHref} className={styles.botaoAjustes} aria-label="Abrir Ajustes no AvantaLab" title="Ajustes">⚙</Link>
      </header>
      <section className={styles.areaModulo} aria-labelledby="recebimentos-pagina-titulo">
        <div className={styles.tituloPaginaModulo}>
          <div>
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
            mostrarLinkColaboradores
            rascunhoEscopo={`pagina:${acesso.empresa.id}`}
          />
        </div>
      </section>
    </main>
  );
}

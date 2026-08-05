'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import styles from './PontoFacialExperienceV2.module.css';

export type EtapaFacialV2 = 'carregando' | 'preparacao' | 'captura' | 'processando' | 'sucesso' | 'erro';

type Props = {
  etapa: EtapaFacialV2;
  tipo: 'cadastro' | 'marcacao';
  mensagem: string;
  orientacao: string;
  progresso: number;
  horario?: string;
  detector?: ReactNode;
  onIniciar: () => void;
  onCancelar: () => void;
  onTentarNovamente: () => void;
  onContinuar: () => void;
};

function ShieldIcon({ className = '' }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M12 3 5 6v5c0 4.6 2.8 8 7 10 4.2-2 7-5.4 7-10V6l-7-3Z"/><path strokeLinecap="round" strokeLinejoin="round" d="m9.3 12 1.8 1.8 3.8-4"/></svg>;
}

function ArrowLeftIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="m15 18-6-6 6-6M9 12h11"/></svg>;
}

function FaceIcon() {
  return <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true"><path strokeLinecap="round" d="M10 18v-5a3 3 0 0 1 3-3h5m12 0h5a3 3 0 0 1 3 3v5M10 30v5a3 3 0 0 0 3 3h5m12 0h5a3 3 0 0 0 3-3v-5"/><ellipse cx="24" cy="24" rx="8" ry="10"/><path strokeLinecap="round" d="M20 23h.01M28 23h.01M21 28c2 1.5 4 1.5 6 0"/></svg>;
}

function PersonIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" aria-hidden="true"><circle cx="12" cy="8" r="3.5"/><path strokeLinecap="round" d="M5.5 20c.5-4.2 2.7-6.3 6.5-6.3s6 2.1 6.5 6.3"/></svg>;
}

function SunIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><circle cx="12" cy="12" r="3.5"/><path strokeLinecap="round" d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3m-2.8-6.7-2.1 2.1M7.4 16.6l-2.1 2.1m0-13.4 2.1 2.1m9.2 9.2 2.1 2.1"/></svg>;
}

function GlassesIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="m3 10 1.2-4h3.3l1.1 4m6.8 0 1.1-4h3.3l1.2 4M9 11h6"/><circle cx="6.5" cy="13" r="3.5"/><circle cx="17.5" cy="13" r="3.5"/></svg>;
}

function CheckIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="m5 12 4.2 4.2L19 6.5"/></svg>;
}

function ClockIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" aria-hidden="true"><circle cx="12" cy="12" r="8.5"/><path strokeLinecap="round" d="M12 7.5V12l3 2"/></svg>;
}

function Cabecalho({ onVoltar }: { onVoltar: () => void }) {
  return <header className={styles.header}>
    <button type="button" className={styles.backButton} onClick={onVoltar} aria-label="Voltar ao Controle de Ponto"><ArrowLeftIcon /></button>
    <span className={styles.secureBadge}><ShieldIcon />Ponto seguro</span>
  </header>;
}

const orientacoes = [
  { titulo: 'Centralize seu rosto', texto: 'Posicione seu rosto dentro do oval.', icone: <PersonIcon /> },
  { titulo: 'Ambiente iluminado', texto: 'Prefira locais bem iluminados.', icone: <SunIcon /> },
  { titulo: 'Sem acessórios', texto: 'Evite óculos escuros, bonés ou máscaras.', icone: <GlassesIcon /> },
];

export default function PontoFacialExperienceV2({ etapa, tipo, mensagem, orientacao, progresso, horario, detector, onIniciar, onCancelar, onTentarNovamente, onContinuar }: Props) {
  const cadastro = tipo === 'cadastro';
  const shellRef = useRef<HTMLElement>(null);

  useEffect(() => {
    shellRef.current?.focus();
  }, [etapa]);

  useEffect(() => {
    const fecharComEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && etapa !== 'processando' && etapa !== 'sucesso') onCancelar();
    };
    document.addEventListener('keydown', fecharComEscape);
    return () => document.removeEventListener('keydown', fecharComEscape);
  }, [etapa, onCancelar]);

  return <div className={styles.overlay} role="dialog" aria-modal="true" aria-labelledby="facial-v2-titulo">
    <span className={styles.backgroundLayer} aria-hidden="true" />
    <main ref={shellRef} className={styles.shell} tabIndex={-1}>
      {(etapa === 'preparacao' || etapa === 'captura') && <Cabecalho onVoltar={onCancelar} />}

      {etapa === 'preparacao' && <>
        <section className={styles.preparation}>
          <div className={styles.preparationIntro}>
            <span className={styles.faceBadge}><FaceIcon /></span>
            <h1 id="facial-v2-titulo">Validação <em>facial</em></h1>
            <p>{cadastro ? 'Vamos atualizar seu reconhecimento facial com segurança.' : 'Precisamos confirmar sua identidade antes de registrar o ponto.'}</p>
          </div>

          <div className={styles.faceGuide} aria-hidden="true">
            <span className={styles.guideCorner} data-position="top-left" />
            <span className={styles.guideCorner} data-position="top-right" />
            <span className={styles.guideCorner} data-position="bottom-left" />
            <span className={styles.guideCorner} data-position="bottom-right" />
            <div className={styles.silhouette}><span /><i /></div>
          </div>

          <div className={styles.tips}>
            {orientacoes.map((item) => <article className={styles.tip} key={item.titulo}><span>{item.icone}</span><div><h2>{item.titulo}</h2><p>{item.texto}</p></div></article>)}
          </div>
        </section>
        <footer className={styles.actions}>
          <button type="button" className={styles.primaryButton} onClick={onIniciar}>Iniciar verificação <span aria-hidden="true">→</span></button>
          <button type="button" className={styles.secondaryButton} onClick={onCancelar}>Cancelar</button>
        </footer>
      </>}

      {etapa === 'captura' && <section className={styles.capture}>
        <div className={styles.captureIntro}>
          <span className={styles.scanBadge}><FaceIcon /></span>
          <h1 id="facial-v2-titulo">Capturando</h1>
          <p role="status" aria-live="polite">{orientacao || 'Centralize seu rosto'}</p>
          <div className={styles.progressTrack} aria-label="Progresso da validação"><span style={{ width: `${Math.max(8, Math.min(100, progresso))}%` }} /></div>
        </div>
        <div className={styles.cameraHalo}>
          <div className={styles.cameraOval}>{detector}</div>
        </div>
        <div className={styles.captureFooter}>
          <div className={styles.feedbackCard}><span><ShieldIcon /></span><div><strong>Processando sua verificação...</strong><small>{orientacao === 'Excelente' ? 'Captura adequada' : 'Não mova o rosto'}</small></div></div>
          <button type="button" className={styles.secondaryButton} onClick={onCancelar}>Cancelar</button>
        </div>
      </section>}

      {(etapa === 'carregando' || etapa === 'processando') && <section className={styles.centerState}>
        <span className={styles.processingIcon}><ShieldIcon /><i /></span>
        <h1 id="facial-v2-titulo">{etapa === 'carregando' ? 'Preparando verificação' : 'Confirmando identidade'}</h1>
        <p role="status" aria-live="polite">{mensagem || 'Aguarde só um instante.'}</p>
        <div className={styles.progressTrack}><span style={{ width: `${progresso}%` }} /></div>
      </section>}

      {etapa === 'sucesso' && <section className={styles.resultState}>
        <div className={styles.successCard}>
          <span className={styles.successIcon}><CheckIcon /></span>
          <div className={styles.successCopy}><h1 id="facial-v2-titulo">Verificação realizada com sucesso!</h1><p>{cadastro ? 'Seu reconhecimento facial foi atualizado.' : 'Seu ponto será registrado.'}</p></div>
          {horario && <span className={styles.timeBadge}><ClockIcon />{horario}</span>}
          <button type="button" className={styles.primaryButton} onClick={onContinuar}>Continuar</button>
        </div>
      </section>}

      {etapa === 'erro' && <section className={styles.resultState}>
        <div className={styles.errorCard}>
          <span className={styles.errorIcon}><FaceIcon /></span>
          <h1 id="facial-v2-titulo">Vamos tentar novamente</h1>
          <p role="alert">{mensagem || 'Não conseguimos identificar seu rosto. Centralize-se no oval e tente novamente.'}</p>
          <button type="button" className={styles.primaryButton} onClick={onTentarNovamente}>Tentar novamente</button>
          <button type="button" className={styles.secondaryButton} onClick={onCancelar}>Cancelar</button>
        </div>
      </section>}
    </main>
  </div>;
}

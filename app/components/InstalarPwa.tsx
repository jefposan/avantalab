'use client';
import {useId,useRef} from 'react';
import BotaoAcaoCompacto from './BotaoAcaoCompacto';
import type {EstadoInstalacaoPwa} from '@/app/hooks/useInstalacaoPwa';
import styles from './InstalarPwa.module.css';

export default function InstalarPwa({nome,estado,rotuloBotao}:{nome:string;estado:EstadoInstalacaoPwa;rotuloBotao?:string}){
  const trigger=useRef<HTMLButtonElement>(null);
  const instructionsId=useId();
  if(!estado.ready||estado.installed)return null;
  const close=()=>{estado.closeInstructions();requestAnimationFrame(()=>trigger.current?.focus());};
  return <aside className={styles.install} aria-label={`Instalar ${nome}`} onKeyDown={e=>{if(e.key==='Escape'&&estado.instructions){e.preventDefault();close();}}}>
    <BotaoAcaoCompacto ref={trigger} className={styles.button} disabled={estado.busy} aria-expanded={estado.instructions} aria-controls={instructionsId} onClick={()=>void estado.install()}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 3v12m-4-4 4 4 4-4M5 19h14"/></svg>
      {estado.busy?'Abrindo instalação…':rotuloBotao||`Instalar ${nome}`} 
    </BotaoAcaoCompacto>
    {estado.instructions&&<section id={instructionsId} className={styles.instructions} aria-label="Instruções de instalação">
      {estado.platform!=='android'&&<><h2>Instalar no iPhone</h2><ol><li>Abra este link no <strong>Safari</strong>.</li><li>Toque em <strong>Compartilhar</strong> (pelo menu da página, se necessário) e em <strong>Adicionar à Tela de Início</strong>.</li><li>Ative <strong>Abrir como App da Web</strong>, se aparecer, e toque em <strong>Adicionar</strong>.</li></ol><p>Se a opção não aparecer, procure em Editar Ações. Em navegador de outro aplicativo, abra o link no Safari.</p></>}
      {estado.platform!=='ios'&&<><h2>Instalar no Android</h2><ol><li>Abra o link no <strong>Chrome</strong>.</li><li>Toque no menu <strong>⋮</strong> e escolha <strong>Instalar app</strong> ou <strong>Adicionar à tela inicial</strong>.</li><li>Confirme a instalação. Se já estiver instalado, abra pelo ícone da tela inicial.</li></ol>{estado.platform==='desktop'&&<p>No computador, use a opção Instalar aplicativo no menu ou na barra de endereços do navegador.</p>}</>}
      <BotaoAcaoCompacto onClick={close}>Entendi</BotaoAcaoCompacto>
    </section>}
    {estado.error&&<p className={styles.error} role="alert">{estado.error}</p>}
    {estado.message&&<p role="status">{estado.message}</p>}
  </aside>;
}

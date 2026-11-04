'use client';

import { Icon } from '@/app/projetos/components/Icon';
import { useEffect, useRef, useState } from 'react';
import BotaoAcaoCompacto from '@/app/components/BotaoAcaoCompacto';
import { observeSearchShortcutFooter } from './search-shortcut-footer';
import { scrollToMarketplacePanel } from './scroll-panel-row';
import styles from './marketplaces.module.css';
import { recolherProdutoEmFoco } from '@/app/lib/foco-produto';

export type ProductSearchHandle = { focusSearch: () => void };

export default function ProductSearchShortcut({ onClick }: { onClick: () => void }) {
  const navigation = useRef<HTMLElement>(null);
  const [temporarilyHidden, setTemporarilyHidden] = useState(false);
  useEffect(() => navigation.current ? observeSearchShortcutFooter(navigation.current) : undefined, []);
  useEffect(() => {
    if (!temporarilyHidden) return;
    const timer = window.setTimeout(() => setTemporarilyHidden(false), 30_000);
    return () => window.clearTimeout(timer);
  }, [temporarilyHidden]);
  function navigate(action:()=>void){
    const doc=navigation.current?.ownerDocument;
    if(!doc||doc.querySelector('[aria-modal="true"],[data-av-navigation-loading]')||!recolherProdutoEmFoco(doc))return;
    requestAnimationFrame(action);
  }
  return <nav ref={navigation} data-product-focus-navigation className={styles.marketplaceShortcuts} aria-label="Atalhos do módulo">
    <div className={styles.marketplaceShortcutLinks} data-temporarily-hidden={temporarilyHidden} inert={temporarilyHidden} aria-hidden={temporarilyHidden || undefined}>
      {([{id:'sales-content',label:'Vendas',icon:'shoppingBag'},{id:'announced-content',label:'Anunciados',icon:'storefront'},{id:'warehouses-content',label:'Estoque',icon:'archive'},{id:'sales-report-content',label:'Resultados',icon:'list'}] as const).map(shortcut=><button key={shortcut.id} type="button" className={styles.productSearchShortcut} aria-label={`Ir para ${shortcut.label}`} aria-controls={shortcut.id} onClick={()=>navigate(()=>scrollToMarketplacePanel(shortcut.id))}><span className={styles.shortcutFace}><Icon name={shortcut.icon} size={16}/><span>{shortcut.label}</span></span></button>)}
      <BotaoAcaoCompacto variante="primario" somenteIcone className={`${styles.productSearchShortcut} ${styles.shortcutDismiss}`} aria-label="Ocultar atalhos por 30 segundos" title="Ocultar atalhos por 30 segundos" onClick={() => setTemporarilyHidden(true)}><Icon name="close" size={16} /></BotaoAcaoCompacto>
    </div>
    <button type="button" className={styles.productSearchShortcut} onClick={()=>navigate(onClick)} aria-label="Pesquisar produtos cadastrados" aria-controls="local-product-search"><span className={styles.shortcutFace}><Icon name="search" size={16} /><span>Pesquisar produtos</span></span></button>
  </nav>;
}

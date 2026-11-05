'use client';

import CardExpandidoModal from '@/app/components/CardExpandidoModal';
import BotaoAcaoCompacto from '@/app/components/BotaoAcaoCompacto';
import type { CatalogAttribute, CatalogCandidate } from '@/app/modules/marketplaces/services/catalog-publication';
import styles from './CatalogCandidateChooser.module.css';

type Props = {
  aberto: boolean;
  ean?: string | null;
  candidates: CatalogCandidate[];
  dark?: boolean;
  onChoose: (id: string) => void;
  onClose: () => void;
};

const technical = (attributes: CatalogAttribute[] | undefined) => (attributes || []).filter(attribute =>
  /^(VOLTAGE|TENSION|VOLTAGEM|POWER|POTENCIA)$/i.test(attribute.id)
  || /voltagem|tens[aã]o|pot[eê]ncia/i.test(attribute.name),
).slice(0, 4);

export default function CatalogCandidateChooser({ aberto, ean, candidates, dark = false, onChoose, onClose }: Props) {
  return <CardExpandidoModal aberto={aberto} variante="compacto" rotulo="Escolher ficha do produto" darkMode={dark} onFechar={onClose}>
    <section className={`${styles.dialog} ${dark ? styles.dark : ''}`}>
      <header>
        <div><h2>Escolha a ficha correta</h2><p>Compare a etiqueta física antes de continuar.</p></div>
        <BotaoAcaoCompacto somenteIcone variante="discreto" aria-label="Fechar escolha de ficha" onClick={onClose}>×</BotaoAcaoCompacto>
      </header>
      {ean && <p className={styles.ean}><strong>EAN lido:</strong> {ean}</p>}
      <div className={styles.options} role="list" aria-label="Fichas encontradas para o EAN lido">
        {candidates.map(candidate => {
          const facts = technical(candidate.attributes);
          const blocked = candidate.eanStatus === 'divergent';
          return <article key={candidate.id} className={styles.option} role="listitem">
            {candidate.picture ? <img /* eslint-disable-line @next/next/no-img-element -- imagens externas do catálogo não têm allowlist fixa */ src={candidate.picture} alt="" /> : <span className={styles.pictureFallback} aria-hidden="true">Sem foto</span>}
            <div className={styles.content}>
              <strong>{candidate.name}</strong>
              <small>Ficha: {candidate.id}</small>
              {facts.length > 0 && <dl>{facts.map(fact => <div key={fact.id}><dt>{fact.name}</dt><dd>{fact.value}</dd></div>)}</dl>}
              {candidate.eanStatus === 'confirmed' && <small className={styles.confirmed}>EAN confirmado na ficha: {ean}</small>}
              {candidate.eanStatus === 'unreported' && <small>Ficha sem EAN técnico informado. Confira a etiqueta.</small>}
              {blocked && <small className={styles.warning}>A ficha informa EAN diferente: {candidate.gtins?.join(', ')}. Ela não pode ser usada.</small>}
              {!candidate.attributes?.length && <small>Características indisponíveis nesta ficha.</small>}
            </div>
            <BotaoAcaoCompacto variante="primario" disabled={blocked} onClick={() => onChoose(candidate.id)}>{blocked ? 'EAN diferente' : 'Escolher'}</BotaoAcaoCompacto>
          </article>;
        })}
      </div>
      <footer><small>A escolha não altera o EAN lido nem troca tensão, potência ou outra característica.</small></footer>
    </section>
  </CardExpandidoModal>;
}

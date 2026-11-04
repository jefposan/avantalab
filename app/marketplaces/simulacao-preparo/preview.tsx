'use client';

import { useCallback, useMemo, useState, type CSSProperties } from 'react';
import BotaoAcaoCompacto from '@/app/components/BotaoAcaoCompacto';
import ModuloHeader from '@/app/components/ModuloHeader';
import NewListing, { type ListingCopyRequest } from '../NewListing';
import MarketplaceSelect from '../MarketplaceSelect';
import type { MarketplaceAccount } from '../Anunciados';
import { createSimulationRequest, SIMULATION_ACCOUNT, SIMULATION_COMPANY, type SimulationScenario } from './fixture';
import styles from '../marketplaces.module.css';

const accounts: MarketplaceAccount[] = [{ id: SIMULATION_ACCOUNT, provider: 'mercado_livre', seller_reference: 'DEMO-SEM-CONEXAO', seller_name: 'Loja fictícia — teste local', status: 'connected', last_synced_at: null, expires_at: null }];
const noop = () => {};

function SimulationForm({ scenario }: { scenario: SimulationScenario }) {
  const simulation = useMemo(() => ({ request: createSimulationRequest(scenario) }), [scenario]);
  const [copyRequest, setCopyRequest] = useState<ListingCopyRequest | null>({ id: 'simulacao-inicial', localProductId: 'simulacao-produto', targetConnectionId: SIMULATION_ACCOUNT });
  const clearCopy = useCallback(() => setCopyRequest(null), []);
  return <NewListing companyId={SIMULATION_COMPANY} brand="#003E73" accountId={SIMULATION_ACCOUNT} accounts={accounts} accountSelectionLocked canManage
    onSelectAccount={noop} onBusyChange={noop} onPublished={noop} copyRequest={copyRequest} onCopyHandled={clearCopy} simulation={simulation} />;
}

export default function Preview() {
  const [scenario, setScenario] = useState<SimulationScenario>('success');
  const [round, setRound] = useState(0);
  return <main className={styles.page} style={{ '--brand': '#003E73', '--marketplace-header-height': '80px', '--marketplace-navigation-height': '104px' } as CSSProperties}>
    <ModuloHeader className={styles.salesHeader} empresa={{ nome: 'Simulação local · Preparar anúncio', corPrimaria: '#003E73', temaEscuro: false }} onBack={() => window.history.back()} />
    <div className={styles.content}>
      <section className={styles.panel} aria-labelledby="simulation-title">
        <h1 id="simulation-title">Preparar anúncio — simulação</h1>
        <p className={styles.catalogNotice} role="status"><strong>Somente teste · dados fictícios.</strong> Nada é enviado ao ML, salvo no banco ou publicado. Esta página existe somente no servidor de desenvolvimento.</p>
        <div className={styles.panelHeading}>
          <MarketplaceSelect id="simulation-scenario" label="Resposta simulada ao publicar" placeholder="Escolha o cenário" value={scenario} onChange={value => setScenario(value as SimulationScenario)} options={[
            { value: 'success', label: 'Sucesso' }, { value: 'rejected', label: 'Recusa com erro no campo' }, { value: 'uncertain', label: 'Resposta incerta' },
          ]} />
          <BotaoAcaoCompacto onClick={() => setRound(value => value + 1)}>Reiniciar teste</BotaoAcaoCompacto>
        </div>
        <p className={styles.help}>Edite os campos, acompanhe o resumo, confira o frete, marque a confirmação do produto e clique em Simular publicação. Trocar o cenário ou reiniciar restaura o exemplo e descarta as edições.</p>
        <SimulationForm key={`${scenario}-${round}`} scenario={scenario} />
      </section>
    </div>
  </main>;
}

import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import CalculatorHub from './components/CalculatorHub';
import BotaoProximoScroll from './components/BotaoProximoScroll';
import LandingPreviewHeader from './components/LandingPreviewHeader';
import AvaPlansPreview from './components/AvaPlansPreview';
import styles from './preview/landing/preview-landing.module.css';
import effects from './preview/landing/preview-effects.module.css';
import avaBadge from './preview/landing/ava-badge.module.css';
import dashboardChart from './preview/landing/dashboard-chart.module.css';
import anchorOffset from './preview/landing/anchor-offset.module.css';

const siteUrl = 'https://avantalab.com.br';
const destinosProximaRolagem = ['recursos', 'como-funciona', 'ia-ava', 'planos', 'calculadoras', 'perguntas', 'proximo-passo', 'rodape'] as const;

export const metadata: Metadata = {
  title: 'Gestão financeira, operação e equipe | AvantaLab',
  description: 'Organize o financeiro, acompanhe a operação e conte com a IA Ava para decidir melhor. Comece pelo plano Free, gratuito para uso pessoal.',
  alternates: { canonical: siteUrl },
  robots: { index: true, follow: true },
  openGraph: {
    title: 'AvantaLab | Seu negócio organizado para decidir melhor',
    description: 'Financeiro, indicadores, equipe e IA em uma plataforma simples de operar.',
    url: siteUrl,
    siteName: 'AvantaLab',
    locale: 'pt_BR',
    type: 'website',
    images: [{ url: '/images/avantalab-share-meta-safe-center-v2.jpg', width: 1200, height: 628, alt: 'AvantaLab Gestão' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AvantaLab | Gestão financeira e operacional',
    description: 'Organize seu negócio e decida melhor com apoio da IA Ava.',
    images: ['/images/avantalab-share-meta-safe-center-v2.jpg'],
  },
};

const recursos = [
  ['Financeiro sob controle', 'Organize receitas, despesas, pagamentos programados e reservas em uma visão clara do seu dia a dia.'],
  ['Indicadores que explicam', 'Compare períodos, acompanhe gráficos e descubra cedo o que merece a sua atenção.'],
  ['Ava, sua assistente', 'Tire dúvidas sobre o sistema e entenda seus números com explicações em linguagem simples.'],
  ['Equipe no mesmo ritmo', 'Centralize ponto, permissões e rotinas operacionais sem somar mais uma ferramenta.'],
  ['Controle de Ponto', 'Acompanhe jornada, registros, ajustes e relatórios da equipe em um só lugar.'],
  ['Importação de despesas', 'Traga despesas de faturas ou extratos para organizar e revisar os lançamentos com mais agilidade.'],
];

const etapas = [
  ['1', 'Crie seu perfil', 'Escolha Pessoal ou Empresa e informe somente o necessário para começar.'],
  ['2', 'Organize a rotina', 'Registre entradas, despesas, compromissos e informações da equipe.'],
  ['3', 'Decida com clareza', 'Acompanhe os indicadores e peça à Ava o contexto por trás dos números.'],
];

const perguntas = [
  ['Existe um plano gratuito?', 'Sim. O Free é gratuito, sem cartão, e oferece acesso mobile limitado para organizar a vida financeira pessoal.'],
  ['O Business Pro tem período de teste?', 'Sim. Você pode experimentar o Business Pro por 7 dias grátis antes de decidir pela contratação.'],
  ['Qual plano é indicado para empresas?', 'O Business atende pequenos negócios com limites essenciais e módulos contratados separadamente. O Business Pro inclui todos os módulos existentes e limites maiores para usuários, perfis e Controle de Ponto.'],
  ['O AvantaLab funciona no celular?', 'Sim. A plataforma foi pensada para acompanhar o trabalho no computador e no celular, com as informações sincronizadas.'],
  ['A Ava substitui suporte ou consultoria?', 'A Ava orienta o uso do AvantaLab e ajuda a interpretar informações do sistema. Ela não substitui contabilidade, consultoria ou decisões profissionais.'],
];

const dadosEstruturados = {
  '@context': 'https://schema.org',
  '@graph': [
    { '@type': 'Organization', name: 'AvantaLab', url: siteUrl, logo: `${siteUrl}/images/landing/logo-avantalab.png`, contactPoint: { '@type': 'ContactPoint', email: 'contato@avantalab.com.br', contactType: 'customer support', availableLanguage: 'Portuguese' } },
    { '@type': 'SoftwareApplication', name: 'AvantaLab Gestão', applicationCategory: 'BusinessApplication', operatingSystem: 'Web', url: siteUrl, description: 'Plataforma de gestão financeira e operacional com indicadores, rotinas de equipe e assistência por IA.', offers: { '@type': 'Offer', price: '0', priceCurrency: 'BRL', description: 'Plano Free gratuito para uso pessoal, sem cartão de crédito' } },
    { '@type': 'FAQPage', mainEntity: perguntas.map(([pergunta, resposta]) => ({ '@type': 'Question', name: pergunta, acceptedAnswer: { '@type': 'Answer', text: resposta } })) },
  ],
};

export default function PreviewLandingPage() {
  return (
    <main className={`${styles.page} ${effects.root} ${anchorOffset.root}`}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(dadosEstruturados) }} />
      <a className={styles.skipLink} href="#conteudo">Pular para o conteúdo</a>

      <LandingPreviewHeader />

      <section className={styles.hero} id="conteudo" data-public-hero>
        <div className={styles.wrap}>
          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}><span aria-hidden="true" />Gestão financeira e operacional</p>
            <h1>Seu negócio organizado para <em>decidir melhor.</em></h1>
            <p className={styles.lead}>O AvantaLab reúne financeiro, indicadores, rotinas da equipe e a Ava em uma plataforma simples de operar — do primeiro lançamento à visão completa da operação.</p>
            <div className={styles.heroActions}>
              <Link className={styles.primaryButton} href="/gestao?cadastro=1">Começar grátis <span aria-hidden="true">→</span></Link>
              <a className={styles.secondaryButton} href="#recursos">Conhecer a plataforma</a>
            </div>
            <ul className={styles.trustList} aria-label="Destaques da plataforma">
              <li>Free sem cartão de crédito</li>
              <li>Planos pessoais e empresariais</li>
              <li>Web e mobile</li>
            </ul>
          </div>

          <div className={styles.productPreview} aria-label="Visão ilustrativa do painel AvantaLab" data-product-preview>
            <div className={styles.browserBar}><span /><span /><span /><b>avantalab.com.br/gestao</b></div>
            <div className={styles.dashboard}>
              <p>Visão do mês</p>
              <div className={styles.metricGrid}>
                <article><small>Saldo previsto</small><strong>R$ 18.240</strong><i>+ 12% no mês</i></article>
                <article><small>Receitas</small><strong>R$ 42.900</strong><i>Em dia</i></article>
                <article><small>Despesas</small><strong>R$ 24.660</strong><i>− 4% no mês</i></article>
              </div>
              <article className={`${styles.chart} ${dashboardChart.chart}`} aria-label="Gráfico ilustrativo de barras comparando receitas e despesas"><div className={dashboardChart.header}><strong>Comparativo mensal</strong><span>Julho</span></div><div className={dashboardChart.legend}><span><i />Receitas</span><span><i />Despesas</span></div><div className={dashboardChart.bars}>{[[48, 31], [62, 42], [54, 37], [75, 50], [68, 44], [86, 57]].map(([receitas, despesas], index) => <div className={dashboardChart.group} key={index}><i className={dashboardChart.income} style={{ height: `${receitas}%` }} /><i className={dashboardChart.expense} style={{ height: `${despesas}%` }} /></div>)}</div><div className={dashboardChart.months}>{['Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul'].map((mes) => <span key={mes}>{mes}</span>)}</div></article>
              <article className={`${styles.avaBubble} ${avaBadge.bubble}`}><span className={avaBadge.bubbleLogo}><Image src="/images/ava-logo-principal.png" alt="Ava" width={768} height={420} /></span><p>Pergunte para a IA: “Qual meu saldo este mês?”</p></article>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.proof} aria-label="Destaques do AvantaLab" data-proof-bar><div className={styles.wrap}><span>Financeiro, operação e equipe no mesmo lugar</span><span>Informações organizadas para o dia a dia</span><span>Ajuda contextual com a IA Ava</span></div></section>

      <section className={styles.section} id="recursos">
        <div className={styles.wrap} data-scroll-target>
          <p className={styles.kicker}>Feito para a rotina real</p>
          <h2>Menos planilhas espalhadas. Mais contexto para agir.</h2>
          <p className={styles.sectionLead}>Uma base única para cuidar do financeiro e acompanhar a operação com consistência.</p>
          <div className={styles.resourceGrid}>{recursos.map(([titulo, texto]) => <article className={styles.resourceCard} key={titulo}>{titulo === 'Ava, sua assistente' ? <span className={avaBadge.logo}><Image src="/images/ava-logo-principal.png" alt="Logo da Ava" width={768} height={420} /></span> : <span aria-hidden="true">↗</span>}<h3>{titulo}</h3><p>{texto}</p></article>)}</div>
        </div>
      </section>

      <section className={`${styles.section} ${styles.flow}`} id="como-funciona" data-flow-section data-full-section>
        <div className={styles.wrap} data-scroll-target>
          <p className={styles.kicker}>Do zero ao operacional</p>
          <h2>Comece sem transformar a implantação em outro projeto.</h2>
          <div className={styles.steps}>{etapas.map(([numero, titulo, texto]) => <article key={numero}><span>{numero}</span><h3>{titulo}</h3><p>{texto}</p></article>)}</div>
        </div>
      </section>

      <AvaPlansPreview />

      <CalculatorHub />

      <section className={`${styles.section} ${styles.faq}`} id="perguntas" data-full-section>
        <div className={styles.wrap} data-scroll-target>
          <p className={styles.kicker}>Perguntas frequentes</p><h2>O essencial, antes de começar.</h2>
          <div>{perguntas.map(([pergunta, resposta]) => <details key={pergunta}><summary>{pergunta}</summary><p>{resposta}</p></details>)}</div>
        </div>
      </section>

      <section className={styles.finalCta} id="proximo-passo" data-final-cta>
        <div className={styles.wrap} data-scroll-target><p className={styles.kicker}>Próximo passo</p><h2>Organize hoje. Decida com mais segurança amanhã.</h2><p>Comece pelo Free ou escolha o plano que acompanha a sua rotina pessoal ou empresarial.</p><Link className={styles.primaryButton} href="/gestao?cadastro=1">Começar grátis <span aria-hidden="true">→</span></Link></div>
      </section>

      <footer className={styles.footer} id="rodape"><div className={styles.wrap}><Image src="/images/landing/logo-avantalab.png" alt="AvantaLab" width={154} height={40} /><div><Link href="/suporte">Suporte</Link><Link href="/termos">Termos de Uso</Link><Link href="/privacidade">Política de Privacidade</Link><Link href="/cookies">Cookies</Link></div><small>© 2026 AvantaLab. Todos os direitos reservados.</small></div></footer>
      <BotaoProximoScroll destinos={destinosProximaRolagem} distanciaInferior={22} ariaLabel="Avançar para a próxima seção" title="Próxima seção" />
    </main>
  );
}

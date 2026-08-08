import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import CalculatorHub from './components/CalculatorHub';
import BotaoProximoScroll from './components/BotaoProximoScroll';
import LandingHeader from './components/LandingHeader';
import AcessoPublicoLink from './components/AcessoPublicoLink';
import RedirecionamentoPosOAuth from './components/RedirecionamentoPosOAuth';
import LinkRolagemPublica from './components/LinkRolagemPublica';
import AvaPlansPreview from './components/AvaPlansPreview';
import styles from './styles/landing/landing.module.css';
import effects from './styles/landing/landing-effects.module.css';
import avaBadge from './styles/landing/ava-badge.module.css';
import dashboardChart from './styles/landing/dashboard-chart.module.css';
import anchorOffset from './styles/landing/anchor-offset.module.css';
import solutionsStyles from './styles/landing/landing-solutions.module.css';

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

type RecursoIcone = 'ponto' | 'mapa' | 'vendas' | 'financeiro' | 'empresas' | 'usuarios' | 'extrato' | 'indicadores' | 'insights' | 'backup' | 'visual';

const recursos: readonly [string, string, RecursoIcone | 'ava'][] = [
  ['Controle de Ponto', 'Acompanhe jornada, registros, ajustes e relatórios da equipe em um só lugar.', 'ponto'],
  ['Mapa mental', 'Organize ideias, conexões e próximos passos em uma visão visual para dar clareza aos seus projetos.', 'mapa'],
  ['Ava, sua assistente de IA', 'Tire dúvidas sobre o sistema e entenda seus números com explicações em linguagem simples.', 'ava'],
  ['Vendas Mobile', 'Leve clientes, produtos, pedidos e pagamentos para a rotina comercial pelo celular.', 'vendas'],
  ['Financeiro sob controle', 'Organize receitas, despesas, pagamentos programados e reservas em uma visão clara do seu dia a dia.', 'financeiro'],
  ['Gestão unificada de múltiplas empresas', 'Acompanhe perfis empresariais em um só lugar, com a visão certa para cada operação.', 'empresas'],
  ['Adicione usuários com acesso gerenciável', 'Inclua pessoas no perfil e defina, como gestor, o que cada uma pode visualizar e administrar.', 'usuarios'],
  ['Importação de despesas via extrato ou fatura', 'Envie extratos ou faturas para identificar e organizar despesas com mais rapidez.', 'extrato'],
  ['Indicadores que explicam', 'Compare períodos, acompanhe gráficos e descubra cedo o que merece a sua atenção.', 'indicadores'],
  ['Insights e dicas financeiras por IA', 'Receba leituras claras sobre a sua rotina financeira para agir com mais contexto.', 'insights'],
  ['Backup e restauração facilitados', 'Proteja seus dados e recupere informações quando precisar, com mais tranquilidade.', 'backup'],
  ['Visual ajustável', 'Adapte cores e preferências de visualização para deixar a gestão mais próxima da sua rotina.', 'visual'],
];

function IconeRecurso({ nome }: { nome: RecursoIcone }) {
  const comuns = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.9, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  const conteudo = {
    ponto: <><circle cx="12" cy="12" r="8.5" /><path d="M12 7v5l3.3 2" /></>,
    mapa: <><circle cx="5" cy="6" r="2" /><circle cx="19" cy="6" r="2" /><circle cx="12" cy="18" r="2" /><path d="M6.7 7.1 10.4 16M17.3 7.1 13.6 16M7 6h10" /></>,
    vendas: <><rect x="7.5" y="3.5" width="9" height="17" rx="1.8" /><path d="M10.5 17.5h3M10 6.5h4" /><path d="m4 11 2-2 2 2" /></>,
    financeiro: <><path d="M4 7.2A2.2 2.2 0 0 1 6.2 5h10.6A2.2 2.2 0 0 1 19 7.2v9.6a2.2 2.2 0 0 1-2.2 2.2H6.2A2.2 2.2 0 0 1 4 16.8Z" /><path d="M4 9h15M15.5 14h1" /></>,
    empresas: <><path d="M4 20V6.5A1.5 1.5 0 0 1 5.5 5h6A1.5 1.5 0 0 1 13 6.5V20M13 10.5h5.5A1.5 1.5 0 0 1 20 12v8M2.5 20h19M7.5 8.5h2M7.5 12h2M7.5 15.5h2M16 14h1.5M16 17h1.5" /></>,
    usuarios: <><circle cx="9" cy="8" r="3" /><path d="M3.5 20c.5-4 2.4-6 5.5-6s5 2 5.5 6M16 5.5a2.6 2.6 0 0 1 0 5M18.5 14c1.4.6 2.1 1.8 2.3 3.6" /></>,
    extrato: <><rect x="4" y="3.5" width="16" height="17" rx="2" /><path d="M8 8h8M8 12h8M8 16h4M6.5 8h.01M6.5 12h.01M6.5 16h.01" /></>,
    indicadores: <><path d="M4 19.5h16M6.5 17v-5M11 17V8M15.5 17v-8M20 5l-5 4-4-2.5-5 5" /></>,
    insights: <><path d="M12 3.5a6.2 6.2 0 0 0-3.7 11.2c.8.6 1.2 1.3 1.2 2.3h5c0-1 .4-1.7 1.2-2.3A6.2 6.2 0 0 0 12 3.5Z" /><path d="M10 20.5h4M10.2 17h3.6M18.5 5.5l1-1M5.5 5.5l-1-1M20.5 11h-1.4M4.9 11H3.5" /></>,
    backup: <><path d="M20 12a8 8 0 1 1-2.3-5.7" /><path d="M20 5v5h-5M12 8v5l3 1.8" /></>,
    visual: <><path d="M5 6h14M5 12h14M5 18h14" /><circle cx="9" cy="6" r="1.7" /><circle cx="15" cy="12" r="1.7" /><circle cx="11" cy="18" r="1.7" /></>,
  }[nome];

  return <svg viewBox="0 0 24 24" aria-hidden="true" {...comuns}>{conteudo}</svg>;
}

const solucoes = [
  ['/gestao-financeira', 'Gestão financeira empresarial', 'Organize receitas, despesas, indicadores e rotinas da empresa em uma única visão.'],
  ['/controle-financeiro-pessoal', 'Controle financeiro pessoal', 'Comece pelo celular, sem cartão, para acompanhar sua vida financeira com clareza.'],
  ['/controle-de-ponto', 'Controle de ponto', 'Acompanhe jornada, registros e relatórios da equipe como parte da operação.'],
  ['/vendas-mobile', 'Vendas Mobile', 'Leve clientes, produtos, pedidos e pagamentos para a rotina comercial no celular.'],
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
    { '@type': 'WebSite', name: 'AvantaLab', url: siteUrl, inLanguage: 'pt-BR' },
    { '@type': 'SoftwareApplication', name: 'AvantaLab Gestão', applicationCategory: 'BusinessApplication', operatingSystem: 'Web', url: siteUrl, description: 'Plataforma de gestão financeira e operacional com indicadores, rotinas de equipe e assistência por IA.', offers: { '@type': 'Offer', price: '0', priceCurrency: 'BRL', description: 'Plano Free gratuito para uso pessoal, sem cartão de crédito' } },
    {
      '@type': 'OfferCatalog',
      name: 'Planos AvantaLab',
      itemListElement: [
        { '@type': 'Offer', name: 'Free', price: '0', priceCurrency: 'BRL', description: 'Uso pessoal gratuito no mobile, sem cartão.' },
        { '@type': 'Offer', name: 'Pessoal Premium', price: '9.90', priceCurrency: 'BRL', description: 'Plano pessoal premium mensal.' },
        { '@type': 'Offer', name: 'Business', price: '34.90', priceCurrency: 'BRL', description: 'Gestão empresarial essencial mensal.' },
        { '@type': 'Offer', name: 'Business Pro', price: '49.90', priceCurrency: 'BRL', description: 'Ecossistema empresarial completo mensal.' },
      ],
    },
    { '@type': 'FAQPage', mainEntity: perguntas.map(([pergunta, resposta]) => ({ '@type': 'Question', name: pergunta, acceptedAnswer: { '@type': 'Answer', text: resposta } })) },
  ],
};

export default function AvantaLandingPage() {
  return (
    <>
      <RedirecionamentoPosOAuth />
      <main className={`${styles.page} ${effects.root} ${anchorOffset.root}`}>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(dadosEstruturados) }} />
        <a className={styles.skipLink} href="#conteudo">Pular para o conteúdo</a>

      <LandingHeader />

      <section className={styles.hero} id="conteudo" data-public-hero>
        <div className={styles.wrap}>
          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}><span aria-hidden="true" />Gestão financeira e operacional</p>
            <h1>Seu negócio organizado para <em>decidir melhor.</em></h1>
            <p className={styles.lead}>O AvantaLab reúne financeiro, indicadores, rotinas da equipe e a Ava em uma plataforma simples de operar — do primeiro lançamento à visão completa da operação.</p>
            <div className={styles.heroActions}>
              <AcessoPublicoLink className={styles.primaryButton} modo="cadastro">Começar grátis <span aria-hidden="true">→</span></AcessoPublicoLink>
              <LinkRolagemPublica className={styles.secondaryButton} href="#recursos">Conhecer a plataforma</LinkRolagemPublica>
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
          <h2 className={styles.resourcesTitle}>Menos planilhas espalhadas. Mais contexto para agir.</h2>
          <p className={styles.sectionLead}>Uma base única para cuidar do financeiro e acompanhar a operação com consistência.</p>
          <div className={styles.resourceGrid}>{recursos.map(([titulo, texto, icone]) => <article className={styles.resourceCard} key={titulo}>{icone === 'ava' ? <span className={avaBadge.logo}><Image src="/images/ava-logo-principal.png" alt="Logo da Ava" width={768} height={420} /></span> : <span><IconeRecurso nome={icone} /></span>}<h3>{titulo}</h3><p>{texto}</p></article>)}</div>
        </div>
      </section>

      <section className={`${styles.section} ${solutionsStyles.section}`} id="solucoes" aria-labelledby="titulo-solucoes">
        <div className={styles.wrap}>
          <p className={styles.kicker}>Soluções AvantaLab</p>
          <h2 id="titulo-solucoes">A solução certa para cada parte da sua rotina.</h2>
          <p className={styles.sectionLead}>Conheça como o AvantaLab organiza o financeiro, a equipe e a operação em diferentes momentos do seu dia a dia.</p>
          <div className={solutionsStyles.grid}>
            {solucoes.map(([href, titulo, texto]) => <Link className={solutionsStyles.card} href={href} key={href}><span className={solutionsStyles.icon} aria-hidden="true">↗</span><h3>{titulo}</h3><p>{texto}</p><b>Conhecer solução <i aria-hidden="true">→</i></b></Link>)}
          </div>
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
        <div className={styles.wrap} data-scroll-target><p className={styles.kicker}>Próximo passo</p><h2>Organize hoje. Decida com mais segurança amanhã.</h2><p>Comece pelo Free ou escolha o plano que acompanha a sua rotina pessoal ou empresarial.</p><AcessoPublicoLink className={styles.primaryButton} modo="cadastro">Começar grátis <span aria-hidden="true">→</span></AcessoPublicoLink></div>
      </section>

      <footer className={styles.footer} id="rodape"><div className={styles.wrap}><Image src="/images/landing/logo-avantalab.png" alt="AvantaLab" width={154} height={40} /><div><Link href="/suporte">Suporte</Link><Link href="/termos">Termos de Uso</Link><Link href="/privacidade">Política de Privacidade</Link><Link href="/cookies">Cookies</Link></div><small>© 2026 AvantaLab. Todos os direitos reservados.</small></div></footer>
      <BotaoProximoScroll destinos={destinosProximaRolagem} distanciaInferior={22} ariaLabel="Avançar para a próxima seção" title="Próxima seção" />
      </main>
    </>
  );
}

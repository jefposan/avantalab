'use client';
// Landing oficial do AvantaLab, exibida na porta do sistema antes do login.
// Origem: landing-preview/index.html (aprovada), componentizada para o fluxo de auth.
import { useEffect, useRef, useState } from 'react';
import styles from './LandingPage.module.css';

type LandingPageProps = {
  onCriarConta: () => void;
  onEntrar: () => void;
};

const Check = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
);

const Arrow = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
);

const PRECOS = {
  anual: { pessoal: '8,25', empresa: '29,90', nota: 'Cobrança anual · economize em relação ao mensal' },
  mensal: { pessoal: '9,90', empresa: '34,90', nota: 'Cobrança mensal · sem fidelidade' },
} as const;

export default function LandingPage({ onCriarConta, onEntrar }: LandingPageProps) {
  const [scrolled, setScrolled] = useState(false);
  const [periodo, setPeriodo] = useState<'anual' | 'mensal'>('anual');
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add('in');
          io.unobserve(e.target);
        }
      }),
      { threshold: 0.12 },
    );
    root.querySelectorAll('.reveal').forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  const irPara = (id: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  const irParaProdutoMobile = () => {
    document.getElementById('produto-mobile')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const precos = PRECOS[periodo];

  return (
    <div className={styles.landing} ref={rootRef}>
      {/* ======================= NAV ======================= */}
      <header className={`nav ${scrolled ? 'scrolled' : ''}`}>
        <div className="wrap nav-inner">
          <a className="nav-logo" href="#" onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>
            <img src="/images/landing/logo-avantalab.png" alt="AvantaLab, do zero ao operacional" />
          </a>
          <nav className="nav-links">
            <a href="#beneficios" onClick={irPara('beneficios')}>Benefícios</a>
            <a href="#ava" onClick={irPara('ava')}>IA Ava</a>
            <a href="#planos" onClick={irPara('planos')}>Planos</a>
            <a href="#faq" onClick={irPara('faq')}>Dúvidas</a>
          </nav>
          <div className="nav-actions">
            <button type="button" className="nav-entrar" onClick={onEntrar}>Entrar</button>
            <button type="button" className="btn btn-primary nav-cta" onClick={onCriarConta}>Teste grátis</button>
          </div>
        </div>
      </header>

      {/* ======================= HERO ======================= */}
      <section className="hero">
        <div className="wrap hero-grid">
          <div className="hero-copy">
            <span className="eyebrow"><span className="dot" />Gestão financeira e operacional</span>
            <h1>Suas finanças, do zero ao <span className="grad">operacional.</span></h1>
            <p className="hero-sub">
              Receitas, despesas, pagamentos programados, gráficos e controle de ponto, tudo em um só lugar,
              com uma IA que explica seus números e te ensina a usar o sistema.
            </p>
            <div className="hero-actions">
              <button type="button" className="btn btn-primary" onClick={onCriarConta}>
                Teste grátis
                <Arrow />
              </button>
              <a className="btn btn-ghost" href="#beneficios" onClick={irPara('beneficios')}>
                <span className="desktop-label">Conhecer o AvantaLab</span>
                <span className="mobile-label">Conhecer</span>
              </a>
            </div>
            <div className="hero-note">
              <span><Check size={15} />Sem cartão de crédito</span>
              <span><Check size={15} />Cancele quando quiser</span>
            </div>
            <button type="button" className="hero-scroll" onClick={irParaProdutoMobile} aria-label="Ver demonstração do produto">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.25" d="M12 5v14m0 0l-6-6m6 6l6-6" />
              </svg>
            </button>
          </div>

          {/* mockup do produto */}
          <div className="mock-stage" id="produto-mobile">
            <div className="mock">
              <div className="mock-bar">
                <i /><i /><i />
                <span className="addr">app.avantalab.com.br</span>
              </div>
              <div className="mock-body">
                <div className="kpis">
                  <div className="kpi hl"><small>Saldo do mês</small><strong>R$ 18.240</strong></div>
                  <div className="kpi"><small>Faturamento</small><strong>R$ 42.900</strong><span className="up">▲ 12% vs. jun</span></div>
                  <div className="kpi"><small>Despesas</small><strong>R$ 24.660</strong><span className="down">▼ 4% vs. jun</span></div>
                </div>

                <div className="panel">
                  <div className="panel-head">
                    <b>Comparativo mensal</b>
                    <span className="legend">
                      <span><i style={{ background: '#2188e6' }} />Faturamento</span>
                      <span><i style={{ background: '#b9c9dc' }} />Despesas</span>
                    </span>
                  </div>
                  <div className="pares">
                    <div className="par"><div className="duo"><i style={{ height: '48%' }} /><em style={{ height: '30%' }} /></div></div>
                    <div className="par"><div className="duo"><i style={{ height: '60%' }} /><em style={{ height: '38%' }} /></div></div>
                    <div className="par"><div className="duo"><i style={{ height: '55%' }} /><em style={{ height: '33%' }} /></div></div>
                    <div className="par"><div className="duo"><i style={{ height: '72%' }} /><em style={{ height: '42%' }} /></div></div>
                    <div className="par"><div className="duo"><i style={{ height: '66%' }} /><em style={{ height: '40%' }} /></div></div>
                    <div className="par"><div className="duo"><i style={{ height: '84%' }} /><em style={{ height: '44%' }} /></div></div>
                  </div>
                  <div className="par-labels"><b>fev</b><b>mar</b><b>abr</b><b>mai</b><b>jun</b><b>jul</b></div>
                </div>

                <div className="panel">
                  <div className="panel-head">
                    <b>Evolução do saldo</b>
                    <span className="badge-up">▲ 34% no ano</span>
                  </div>
                  <svg className="area" viewBox="0 0 300 90" preserveAspectRatio="none" aria-hidden="true">
                    <defs>
                      <linearGradient id="lp-ag" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0" stopColor="#2f9be8" stopOpacity=".4" />
                        <stop offset="1" stopColor="#2f9be8" stopOpacity="0" />
                      </linearGradient>
                      <linearGradient id="lp-al" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0" stopColor="#1d6fd9" />
                        <stop offset="1" stopColor="#3ec6dd" />
                      </linearGradient>
                    </defs>
                    <g stroke="#152238" strokeOpacity=".06" strokeWidth="1">
                      <line x1="8" y1="16" x2="292" y2="16" />
                      <line x1="8" y1="38" x2="292" y2="38" />
                      <line x1="8" y1="60" x2="292" y2="60" />
                      <line x1="8" y1="82" x2="292" y2="82" />
                    </g>
                    <path fill="url(#lp-ag)" d="M10 72 C 55 68, 85 60, 125 50 C 165 40, 200 38, 235 28 C 258 22, 275 17, 290 14 L290 86 L10 86 Z" />
                    <path fill="none" stroke="url(#lp-al)" strokeWidth="2.6" strokeLinecap="round" d="M10 72 C 55 68, 85 60, 125 50 C 165 40, 200 38, 235 28 C 258 22, 275 17, 290 14" />
                    <circle cx="290" cy="14" r="7" fill="#3ec6dd" fillOpacity=".22" />
                    <circle cx="290" cy="14" r="3.4" fill="#1d6fd9" stroke="#fff" strokeWidth="1.4" />
                  </svg>
                  <div className="par-labels"><b>fev</b><b>mar</b><b>abr</b><b>mai</b><b>jun</b><b>jul</b></div>
                </div>
              </div>
            </div>

            <div className="mock-float float-notif">
              <div className="float-ic warn">
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" /></svg>
              </div>
              <div><b>Pagamento programado</b><small>Fornecedor vence amanhã: R$ 1.850,00</small></div>
            </div>

            <div className="mock-float float-ava">
              <div className="float-ic">
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-8.5 8.5 8.5 8.5 0 0 1-3.5-.76L3 21l1.76-6A8.5 8.5 0 1 1 21 11.5z" /></svg>
              </div>
              <div><b>Ava</b><small>Sua margem cresceu 6% neste trimestre. Quer ver o detalhe por categoria?</small></div>
            </div>
          </div>
        </div>
      </section>

      {/* ======================= FAIXA DE CONFIANÇA ======================= */}
      <div className="trust">
        <div className="wrap">
          <span><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></svg>Teste grátis em qualquer plano</span>
          <span><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>Seus dados protegidos</span>
          <span><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="2" width="14" height="20" rx="2" /><path d="M12 18h.01" /></svg>Web e mobile, sempre sincronizados</span>
        </div>
      </div>

      {/* ======================= BENEFÍCIOS ======================= */}
      <section className="benefits" id="beneficios" style={{ scrollMarginTop: 'var(--lp-edge-anchor-offset, 22px)' }}>
        <div className="wrap">
          <div className="sec-head center reveal">
            <span className="kicker">Por que AvantaLab</span>
            <h2>Tudo o que a sua operação precisa, sem planilhas espalhadas</h2>
            <p className="sec-sub">Centralize o financeiro e a rotina do time em uma ferramenta leve, feita para o dia a dia de quem administra.</p>
          </div>

          <div className="ben-grid">
            <div className="ben reveal">
              <div className="ben-ic">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>
              </div>
              <h3>Financeiro sob controle</h3>
              <p>Receitas, despesas e pagamentos programados organizados em um só painel. Você sabe exatamente o que entra, o que sai e o que vence.</p>
            </div>

            <div className="ben reveal">
              <div className="ben-ic">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v16a2 2 0 0 0 2 2h16" /><path d="M7 13l3-3 4 4 5-6" /></svg>
              </div>
              <h3>Gráficos e comparativos</h3>
              <p>Acompanhe a evolução mês a mês com gráficos claros. Compare períodos e enxergue tendências antes que virem problema.</p>
            </div>

            <div className="ben reveal">
              <div className="ben-ic">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" /></svg>
              </div>
              <h3>Avisos no momento certo</h3>
              <p>Notificações sobre compromissos financeiros e vencimentos. Nada passa despercebido, nem multas por atraso.</p>
            </div>

            <div className="ben reveal">
              <div className="ben-ic">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3a6 6 0 0 1 6 6c0 2.5-1.5 4-3 5.5V17H9v-2.5C7.5 13 6 11.5 6 9a6 6 0 0 1 6-6z" /><path d="M9 21h6" /></svg>
              </div>
              <h3>IA que explica seus números</h3>
              <p>Pergunte em linguagem natural e a Ava responde: de &quot;quanto gastei com fornecedores?&quot; a &quot;como cadastro uma despesa fixa?&quot;.</p>
            </div>

            <div className="ben reveal">
              <div className="ben-ic">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 3" /></svg>
              </div>
              <h3>Controle de ponto integrado</h3>
              <p>Registro de ponto do time no mesmo sistema do financeiro. Menos ferramentas, menos custo, mais visão do todo.</p>
            </div>

            <div className="ben reveal">
              <div className="ben-ic">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="14" height="11" rx="2" /><path d="M6 19h6" /><path d="M9 15v4" /><rect x="16" y="9" width="6" height="12" rx="2" /></svg>
              </div>
              <h3>No computador e no celular</h3>
              <p>Acesse de onde estiver, com tudo sincronizado. A mesma experiência no escritório, em casa ou na rua.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ======================= IA AVA ======================= */}
      <section className="ava" id="ava" style={{ scrollMarginTop: 72 }}>
        <div className="wrap ava-grid">
          <div className="reveal">
            <img className="ava-logo" src="/images/landing/ava-logo-fundo-escuro.png" alt="Ava, assistente de IA do AvantaLab" />
            <span className="kicker">Inteligência artificial</span>
            <h2>Você não precisa de um manual. Precisa da Ava.</h2>
            <p className="sec-sub">
              A Ava conhece o AvantaLab por dentro e conhece os seus números. Ela ensina o uso do sistema,
              responde dúvidas na hora e transforma dados em respostas simples.
            </p>
            <ul className="ava-points">
              <li><Check size={17} />Tire dúvidas sobre qualquer função do sistema, sem esperar suporte</li>
              <li><Check size={17} />Entenda seus resultados com explicações em linguagem simples</li>
              <li><Check size={17} />Disponível a qualquer hora, no computador e no celular</li>
            </ul>
          </div>

          <div className="chat reveal" aria-hidden="true">
            <div className="msg user">Ava, como estão minhas despesas neste mês comparadas ao anterior?</div>
            <div className="msg bot">
              Suas despesas de julho somam <b>R$ 24.660</b>, uma queda de <b>4%</b> em relação a junho.
              A maior redução foi em <b>Fornecedores (−R$ 1.320)</b>. Quer ver o comparativo completo por categoria?
            </div>
            <div className="msg user">Quero. E me lembra como programo um pagamento recorrente?</div>
            <div className="msg bot">
              Claro. Em <b>Despesas &gt; Nova despesa</b>, ative <b>&quot;Recorrente&quot;</b> e escolha a frequência.
              Eu te aviso antes de cada vencimento. Abrindo seu comparativo agora…
            </div>
            <div className="msg-tag"><i />Ava está digitando</div>
          </div>
        </div>
      </section>

      {/* ======================= PLANOS ======================= */}
      <section className="plans" id="planos" style={{ scrollMarginTop: 52 }}>
        <div className="wrap">
          <div className="sec-head center reveal">
            <span className="kicker">Planos e preços</span>
            <h2>Comece grátis. Continue pelo preço de um lanche.</h2>
            <p className="sec-sub">Grátis com limitações no plano Pessoal e 7 dias de teste grátis no plano Empresa, com acesso completo. Sem cartão de crédito, sem fidelidade.</p>
          </div>

          <div className="toggle-wrap reveal">
            <div className="toggle" role="tablist" aria-label="Periodicidade de cobrança">
              <button type="button" className={periodo === 'anual' ? 'on' : ''} onClick={() => setPeriodo('anual')}>
                Anual <span className="save">até 17% off</span>
              </button>
              <button type="button" className={periodo === 'mensal' ? 'on' : ''} onClick={() => setPeriodo('mensal')}>
                Mensal
              </button>
            </div>
          </div>

          <div className="plan-grid">
            <div className="plan reveal">
              <h3>Pessoal</h3>
              <p className="plan-desc">Para organizar a sua vida financeira com clareza.</p>
              <div className="price">
                <span className="cur">R$</span>
                <span className="val">{precos.pessoal}</span>
                <span className="per">/mês</span>
              </div>
              <p className="price-note">{precos.nota}</p>
              <ul>
                <li><Check />Receitas, despesas e pagamentos programados</li>
                <li><Check />Despesas recorrentes e lançamentos previstos</li>
                <li><Check />Gráficos, comparativos e visão por categoria</li>
                <li><Check />Balanço geral e relatórios detalhados</li>
                <li><Check />Caixinha para reservas e objetivos</li>
                <li><Check />Agenda com avisos e notificações no celular</li>
                <li><Check />IA Ava para dúvidas e análises</li>
                <li><Check />Acesso web e mobile</li>
              </ul>
              <button type="button" className="btn btn-ghost" onClick={onCriarConta}>Criar conta grátis</button>
              <p className="plan-foot">uso gratuito com recursos limitados</p>
            </div>

            <div className="plan feat reveal">
              <span className="plan-badge">Mais completo</span>
              <h3>Empresa</h3>
              <p className="plan-desc">Para gerir o financeiro e a equipe do seu negócio.</p>
              <div className="price">
                <span className="cur">R$</span>
                <span className="val">{precos.empresa}</span>
                <span className="per">/mês</span>
              </div>
              <p className="price-note">{precos.nota}</p>
              <ul>
                <li><Check />Tudo do plano Pessoal</li>
                <li><Check />Controle de ponto com registro por localização</li>
                <li><Check />Horários, jornadas e espelho de ponto da equipe</li>
                <li><Check />Múltiplos usuários com níveis de permissão</li>
                <li><Check />Faturamento com entradas detalhadas</li>
                <li><Check />Gestão de mais de uma empresa na mesma conta</li>
                <li><Check />IA Ava com contexto da sua operação</li>
              </ul>
              <button type="button" className="btn btn-primary" onClick={onCriarConta}>Teste grátis por 7 dias</button>
              <p className="plan-foot">7 dias grátis · cancele quando quiser</p>
            </div>
          </div>
        </div>
      </section>

      {/* ======================= FAQ ======================= */}
      <section className="faq" id="faq" style={{ scrollMarginTop: 'var(--lp-edge-anchor-offset, 22px)' }}>
        <div className="wrap">
          <div className="sec-head center reveal">
            <span className="kicker">Perguntas frequentes</span>
            <h2>Ficou alguma dúvida?</h2>
          </div>
          <div className="faq-list reveal">
            <details>
              <summary>Como funciona o teste grátis de 7 dias?</summary>
              <p>Você cria sua conta e usa o AvantaLab completo por 7 dias, sem informar cartão de crédito. Ao final do período, escolhe o plano que faz sentido ou simplesmente não continua, sem custo algum.</p>
            </details>
            <details>
              <summary>Preciso assistir tutoriais para aprender a usar?</summary>
              <p>Não. A Ava, nossa assistente de IA, está preparada para ensinar o uso do sistema e tirar qualquer dúvida na hora, direto na conversa. É como ter um treinamento particular disponível 24 horas.</p>
            </details>
            <details>
              <summary>Posso trocar de plano ou cancelar depois?</summary>
              <p>Sim. Você pode mudar entre Pessoal e Empresa, alternar entre cobrança mensal e anual, ou cancelar quando quiser, direto no sistema.</p>
            </details>
            <details>
              <summary>Funciona no celular?</summary>
              <p>Sim. O AvantaLab funciona no computador e no celular, com os dados sempre sincronizados. Registre uma despesa na rua e veja o gráfico atualizado no escritório.</p>
            </details>
          </div>
        </div>
      </section>

      {/* ======================= CTA FINAL ======================= */}
      <section className="final">
        <div className="wrap reveal">
          <h2>Comece hoje. Em 7 dias, você não vai querer voltar para a planilha.</h2>
          <p>Acesso completo, sem cartão de crédito. Do zero ao operacional em minutos.</p>
          <button type="button" className="btn btn-primary" onClick={onCriarConta}>
            Teste grátis
            <Arrow />
          </button>
        </div>
      </section>

      {/* ======================= FOOTER ======================= */}
      <footer>
        <div className="wrap foot">
          <img src="/images/landing/logo-avantalab.png" alt="AvantaLab" />
          <small>© {new Date().getFullYear()} AvantaLab. Todos os direitos reservados.</small>
        </div>
      </footer>
    </div>
  );
}

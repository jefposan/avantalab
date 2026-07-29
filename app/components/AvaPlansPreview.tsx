'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import styles from './AvaPlansPreview.module.css';
import refinements from './AvaPlansRefinements.module.css';
import commerce from './AvaPlansCommerce.module.css';
import polish from './AvaPlansCommercePolish.module.css';
import trialCta from './AvaPlansTrialCta.module.css';
import { PLANOS_COMERCIAIS, formatarPrecoComercial } from '../lib/planos-comerciais';

const precos = {
  anual: {
    premium: { valor: formatarPrecoComercial(PLANOS_COMERCIAIS.pessoal_premium.precos.anual ?? 0), sufixo: '/ano', nota: 'Equivale a R$ 8,33 por mês.' },
    business: { valor: formatarPrecoComercial(PLANOS_COMERCIAIS.business.precos.anual ?? 0), sufixo: '/ano', nota: 'Cerca de 40% de desconto sobre 12 mensalidades.' },
    pro: { valor: formatarPrecoComercial(PLANOS_COMERCIAIS.business_pro.precos.anual ?? 0), sufixo: '/ano', nota: 'Cerca de 40% de desconto sobre 12 mensalidades.' },
  },
  mensal: {
    premium: { valor: formatarPrecoComercial(PLANOS_COMERCIAIS.pessoal_premium.precos.mensal ?? 0), sufixo: '/mês', nota: 'Cobrança mensal, sem fidelidade.' },
    business: { valor: formatarPrecoComercial(PLANOS_COMERCIAIS.business.precos.mensal ?? 0), sufixo: '/mês', nota: 'Cobrança mensal, sem fidelidade.' },
    pro: { valor: formatarPrecoComercial(PLANOS_COMERCIAIS.business_pro.precos.mensal ?? 0), sufixo: '/mês', nota: 'Cobrança mensal, sem fidelidade.' },
  },
} as const;

const recursosFree = [
  'Acesso mobile gratuito e limitado',
  'Organização financeira pessoal',
  'Comece sem cartão de crédito',
];

const recursosPremium = [
  'Tudo do Free, mais:',
  'Ava (IA), análises e exportação/backup',
  'Agenda, notificações e múltiplos perfis',
  'Organização avançada e integração com Vendas Mobile',
];

const recursosBusiness = [
  'Tudo do Pessoal Premium, mais:',
  'Até 3 usuários e até 3 perfis',
  'Até 10 funcionários no Controle de Ponto',
  'Módulos contratados separadamente',
  'Uma sessão por usuário de cada vez',
];

const recursosPro = [
  'Tudo do Business, mais:',
  'Até 10 usuários e até 10 perfis',
  'Funcionários ilimitados no Controle de Ponto',
  'Logins simultâneos do mesmo usuário',
  'Todos os módulos existentes incluídos',
];

function Check() {
  return <svg aria-hidden="true" viewBox="0 0 24 24"><path d="m5 12 4 4L19 6" /></svg>;
}

export default function AvaPlansPreview() {
  const [periodo, setPeriodo] = useState<keyof typeof precos>('anual');
  const preco = precos[periodo];

  return (
    <>
      <section className={styles.ava} id="ia-ava" aria-labelledby="ia-ava-titulo" data-full-section>
        <div className={styles.wrap}>
          <div className={styles.avaCopy} data-scroll-target>
            <Image src="/images/landing/ava-logo-fundo-escuro.png" alt="Ava, assistente de inteligência artificial do AvantaLab" width={360} height={156} className={styles.avaLogo} />
            <p className={styles.kicker}>Inteligência artificial</p>
            <h2 id="ia-ava-titulo">Não procure respostas. Converse com a IA Ava.</h2>
            <p>A Ava explica o uso do AvantaLab, ajuda a interpretar seus números e transforma dúvidas da rotina em próximos passos claros.</p>
            <ul>
              <li><Check />Entenda funções do sistema sem depender de manuais.</li>
              <li><Check />Faça perguntas sobre seus indicadores em linguagem simples.</li>
              <li><Check />Conte com ajuda no computador e no celular.</li>
            </ul>
          </div>
          <div className={styles.chat} aria-label="Exemplo de conversa com a IA Ava">
            <p className={styles.user}>Ava, qual foi a principal mudança nas minhas despesas este mês?</p>
            <p className={styles.bot}>Suas despesas caíram <strong>4%</strong> em relação ao mês anterior. A maior redução foi em <strong>Fornecedores</strong>. Quer ver o comparativo por categoria?</p>
            <p className={styles.user}>Quero. E como programo um pagamento recorrente?</p>
            <p className={styles.bot}>Em <strong>Despesas</strong>, crie um novo lançamento, ative <strong>Recorrente</strong> e escolha a frequência. Posso explicar cada etapa.</p>
            <span className={styles.typing}><i />Ava está pronta para ajudar</span>
          </div>
        </div>
      </section>

      <section className={styles.plans} id="planos" aria-labelledby="planos-titulo">
        <div className={styles.plansWrap}>
          <div className={`${styles.plansHeading} ${refinements.plansHeading}`} data-scroll-target>
            <p className={styles.plansKicker}>Planos e preços</p>
            <h2 id="planos-titulo">Planos para cada fase da sua gestão.</h2>
            <p>Planos pessoais para organizar sua vida financeira e planos empresariais para montar a operação que o seu negócio precisa.</p>
          </div>
          <div className={styles.toggle} role="tablist" aria-label="Periodicidade de cobrança">
            <button type="button" role="tab" aria-selected={periodo === 'anual'} className={periodo === 'anual' ? styles.selected : ''} onClick={() => setPeriodo('anual')}>Anual <span>economize no ano</span></button>
            <button type="button" role="tab" aria-selected={periodo === 'mensal'} className={periodo === 'mensal' ? styles.selected : ''} onClick={() => setPeriodo('mensal')}>Mensal</button>
          </div>
          <div className={commerce.grid}>
            <article className={commerce.plan}>
              <p className={commerce.audience}>Plano pessoal</p>
              <h3>Free</h3>
              <p className={commerce.lead}>Seu ponto de entrada para organizar a vida financeira.</p>
              <p className={commerce.price}><span>R$</span><strong>0</strong><small>grátis</small></p>
              <p className={commerce.priceNote}>Acesso sem cartão de crédito.</p>
              <ul>{recursosFree.map((item) => <li key={item}><Check />{item}</li>)}</ul>
              <Link className={commerce.secondaryAction} href="/gestao?cadastro=1">Começar com Free</Link>
            </article>
            <article className={`${commerce.plan} ${commerce.premium}`}>
              <span className={commerce.badge}>Mais escolhido para uso pessoal</span>
              <p className={commerce.audience}>Plano pessoal</p>
              <h3>Pessoal Premium</h3>
              <p className={commerce.lead}>Mais recursos para cuidar da sua vida financeira com profundidade.</p>
              <p className={commerce.price}><span>R$</span><strong>{preco.premium.valor}</strong><small>{preco.premium.sufixo}</small></p>
              <p className={commerce.priceNote}>{preco.premium.nota}</p>
              <ul>{recursosPremium.map((item) => <li key={item}><Check />{item}</li>)}</ul>
              <Link className={commerce.primaryAction} href="/gestao?cadastro=1">Quero o Pessoal Premium <span aria-hidden="true">→</span></Link>
            </article>
            <article className={commerce.plan}>
              <p className={commerce.audience}>Plano empresarial</p>
              <h3>Business</h3>
              <p className={commerce.lead}>Gestão empresarial essencial, com liberdade para contratar os módulos necessários.</p>
              <p className={commerce.price}><span>R$</span><strong>{preco.business.valor}</strong><small>{preco.business.sufixo}</small></p>
              <p className={commerce.priceNote}>{preco.business.nota}</p>
              <ul>{recursosBusiness.map((item) => <li key={item}><Check />{item}</li>)}</ul>
              <Link className={commerce.secondaryAction} href="/gestao?cadastro=1">Quero o Business</Link>
            </article>
            <article className={`${commerce.plan} ${commerce.pro} ${polish.proPlan}`}>
              <span className={`${commerce.badge} ${polish.proBadge}`}>7 dias grátis</span>
              <p className={`${commerce.audience} ${polish.proAudience}`}>Plano empresarial</p>
              <h3>Business Pro</h3>
              <p className={`${commerce.lead} ${polish.proLead}`}>A operação completa para empresas que precisam de todo o ecossistema AvantaLab.</p>
              <p className={`${commerce.price} ${polish.proPrice}`}><span>R$</span><strong>{preco.pro.valor}</strong><small>{preco.pro.sufixo}</small></p>
              <p className={`${commerce.priceNote} ${polish.proNote}`}>{preco.pro.nota}</p>
              <ul>{recursosPro.map((item) => <li key={item}><Check />{item}</li>)}</ul>
              <Link className={`${commerce.primaryAction} ${polish.proAction}`} href="/gestao?cadastro=1"><span className={trialCta.copy}><span>Testar Business Pro</span><span>por 7 dias <strong>GRÁTIS</strong></span></span><span aria-hidden="true">→</span></Link>
            </article>
          </div>
          <div className={commerce.comparison}>
            <div><p>Comparação rápida</p><h3>Business ou Business Pro?</h3></div>
            <div className={commerce.tableWrap} tabIndex={0}>
              <table>
                <caption>Limites e recursos dos planos empresariais</caption>
                <thead><tr><th scope="col">Recurso</th><th scope="col">Business</th><th scope="col">Business Pro</th></tr></thead>
                <tbody>
                  <tr><th scope="row">Usuários</th><td>Até 3</td><td>Até 10</td></tr>
                  <tr><th scope="row">Perfis empresariais ou pessoais</th><td>Até 3</td><td>Até 10</td></tr>
                  <tr><th scope="row">Controle de Ponto</th><td>Até 10 funcionários</td><td>Funcionários ilimitados</td></tr>
                  <tr><th scope="row">Sessões do mesmo usuário</th><td>Uma sessão por vez</td><td>Simultâneas em mais de um dispositivo</td></tr>
                  <tr><th scope="row">Módulos</th><td>Contratados separadamente</td><td>Todos os módulos existentes incluídos</td></tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

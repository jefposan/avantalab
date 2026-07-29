'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import styles from './CalculatorHub.module.css';
import motionStyles from './CalculatorMotion.module.css';
import financeStyles from './CalculatorFinance.module.css';
import rateStyles from './CalculatorRate.module.css';

type Calculadora = 'renda' | 'reserva' | 'cdi' | 'juros' | 'financiamento';
type Periodo = 'mensal' | 'anual';

type TaxaCdiAtual = {
  fonte: string;
  referencia: string;
  taxaAnualPercentual: number;
  convencao: string;
};

const opcoes: Array<{ id: Calculadora; nome: string; resumo: string }> = [
  { id: 'renda', nome: 'Renda passiva', resumo: 'Projeção de patrimônio com retirada mensal.' },
  { id: 'reserva', nome: 'Reserva de emergência', resumo: 'Meta de proteção e prazo para construir sua reserva.' },
  { id: 'cdi', nome: 'Investimento com CDI', resumo: 'Simulação de rendimento bruto e líquido em renda fixa.' },
  { id: 'juros', nome: 'Juros compostos', resumo: 'Evolução de patrimônio com aportes mensais.' },
  { id: 'financiamento', nome: 'Financiar carro ou casa', resumo: 'Compare a parcela e o custo total antes de fechar negócio.' },
];

function numero(valor: string) {
  const normalizado = valor.replace(/\./g, '').replace(',', '.').replace(/[^0-9.-]/g, '');
  return Number(normalizado) || 0;
}

function moeda(valor: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Math.max(0, valor));
}

function percentual(valor: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'percent', maximumFractionDigits: 2 }).format(valor);
}

function taxaMensal(taxa: number, periodo: Periodo) {
  const decimal = taxa / 100;
  return periodo === 'anual' ? Math.pow(1 + decimal, 1 / 12) - 1 : decimal;
}

export default function CalculatorHub() {
  const [ativa, setAtiva] = useState<Calculadora>('renda');
  const [renda, setRenda] = useState({ inicial: '', retirada: '', taxa: '', periodo: '', prazo: '' });
  const [reserva, setReserva] = useState({ perfil: '', custo: '', poupanca: '' });
  const [cdi, setCdi] = useState({ investimento: '', taxa: '', percentual: '', prazo: '', unidade: '' });
  const [juros, setJuros] = useState({ inicial: '', aporte: '', taxa: '', periodo: '', prazo: '' });
  const [financiamento, setFinanciamento] = useState({ bem: '', entrada: '', custos: '', taxa: '', prazo: '', sistema: '' });
  const [taxaCdiAtual, setTaxaCdiAtual] = useState<TaxaCdiAtual | null>(null);
  const [erroTaxaCdi, setErroTaxaCdi] = useState('');
  const taxaCdiEditada = useRef(false);

  const aplicarTaxaAtual = () => {
    if (!taxaCdiAtual) return;
    setCdi((atual) => ({ ...atual, taxa: taxaCdiAtual.taxaAnualPercentual.toFixed(4).replace('.', ',') }));
    taxaCdiEditada.current = false;
  };

  useEffect(() => {
    let ativo = true;
    fetch('/api/taxa-cdi')
      .then(async (resposta) => ({ ok: resposta.ok, dados: await resposta.json() as TaxaCdiAtual & { erro?: string } }))
      .then(({ ok, dados }) => {
        if (!ativo) return;
        if (!ok) {
          setErroTaxaCdi(dados.erro || 'Não foi possível atualizar a Taxa DI agora.');
          return;
        }
        setTaxaCdiAtual(dados);
      })
      .catch(() => { if (ativo) setErroTaxaCdi('Não foi possível atualizar a Taxa DI agora.'); });
    return () => { ativo = false; };
  }, []);

  const resultadoRenda = useMemo(() => {
    const inicial = numero(renda.inicial);
    const retirada = numero(renda.retirada);
    const meses = Math.round(numero(renda.prazo) * 12);
    const taxa = taxaMensal(numero(renda.taxa), renda.periodo as Periodo);
    let patrimonio = inicial;
    let mesesSustentados = 0;
    for (let mes = 0; mes < meses && patrimonio > 0; mes += 1) {
      patrimonio = patrimonio * (1 + taxa) - retirada;
      mesesSustentados = mes + 1;
    }
    return { patrimonio, meses, mesesSustentados, retirada, sustentavel: mesesSustentados === meses && patrimonio >= 0 };
  }, [renda]);

  const resultadoReserva = useMemo(() => {
    const mesesPorPerfil = { servidor: 3, clt: 6, autonomo: 12 } as const;
    const meses = mesesPorPerfil[reserva.perfil as keyof typeof mesesPorPerfil] ?? 0;
    const meta = numero(reserva.custo) * meses;
    const poupanca = numero(reserva.poupanca);
    return { meses, meta, prazo: poupanca > 0 ? Math.ceil(meta / poupanca) : null };
  }, [reserva]);

  const resultadoCdi = useMemo(() => {
    const principal = numero(cdi.investimento);
    const unidade = cdi.unidade;
    const dias = unidade === 'dias' ? numero(cdi.prazo) : unidade === 'anos' ? numero(cdi.prazo) * 252 : numero(cdi.prazo) * 21;
    const taxaDiaria = Math.pow(1 + numero(cdi.taxa) / 100, 1 / 252) - 1;
    const montante = principal * Math.pow(1 + taxaDiaria * (numero(cdi.percentual) / 100), dias);
    const lucroBruto = montante - principal;
    const aliquota = dias <= 180 ? 0.225 : dias <= 360 ? 0.2 : dias <= 720 ? 0.175 : 0.15;
    return { dias, bruto: montante, lucroBruto, imposto: lucroBruto * aliquota, liquido: montante - lucroBruto * aliquota };
  }, [cdi]);

  const resultadoJuros = useMemo(() => {
    const meses = Math.round(numero(juros.prazo) * 12);
    const taxa = taxaMensal(numero(juros.taxa), juros.periodo as Periodo);
    const inicial = numero(juros.inicial);
    const aporte = numero(juros.aporte);
    let montante = inicial;
    for (let mes = 0; mes < meses; mes += 1) montante = montante * (1 + taxa) + aporte;
    const investido = inicial + aporte * meses;
    return { meses, montante, investido, juros: montante - investido };
  }, [juros]);

  const resultadoFinanciamento = useMemo(() => {
    const principal = Math.max(0, numero(financiamento.bem) - numero(financiamento.entrada) + numero(financiamento.custos));
    const meses = Math.max(1, Math.round(numero(financiamento.prazo)));
    const taxa = Math.max(0, numero(financiamento.taxa) / 100);
    const amortizacao = principal / meses;
    const primeiraSac = amortizacao + principal * taxa;
    const ultimaSac = amortizacao + amortizacao * taxa;
    const parcelaPrice = taxa === 0 ? amortizacao : principal * (taxa * Math.pow(1 + taxa, meses)) / (Math.pow(1 + taxa, meses) - 1);
    const price = parcelaPrice * meses;
    const sac = (primeiraSac + ultimaSac) * meses / 2;
    const usaSac = financiamento.sistema === 'sac';
    return {
      principal,
      meses,
      primeiraParcela: usaSac ? primeiraSac : parcelaPrice,
      ultimaParcela: usaSac ? ultimaSac : parcelaPrice,
      total: usaSac ? sac : price,
      juros: (usaSac ? sac : price) - principal,
      sistema: usaSac ? 'SAC' : 'Price',
    };
  }, [financiamento]);

  const alternarComTeclado = (event: React.KeyboardEvent<HTMLButtonElement>, id: Calculadora) => {
    const tecla = event.key;
    if (!['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp', 'Home', 'End'].includes(tecla)) return;
    event.preventDefault();
    const indiceAtual = opcoes.findIndex((opcao) => opcao.id === id);
    const proximoIndice = tecla === 'Home' ? 0 : tecla === 'End' ? opcoes.length - 1 : (indiceAtual + (tecla === 'ArrowRight' || tecla === 'ArrowDown' ? 1 : -1) + opcoes.length) % opcoes.length;
    const proxima = opcoes[proximoIndice];
    setAtiva(proxima.id);
    requestAnimationFrame(() => document.getElementById(`calculadora-aba-${proxima.id}`)?.focus());
  };

  return (
    <section className={styles.section} id="calculadoras" aria-labelledby="calculadoras-titulo">
      <div className={styles.wrap}>
        <div className={styles.heading} data-scroll-target><p>Calculadoras AvantaLab</p><h2 id="calculadoras-titulo">Faça uma simulação antes de decidir.</h2><span>Ferramentas abertas para projetar cenários financeiros. Os resultados são estimativas e não substituem orientação profissional.</span></div>
        <div className={styles.layout}>
          <div className={styles.choices} role="tablist" aria-label="Escolha uma calculadora">
            {opcoes.map((opcao) => <button key={opcao.id} id={`calculadora-aba-${opcao.id}`} type="button" role="tab" aria-selected={ativa === opcao.id} aria-controls={`calculadora-painel-${opcao.id}`} tabIndex={ativa === opcao.id ? 0 : -1} className={ativa === opcao.id ? styles.choiceActive : styles.choice} onClick={() => setAtiva(opcao.id)} onKeyDown={(event) => alternarComTeclado(event, opcao.id)}><b>{opcao.nome}</b><span>{opcao.resumo}</span></button>)}
          </div>
          <div className={`${styles.calculator} ${motionStyles.panel}`} role="tabpanel" id={`calculadora-painel-${ativa}`} aria-labelledby={`calculadora-aba-${ativa}`}>
            {ativa === 'renda' && <><header><p>Renda passiva</p><h3>O seu patrimônio sustenta a retirada planejada?</h3></header><div className={styles.fields}><Campo label="Valor inicial" value={renda.inicial} onChange={(inicial) => setRenda({ ...renda, inicial })} prefixo="R$" placeholder="Ex.: 100.000,00" /><Campo label="Retirada mensal" value={renda.retirada} onChange={(retirada) => setRenda({ ...renda, retirada })} prefixo="R$" placeholder="Ex.: 1.000,00" /><Campo label="Taxa de juros" value={renda.taxa} onChange={(taxa) => setRenda({ ...renda, taxa })} sufixo="%" placeholder="Ex.: 10,00" /><Selecao label="Periodicidade da taxa" value={renda.periodo} onChange={(periodo) => setRenda({ ...renda, periodo })} opcoes={[['anual', 'Ao ano'], ['mensal', 'Ao mês']]} /><Campo label="Prazo da retirada" value={renda.prazo} onChange={(prazo) => setRenda({ ...renda, prazo })} sufixo="anos" placeholder="Ex.: 10" /></div><Resultado vazio={!renda.inicial || !renda.retirada || !renda.taxa || !renda.periodo || !renda.prazo} destaque={resultadoRenda.sustentavel ? 'A retirada se sustenta no prazo informado.' : 'A retirada esgota o patrimônio antes do prazo.'} linhas={[['Patrimônio ao final', moeda(resultadoRenda.patrimonio)], ['Período sustentado', `${resultadoRenda.mesesSustentados} de ${resultadoRenda.meses} meses`], ['Taxa de retirada mensal', percentual(resultadoRenda.retirada / Math.max(1, numero(renda.inicial)))]]} /></>}
            {ativa === 'reserva' && <><header><p>Reserva de emergência</p><h3>Defina uma meta compatível com sua estabilidade de renda.</h3></header><div className={styles.fields}><Selecao label="Perfil de trabalho" value={reserva.perfil} onChange={(perfil) => setReserva({ ...reserva, perfil })} opcoes={[['servidor', 'Servidor público'], ['clt', 'CLT'], ['autonomo', 'Autônomo, MEI ou empreendedor']]} /><Campo label="Custo fixo mensal" value={reserva.custo} onChange={(custo) => setReserva({ ...reserva, custo })} prefixo="R$" placeholder="Ex.: 3.000,00" /><Campo label="Quanto consegue guardar por mês?" value={reserva.poupanca} onChange={(poupanca) => setReserva({ ...reserva, poupanca })} prefixo="R$" placeholder="Ex.: 800,00" /></div><Resultado vazio={!reserva.perfil || !reserva.custo || !reserva.poupanca} destaque={`Referência de ${resultadoReserva.meses} meses de custos fixos.`} linhas={[['Meta de reserva', moeda(resultadoReserva.meta)], ['Aporte mensal', moeda(numero(reserva.poupanca))], ['Prazo estimado', resultadoReserva.prazo ? `${resultadoReserva.prazo} meses` : 'Informe um aporte mensal']]} /></>}
            {ativa === 'cdi' && <>
              <header><p>Investimento com CDI</p><h3>Projete o rendimento antes e depois do imposto de renda.</h3></header>
              <div className={styles.fields}>
                <Campo label="Valor do investimento" value={cdi.investimento} onChange={(investimento) => setCdi({ ...cdi, investimento })} prefixo="R$" placeholder="Ex.: 10.000,00" />
                <Campo label="Taxa DI anual" value={cdi.taxa} onChange={(taxa) => { taxaCdiEditada.current = true; setCdi({ ...cdi, taxa }); }} sufixo="%" placeholder="Use a taxa real ou informe" />
                <Campo label="Percentual do CDI" value={cdi.percentual} onChange={(percentual) => setCdi({ ...cdi, percentual })} sufixo="%" placeholder="Ex.: 100,00" />
                <Campo label="Período" value={cdi.prazo} onChange={(prazo) => setCdi({ ...cdi, prazo })} placeholder="Ex.: 12" />
                <Selecao label="Unidade do período" value={cdi.unidade} onChange={(unidade) => setCdi({ ...cdi, unidade })} opcoes={[['meses', 'Meses'], ['anos', 'Anos'], ['dias', 'Dias úteis']]} />
              </div>
              <div className={rateStyles.rate} aria-live="polite">
                {taxaCdiAtual ? <><span>Taxa DI anualizada: <b>{taxaCdiAtual.taxaAnualPercentual.toFixed(4).replace('.', ',')}% a.a.</b> · referência {taxaCdiAtual.referencia}</span><button type="button" onClick={aplicarTaxaAtual}>Aplicar taxa real</button><small>{taxaCdiAtual.fonte} · {taxaCdiAtual.convencao}</small></> : <span>{erroTaxaCdi || 'Buscando Taxa DI atual…'}</span>}
              </div>
              <Resultado vazio={!cdi.investimento || !cdi.taxa || !cdi.percentual || !cdi.prazo || !cdi.unidade} destaque={`${resultadoCdi.dias} dias úteis estimados para a projeção.`} linhas={[['Valor bruto', moeda(resultadoCdi.bruto)], ['Imposto estimado', moeda(resultadoCdi.imposto)], ['Valor líquido', moeda(resultadoCdi.liquido)]]} />
            </>}
            {ativa === 'juros' && <><header><p>Juros compostos</p><h3>Veja o efeito do tempo e dos aportes recorrentes.</h3></header><div className={styles.fields}><Campo label="Valor inicial" value={juros.inicial} onChange={(inicial) => setJuros({ ...juros, inicial })} prefixo="R$" placeholder="Ex.: 10.000,00" /><Campo label="Aporte mensal" value={juros.aporte} onChange={(aporte) => setJuros({ ...juros, aporte })} prefixo="R$" placeholder="Ex.: 500,00" /><Campo label="Taxa de juros" value={juros.taxa} onChange={(taxa) => setJuros({ ...juros, taxa })} sufixo="%" placeholder="Ex.: 10,00" /><Selecao label="Periodicidade da taxa" value={juros.periodo} onChange={(periodo) => setJuros({ ...juros, periodo })} opcoes={[['anual', 'Ao ano'], ['mensal', 'Ao mês']]} /><Campo label="Prazo" value={juros.prazo} onChange={(prazo) => setJuros({ ...juros, prazo })} sufixo="anos" placeholder="Ex.: 10" /></div><Resultado vazio={!juros.inicial || !juros.taxa || !juros.periodo || !juros.prazo} destaque={`${resultadoJuros.meses} meses de projeção com aportes mensais.`} linhas={[['Patrimônio projetado', moeda(resultadoJuros.montante)], ['Total aportado', moeda(resultadoJuros.investido)], ['Juros acumulados', moeda(resultadoJuros.juros)]]} /></>}
            {ativa === 'financiamento' && <><header><p>Financiar carro ou casa</p><h3>Entenda parcela, juros e custo total antes de assumir o financiamento.</h3></header><div className={styles.fields}><Campo label="Valor do bem" value={financiamento.bem} onChange={(bem) => setFinanciamento({ ...financiamento, bem })} prefixo="R$" placeholder="Ex.: 200.000,00" /><Campo label="Entrada" value={financiamento.entrada} onChange={(entrada) => setFinanciamento({ ...financiamento, entrada })} prefixo="R$" placeholder="Ex.: 40.000,00" /><Campo label="Custos financiados" value={financiamento.custos} onChange={(custos) => setFinanciamento({ ...financiamento, custos })} prefixo="R$" placeholder="Ex.: 0,00" /><Campo label="Taxa mensal" value={financiamento.taxa} onChange={(taxa) => setFinanciamento({ ...financiamento, taxa })} sufixo="%" placeholder="Ex.: 1,00" /><Campo label="Prazo" value={financiamento.prazo} onChange={(prazo) => setFinanciamento({ ...financiamento, prazo })} sufixo="meses" placeholder="Ex.: 240" /><Selecao label="Sistema de amortização" value={financiamento.sistema} onChange={(sistema) => setFinanciamento({ ...financiamento, sistema })} opcoes={[['sac', 'SAC — parcelas diminuem'], ['price', 'Price — parcelas fixas']]} /></div><Resultado vazio={!financiamento.bem || !financiamento.taxa || !financiamento.prazo || !financiamento.sistema} destaque={`${resultadoFinanciamento.sistema}: ${resultadoFinanciamento.sistema === 'SAC' ? 'parcelas maiores no início e menores ao final.' : 'parcelas com o mesmo valor durante o prazo.'}`} linhas={[['Valor financiado', moeda(resultadoFinanciamento.principal)], ['Primeira parcela', moeda(resultadoFinanciamento.primeiraParcela)], ['Última parcela', moeda(resultadoFinanciamento.ultimaParcela)], ['Juros estimados', moeda(resultadoFinanciamento.juros)], ['Total estimado a pagar', moeda(resultadoFinanciamento.total)]]} /><p className={financeStyles.disclaimer}>Estimativa sem atualização monetária, seguros ou tarifas não informadas. Compare o CET da proposta do banco antes de contratar.</p></>}
          </div>
        </div>
      </div>
    </section>
  );
}

function Campo({ label, value, onChange, prefixo, sufixo, placeholder }: { label: string; value: string; onChange: (value: string) => void; prefixo?: string; sufixo?: string; placeholder?: string }) {
  const id = `calculadora-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
  return <label htmlFor={id} className={styles.field}><span>{label}</span><div>{prefixo && <i>{prefixo}</i>}<input id={id} inputMode="decimal" value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} />{sufixo && <i>{sufixo}</i>}</div></label>;
}

function Selecao({ label, value, onChange, opcoes }: { label: string; value: string; onChange: (value: string) => void; opcoes: Array<[string, string]> }) {
  const id = `calculadora-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
  return <label htmlFor={id} className={styles.field}><span>{label}</span><select id={id} value={value} onChange={(event) => onChange(event.target.value)}><option value="" disabled>Selecione uma opção</option>{opcoes.map(([valor, texto]) => <option key={valor} value={valor}>{texto}</option>)}</select></label>;
}

function Resultado({ destaque, linhas, vazio = false }: { destaque: string; linhas: Array<[string, string]>; vazio?: boolean }) {
  return <section className={styles.result} aria-live="polite">{vazio ? <p>Preencha os campos para ver a simulação.</p> : <><p>{destaque}</p>{linhas.map(([rotulo, valor]) => <div key={rotulo}><span>{rotulo}</span><strong>{valor}</strong></div>)}</>}</section>;
}

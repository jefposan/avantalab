'use client';

import { useMemo, useRef, useState } from 'react';
import styles from '../recebimentos.module.css';
import type { Recebimento } from './types';
import { COR_PRIMARIA } from './dadosDemo';
import { dataLocalIso, formatarMoeda } from './helpers';

type Props = { chaveMes: string; recebimentos: Recebimento[] };

type MesAgg = { chave: string; label: string; baixado: number; atraso: number; qtd: number };

const MESES_CURTOS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

export default function GraficoResultados({ chaveMes, recebimentos }: Props) {
  const [hover, setHover] = useState<{ i: number; x: number; y: number } | null>(null);
  const areaGraficoRef = useRef<HTMLDivElement>(null);
  const hojeIso = useMemo(() => dataLocalIso(), []);
  const mesFuturo = chaveMes > hojeIso.slice(0, 7);

  // Totais do mês selecionado no platô.
  const totais = useMemo(() => {
    let baixado = 0, aguardando = 0, atraso = 0, previsto = 0, totalPrevisto = 0;
    for (const r of recebimentos) {
      const mesVenc = r.vencimento.slice(0, 7);
      const mesBaixa = (r.baixadoEm ?? r.recebidoEm ?? '').slice(0, 7);
      const mesRecebido = (r.recebidoEm ?? '').slice(0, 7);
      if (mesVenc === chaveMes) { totalPrevisto += r.valorCombinado; if (r.situacao === 'previsto') previsto += r.valorCombinado; }
      if (r.situacao === 'baixado' && mesBaixa === chaveMes) baixado += r.valorRecebido ?? 0;
      else if ((r.situacao === 'aguardando_conferencia' || r.situacao === 'recebido_a_menor' || r.situacao === 'recebido_a_maior') && mesRecebido === chaveMes)
        aguardando += r.valorRecebido ?? 0;
      if (r.situacao === 'em_atraso' && r.vencimento < hojeIso && mesVenc <= chaveMes) atraso += r.valorCombinado;
    }
    return { baixado, aguardando, atraso, previsto, totalPrevisto };
  }, [recebimentos, chaveMes, hojeIso]);

  // Agregação de 12 meses terminando no mês selecionado.
  const meses: MesAgg[] = useMemo(() => {
    const [anoBase, mesBase] = chaveMes.split('-').map(Number);
    const arr: MesAgg[] = [];
    for (let k = 11; k >= 0; k--) {
      const d = new Date(anoBase, mesBase - 1 - k, 1);
      const chave = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      arr.push({ chave, label: `${MESES_CURTOS[d.getMonth()]}/${String(d.getFullYear()).slice(2)}`, baixado: 0, atraso: 0, qtd: 0 });
    }
    const idx = new Map(arr.map((m, i) => [m.chave, i]));
    for (const r of recebimentos) {
      const refMes = r.situacao === 'baixado' && r.baixadoEm ? r.baixadoEm.slice(0, 7) : r.vencimento.slice(0, 7);
      const i = idx.get(refMes);
      if (i == null) continue;
      arr[i].qtd += 1;
      if (r.situacao === 'baixado') arr[i].baixado += r.valorRecebido ?? 0;
      else if (r.situacao === 'em_atraso' && r.vencimento < hojeIso) arr[i].atraso += r.valorCombinado;
    }
    return arr;
  }, [recebimentos, chaveMes, hojeIso]);

  const maxVal = Math.max(1, ...meses.map((m) => m.baixado + m.atraso));

  // Geometria do SVG
  const W = 720, H = 170, padB = 26, padT = 8, padX = 12;
  const areaH = H - padB - padT;
  const slot = (W - padX * 2) / meses.length;
  const barW = Math.min(34, slot * 0.6);

  function posicionarTooltip(i: number, event: React.MouseEvent<SVGGElement>) {
    const area = areaGraficoRef.current?.getBoundingClientRect();
    if (!area) return;
    setHover({ i, x: event.clientX - area.left + 20, y: event.clientY - area.top });
  }

  return (
    <div>
      <h3 className={styles.sectionTitle}>Resultados</h3>

      <div className={`${styles.cardsGrid} ${mesFuturo ? styles.cardsGridSomentePrevisto : ''}`} style={{ marginBottom: 18 }}>
        {mesFuturo ? (
          <div className={styles.statCard}><div className={styles.statLabel}>Total previsto</div><div className={styles.statValue}>{formatarMoeda(totais.totalPrevisto)}</div></div>
        ) : (
          <>
            <div className={styles.statCard}><div className={styles.statLabel}>Recebido / baixado</div><div className={styles.statValue}>{formatarMoeda(totais.baixado)}</div></div>
            <div className={styles.statCard}><div className={styles.statLabel}>Aguardando conferência</div><div className={styles.statValue}>{formatarMoeda(totais.aguardando)}</div></div>
            <div className={styles.statCard}><div className={styles.statLabel}>Em atraso</div><div className={styles.statValue}>{formatarMoeda(totais.atraso)}</div></div>
            <div className={styles.statCard}><div className={styles.statLabel}>Total previsto</div><div className={styles.statValue}>{formatarMoeda(totais.totalPrevisto)}</div></div>
          </>
        )}
      </div>

      {!mesFuturo && (
        <div className={styles.statCard}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <strong style={{ fontSize: 13, color: COR_PRIMARIA }}>Últimos 12 meses</strong>
          <div style={{ display: 'flex', gap: 12, fontSize: 11, color: '#64748b' }}>
            <span><span style={{ display: 'inline-block', width: 10, height: 10, background: COR_PRIMARIA, borderRadius: 2, marginRight: 4 }} />Baixado</span>
            <span><span style={{ display: 'inline-block', width: 10, height: 10, background: '#f87171', borderRadius: 2, marginRight: 4 }} />Em atraso</span>
          </div>
        </div>

        <div className={styles.chartTooltipArea} ref={areaGraficoRef}>
          <div className={styles.chartWrap}>
            <svg className={styles.chart} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet" role="img" aria-label="Gráfico de torres dos últimos 12 meses">
            <line x1={padX} y1={H - padB} x2={W - padX} y2={H - padB} stroke="#e2e8f0" strokeWidth={1} />
            {meses.map((m, i) => {
              const cx = padX + slot * i + slot / 2;
              const totalMes = m.baixado + m.atraso;
              const hBaixado = (m.baixado / maxVal) * areaH;
              const hAtraso = (m.atraso / maxVal) * areaH;
              const baseY = H - padB;
              const yAtraso = baseY - hAtraso;
              const yBaixado = yAtraso - hBaixado;
              return (
                <g
                  key={m.chave}
                  className={styles.bar}
                  onMouseMove={(e) => posicionarTooltip(i, e)}
                  onMouseLeave={() => setHover(null)}
                >
                  {/* área de captura */}
                  <rect x={cx - slot / 2} y={padT} width={slot} height={H - padB - padT} fill="transparent" />
                  {totalMes === 0 && <rect x={cx - barW / 2} y={baseY - 3} width={barW} height={3} rx={1.5} fill="#e2e8f0" />}
                  {hAtraso > 0 && <rect x={cx - barW / 2} y={yAtraso} width={barW} height={hAtraso} rx={3} fill="#f87171" />}
                  {hBaixado > 0 && <rect x={cx - barW / 2} y={yBaixado} width={barW} height={hBaixado} rx={3} fill={COR_PRIMARIA} />}
                  <text x={cx} y={H - 10} textAnchor="middle" fontSize={10} fill="#94a3b8">{m.label}</text>
                </g>
              );
            })}
            </svg>
          </div>
          {hover && (
            <div className={styles.tooltip} style={{ left: hover.x, top: hover.y }}>
              <div style={{ fontWeight: 800, marginBottom: 2 }}>{meses[hover.i].label}</div>
              <div>Baixado: <b>{formatarMoeda(meses[hover.i].baixado)}</b></div>
              <div>Em atraso: <b>{formatarMoeda(meses[hover.i].atraso)}</b></div>
              <div>Recebimentos: <b>{meses[hover.i].qtd}</b></div>
            </div>
          )}
        </div>
        </div>
      )}
    </div>
  );
}

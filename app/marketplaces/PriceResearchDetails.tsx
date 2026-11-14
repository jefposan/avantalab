'use client';
import {useId,useRef,useState,type CSSProperties} from 'react';
import BotaoAcaoCompacto from '@/app/components/BotaoAcaoCompacto';
import {formatarMoeda} from '@/app/lib/formatters';
import {marketplaceDateTimeLabel} from '@/app/modules/marketplaces/date-format';
import type {MarketPriceResearch} from '@/app/modules/marketplaces/market-price-research';
import styles from './price-research-details.module.css';
type Offer={title:string;seller:string;price:number;url:string};
const reasons:Record<string,string>={dados_invalidos:'Dados incompletos',anuncio_repetido:'Anúncio repetido',outro_produto:'Outro produto',condicao_ou_indisponivel:'Condição ou disponibilidade',nossas_contas:'Nossas contas',mesmo_vendedor:'Mesmo vendedor',valor_extremo:'Valores extremos'};
export default function PriceResearchDetails({research,offers=[],consultedAt,dark,brand,loadResearch}:{research?:MarketPriceResearch|null;offers?:Offer[];consultedAt?:string;dark?:boolean;brand?:string;loadResearch?:()=>Promise<MarketPriceResearch|null>}){
 const [open,setOpen]=useState(false),[loaded,setLoaded]=useState<MarketPriceResearch|null|undefined>(undefined),[loading,setLoading]=useState(false),[error,setError]=useState('');
 const id=useId(),busy=useRef(false),receipt=research||loaded,items=receipt?.offers||offers;
 if(!research&&!offers.length&&!loadResearch)return null;
 async function toggle(){
  setOpen(!open);if(open||!loadResearch||research||loaded!==undefined||busy.current)return;
  busy.current=true;setLoading(true);setError('');try{setLoaded(await loadResearch());}catch(e){setError(e instanceof Error?e.message:'Não foi possível carregar os resultados.');}finally{busy.current=false;setLoading(false);}
 }
 return <section className={styles.root} data-dark={dark||undefined} style={{'--brand':brand||'#003e73'} as CSSProperties} aria-label="Resultados da pesquisa de preços">
  <BotaoAcaoCompacto aria-expanded={open} aria-controls={id} onClick={()=>void toggle()}>{open?'Ocultar resultados da pesquisa':'Ver resultados da pesquisa'}<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d={open?'m6 15 6-6 6 6':'m6 9 6 6 6-6'}/></svg></BotaoAcaoCompacto>
  <div id={id} hidden={!open} className={styles.content}>
   {loading?<p role="status">Carregando resultados salvos…</p>:error?<p role="alert">{error}</p>:<>
    {receipt?<><p><strong>{receipt.provider==='ml_web_search'?'Mercado Livre + pesquisa web com IA':'Última pesquisa no Mercado Livre · consulta direta'}</strong></p><p>{receipt.message}</p><dl className={styles.facts}>
     <div><dt>Ofertas no catálogo</dt><dd>{receipt.totalReported??'Não informado'}</dd></div><div><dt>Ofertas consultadas no ML</dt><dd>{receipt.fetchedCount}</dd></div><div><dt>{receipt.provider==='ml_web_search'?'Ofertas consideradas':'Vendedores considerados'}</dt><dd>{receipt.count}</dd></div>
     <div><dt>Média da amostra</dt><dd>{receipt.mean==null?'—':formatarMoeda(receipt.mean)}</dd></div><div><dt>Mediana</dt><dd>{receipt.median==null?'—':formatarMoeda(receipt.median)}</dd></div><div><dt>Faixa da amostra</dt><dd>{receipt.minimum==null?'—':`${formatarMoeda(receipt.minimum)} a ${formatarMoeda(receipt.maximum!)}`}</dd></div>
    </dl><p>Consulta: {marketplaceDateTimeLabel(receipt.checkedAt)}</p>{receipt.complement&&<p>{receipt.complement.message} Ofertas complementares consideradas: {receipt.complement.accepted}.</p>}<p>{receipt.provider==='ml_web_search'?'Uma oferta por vendedor no ML e por domínio de loja na pesquisa web, usando o menor preço confirmado para cada um.':'Uma oferta por vendedor, usando o menor preço retornado para ele.'} Contas próprias, duplicatas e valores extremos ficam fora do cálculo. Preços podem variar por conta; frete personalizado não está incluído.</p>
    {Object.keys(receipt.exclusions).length>0&&<p>Fora do cálculo: {Object.entries(receipt.exclusions).map(([reason,n])=>`${reasons[reason]||reason}: ${n}`).join(' · ')}.</p>}</>:items.length?<><p><strong>Ofertas da pesquisa anterior</strong></p>{consultedAt&&<p>Consulta: {marketplaceDateTimeLabel(consultedAt)}</p>}</>:<p>Nenhuma pesquisa direta do Mercado Livre foi salva para este produto. Use Atualizar preço para consultar.</p>}
    {!!items.length&&<ul className={styles.offers} aria-label="Fontes dos preços">{items.map((offer,index)=><li key={`${offer.url}:${index}`}><a href={offer.url} target="_blank" rel="noreferrer"><span><strong>{offer.seller}</strong><small>{offer.title}</small></span><b>{formatarMoeda(offer.price)}</b></a></li>)}</ul>}
   </>}
  </div>
 </section>;
}

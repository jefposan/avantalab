'use client';
import BotaoAcaoCompacto from '@/app/components/BotaoAcaoCompacto';
import CarregamentoDadosModulo from '@/app/components/CarregamentoDadosModulo';
import styles from './consulta/marketplaces-mobile.module.css';
export default function PriceSearchProgress({onCancel,brand,local=false}:{onCancel:()=>void;brand?:string;local?:boolean}) {
  const message=local?'Carregando produto…':'Pesquisando preços…';
  return <div className={styles.searchProgress}>
    <div className={styles.searchProgressLabel}><div aria-hidden="true"><CarregamentoDadosModulo ativo variante="indicador" titulo={local?'Produto':'Pesquisa'} mensagem={message} corPrimaria={brand}/></div><span role="status">{message}</span></div>
    <BotaoAcaoCompacto aria-label="Cancelar pesquisa" onClick={onCancel}>Cancelar</BotaoAcaoCompacto>
  </div>;
}

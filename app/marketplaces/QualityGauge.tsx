import {qualityGaugeGeometry} from '@/app/modules/marketplaces/quality-gauge';
import styles from './listing-quality.module.css';
export default function QualityGauge({score,level,label='Qualidade'}:{score:number|null;level:string;label?:string}){
 const g=qualityGaugeGeometry(score);
 return <div className={styles.gauge} role="img" aria-label={g?`${label} ${score} de 100. ${level}`:`${label} ainda não avaliada`}>
  <svg viewBox="0 0 280 165" aria-hidden="true">
   <path d="M36 133 A104 104 0 0 1 244 133" className={styles.track}/>
   {g&&<><path d={`M36 133 A104 104 0 0 1 ${g.x} ${g.y}`} className={styles.progress}/><line x1="140" y1="133" x2={g.nx} y2={g.ny} className={styles.needle}/><circle cx="140" cy="133" r="8" className={styles.hub}/></>}
   <text x="31" y="158" textAnchor="middle">0</text><text x="140" y="13" textAnchor="middle">50</text><text x="249" y="158" textAnchor="middle">100</text>
  </svg>
  <div><strong>{g?score?.toLocaleString('pt-BR'):'—'}<small>/ 100</small></strong><span>{g?level:'Ainda não avaliado'}</span></div>
 </div>;
}

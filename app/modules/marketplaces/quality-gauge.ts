/** Mesma geometria no SSR e no navegador, inclusive nos extremos 0 e 100. */
export function qualityGaugeGeometry(score:number|null){
 if(typeof score!=='number'||!Number.isFinite(score)||score<0||score>100)return null;
 const angle=Math.PI*(1-score/100),round=(v:number)=>Math.round(v*1000)/1000;
 return {x:round(140+104*Math.cos(angle)),y:round(133-104*Math.sin(angle)),nx:round(140+77*Math.cos(angle)),ny:round(133-77*Math.sin(angle))};
}

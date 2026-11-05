import {attributeChanges,type ContentEditor} from './listing-content';
export type QualityFact={key:string;field:string;name:string;value:string;valueId?:string|null;source:string;sourceUrl?:string;evidence?:string};
export type QualitySuggestion={field:string;name:string;value:string;source:string;sourceUrl?:string;evidence?:string};
/** O modelo só escolhe evidências. Nunca pode criar um valor técnico novo. */
export function groundedQualitySuggestions(editor:ContentEditor,facts:QualityFact[],choices:unknown):QualitySuggestion[]{
 if(!Array.isArray(choices)||choices.length>100)throw Error('A IA não retornou uma revisão válida.');
 const result:QualitySuggestion[]=[];
 for(const key of choices){
  if(typeof key!=='string')continue;
  const fact=facts.find(f=>f.key===key),rule=fact&&editor.attributes.find(a=>a.id===fact.field);
  if(!fact||!rule?.editable||rule.value.trim()||rule.valueId||result.some(r=>r.field===rule.id))continue;
  const peers=facts.filter(f=>f.field===fact.field);
  if(new Set(peers.map(f=>f.valueId||f.value.trim().toLowerCase())).size!==1)continue;
  const value=['list','boolean'].includes(rule.type)?rule.options.find(o=>o.id===fact.valueId||o.name.toLowerCase()===fact.value.toLowerCase())?.id:fact.value;
  if(!value)continue;
  try{attributeChanges(editor,{[rule.id]:value});result.push({field:rule.id,name:rule.name,value,source:fact.source,...(fact.sourceUrl?{sourceUrl:fact.sourceUrl,evidence:fact.evidence}:{})});}catch{/* Evidência incompatível com a regra do ML fica pendente. */}
 }
 return result;
}
export function qualityUsageCost(input:number,output:number,webCalls=0){return Number.isSafeInteger(input)&&input>=0&&input<=60000&&Number.isSafeInteger(output)&&output>=0&&output<=3000&&Number.isSafeInteger(webCalls)&&webCalls>=0&&webCalls<=2?Math.ceil(input*.75+output*4.5)+webCalls*10000:100000;}

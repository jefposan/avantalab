// Laboratório: somente extração de intenção; não acessa dados nem executa ações.
import { readFileSync } from 'node:fs';
import { parseEnv } from 'node:util';
import { isDeepStrictEqual } from 'node:util';
import { interpretVoiceCommand } from '../app/lib/vendas-voice/interpreter.ts';
import { validateVoiceIntent } from '../app/lib/vendas-voice/validation.mjs';

const item = (productReference, quantity) => ({ productReference, quantity });
const order = (customerReference, items = [], extras = {}) => ({ intent: 'create_order', customerReference, items, ...extras });
const pay = (customerReference, amount, paymentMethod, extras = {}) => ({ intent: 'register_payment', customerReference, amount, paymentMethod, ...extras });
const baseline = order('Lia da Ótica', [item('shampoo de 1 litro', 2), item('máscara prata', 1)], { discountPercent: 5 });
const paid = pay('Rui do Mercado', 120, 'Pix', { discountAmount: 10 });
const booked = { intent: 'create_appointment', customerReference: 'Nina da Vila' };
const cases = [
  ['pedido simples', 'Faça um pedido para Lia da Ótica de três shampoos de 300 ml', order('Lia da Ótica',[item('shampoos de 300 ml',3)])],
  ['qualificador', 'Lance para a Lia influencer', order('Lia influencer')],
  ['qualificador e produto', 'Para a Ana da Renata, coloca duas máscaras de brilho', order('Ana da Renata',[item('máscaras de brilho',2)])],
  ['dois volumes', 'Pedido para Nina da Vila: dois shampoos de 300 ml e um shampoo de um litro', order('Nina da Vila',[item('shampoos de 300 ml',2),item('shampoo de um litro',1)])],
  ['atributo composto', 'Crie um pedido para Rui do Mercado com uma Triliss orgânica', order('Rui do Mercado',[item('Triliss orgânica',1)])],
  ['kit sem termos', 'Pedido da Mara: dois kits cabelos normais', order('Mara',[item('kits cabelos normais',2)])],
  ['consignado', 'Deixa em consignação para Ana do Salão dois condicionadores de 500 ml', order('Ana do Salão',[item('condicionadores de 500 ml',2)],{intent:'create_consignment'})],
  ['não inferir consignação', 'Monte pedido para Caio, um sérum de 15 ml, sem informar forma de pagamento', order('Caio',[item('sérum de 15 ml',1)])],
  ['desconto em reais', 'Pedido para Bia: duas máscaras prata com quinze reais de desconto no total', order('Bia',[item('máscaras prata',2)],{discountAmount:15})],
  ['desconto em percentual', 'Pedido da Dena: um kit de cachos, desconto de oito por cento', order('Dena',[item('kit de cachos',1)],{discountPercent:8})],
  ['corrigir volume', 'Troque o shampoo de um litro pelo shampoo de 300 ml, mesma quantidade e deixa o resto', order('Lia da Ótica',[item('shampoo de 300 ml',2),item('máscara prata',1)],{discountPercent:5}),baseline],
  ['retirar item', 'Retire somente a máscara prata', order('Lia da Ótica',[item('shampoo de 1 litro',2)],{discountPercent:5}),baseline],
  ['trocar quantidade', 'Muda para quatro unidades de shampoo de um litro', order('Lia da Ótica',[item('shampoo de 1 litro',4),item('máscara prata',1)],{discountPercent:5}),baseline],
  ['retirar desconto', 'Tira o desconto, mantém os itens', order('Lia da Ótica',baseline.items),baseline],
  ['novo pedido após pergunta', 'Agora é outro pedido: Nina da Vila, um sérum de 15 ml', order('Nina da Vila',[item('sérum de 15 ml',1)]),baseline],
  ['complementar produto', 'Duas máscaras de brilho de 150 gramas', order('Ana da Renata',[item('máscaras de brilho de 150 gramas',2)]),order('Ana da Renata')],
  ['pagamento centavos', 'Recebi mil duzentos e cinquenta reais e quarenta centavos da Mara por Pix',pay('Mara',1250.4,'Pix')],
  ['pagamento sem meio', 'Registra 32 reais e cinco centavos que a Bia pagou',pay('Bia',32.05,null)],
  ['meio e desconto', 'Caio pagou cento e vinte no cartão de débito com desconto de dez reais',pay('Caio',120,'Cartão de débito',{discountAmount:10})],
  ['corrigir meio', 'Foi no cartão de crédito, não no Pix',pay('Rui do Mercado',120,'Cartão de crédito',{discountAmount:10}),paid],
  ['corrigir valor', 'Na verdade foram cento e quarenta e cinco reais e cinquenta centavos',pay('Rui do Mercado',145.5,'Pix',{discountAmount:10}),paid],
  ['desconto de saldo', 'Aplica cinco por cento de desconto em vez dos dez reais',pay('Rui do Mercado',120,'Pix',{discountPercent:5}),paid],
  ['consulta saldo', 'A Ana da Renata ainda deve alguma coisa? Não lance pagamento', {intent:'query_customer_history',customerReference:'Ana da Renata'}],
  ['consulta último pedido', 'Só quero ver o último pedido do Rui do Mercado',{intent:'query_customer_history',customerReference:'Rui do Mercado'}],
  ['vendas hoje', 'Quanto vendi hoje?',{intent:'query_sales',period:'today'}],
  ['vendas mês anterior', 'Qual foi o total dos pedidos do mês passado?',{intent:'query_sales',period:'last_month'}],
  ['vendas todo histórico', 'Quanto vendi desde que comecei, no histórico inteiro?',{intent:'query_sales',period:'all'}],
  ['agendamento relativo', 'Agende uma entrega para Nina da Vila amanhã às nove e meia da manhã',{...booked,scheduledDate:'2026-11-29',scheduledTime:'09:30',appointmentType:'Entrega'}],
  ['agendamento sem data', 'Quero agendar uma visita para Nina da Vila',{...booked,appointmentType:'Visita'}],
  ['completar agendamento', 'Amanhã às duas da tarde',{...booked,scheduledDate:'2026-11-29',scheduledTime:'14:00',appointmentType:'Entrega'},{...booked,appointmentType:'Entrega'}],
  ['não executar exclusão', 'Apague o pagamento da Mara que já está registrado',{intent:'unsupported'}],
  ['não emitir NF', 'Emita a nota fiscal do último pedido do Caio',{intent:'unsupported'}],
  ['não editar registro', 'Altere o preço daquele consignado já gravado da Ana',{intent:'unsupported'}],
  ['desambiguação cliente', 'É a Ana do Salão, não a Ana da Renata',order('Ana do Salão',[item('sérum de 15 ml',1)]),order('Ana',[item('sérum de 15 ml',1)]),[{label:'Ana do Salão', detail:'Salão'},{label:'Ana da Renata',detail:'Renata'}]],
];

const normalize = (s) => s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()
  .replace(/\bum litro\b/g,'1 litro').replace(/\bgramas\b/g,'g')
  .replace(/\b(shampoo|mascara|condicionador|kit)s\b/g,'$1')
  .replace(/[^a-z0-9]+/g,' ').trim();
const canonical = (draft) => {
  const {unsupportedReason, ...fields} = draft;
  for(const field of ['customerReference','appointmentNotes']) if(fields[field]) fields[field]=normalize(fields[field]);
  fields.items=fields.items.map(({productReference,quantity})=>({productReference:normalize(productReference),quantity})).sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b)));
  return fields;
};
const models = ['gpt-4o-mini','gpt-6-luna'];
const prices = { 'gpt-4o-mini':[.15,.60,.075], 'gpt-6-luna':[.10,.50,.01] };
const originalFetch = globalThis.fetch;
const usages = new Map();
const { AsyncLocalStorage } = await import('node:async_hooks');
const scope = new AsyncLocalStorage();
if (!process.env.OPENAI_API_KEY && !process.env.OPENAI_API_KEY_AVA) {
  const env = parseEnv(readFileSync('/Users/JEFF/avantalab/.env.local','utf8'));
  process.env.OPENAI_API_KEY = env.OPENAI_API_KEY || env.OPENAI_API_KEY_AVA || '';
}
if (!process.env.OPENAI_API_KEY && !process.env.OPENAI_API_KEY_AVA) throw new Error('Credencial de API não configurada');
globalThis.fetch = async (url, options) => {
  if (url !== 'https://api.openai.com/v1/chat/completions') throw new Error('Destino inesperado');
  const {model,key} = scope.getStore();
  const payload = JSON.parse(options.body);
  payload.model=model;
  payload.store=false;
  const context = JSON.parse(payload.messages[1].content);
  context.reference_date='2026-11-28';
  payload.messages[1].content=JSON.stringify(context);
  if(model==='gpt-6-luna'){
    delete payload.temperature;
    delete payload.max_tokens;
    payload.max_completion_tokens=500;
    payload.reasoning_effort='none';
  }
  const response = await originalFetch(url, {...options, body:JSON.stringify(payload), signal:AbortSignal.timeout(25000)});
  const result = await response.json();
  usages.set(key, {status:response.status,usage:result.usage,error:result.error?.code || result.error?.type || null, detail:response.ok?null:String(result.error?.message||'').replace(/sk-[\w-]+/g,'[redigido]').slice(0,260), model:result.model});
  return new Response(JSON.stringify(response.ok ? result : {error:{message:result.error?.code||response.status}}),{status:response.status});
};
const trials = [];
async function run(row, index, model) {
  const [name,transcription,expected,previousDraft,candidates] = row;
  const key=index+':'+model;
  const start=performance.now();
  let actual=null,error=null;
  try { actual=canonical((await scope.run({model,key},()=>interpretVoiceCommand({transcription,previousDraft:previousDraft?validateVoiceIntent(previousDraft):null,candidates}))).intent); }
  catch(e){error=String(e.message).replace(/sk-[\w-]+/g,'[redigido]');}
  const ms=Math.round(performance.now()-start);
  const api=usages.get(key)||{};
  const usage=api.usage;
  const cached=usage?.prompt_tokens_details?.cached_tokens||0;
  const [input,output,cache]=prices[model];
  const usd=usage?((usage.prompt_tokens-cached)*input+cached*cache+usage.completion_tokens*output)/1e6:null;
  const target=canonical(validateVoiceIntent(expected));
  const differences=actual?Object.keys(target).filter(k=>!isDeepStrictEqual(actual[k],target[k])).map(k=>({field:k,expected:target[k],actual:actual[k]})):[];
  return {model,name,index,ms,usd,api,error,exact:Boolean(actual)&&!differences.length,differences};
}
const sample=await Promise.all(models.map(model=>run(cases[0],0,model)));
if(sample.some(x=>x.error)){ console.log(JSON.stringify({preflight:sample},null,2)); process.exit(2); }
trials.push(...sample);
let cursor=1;
await Promise.all(Array.from({length:3},async()=>{
  for(;;){
    const i=cursor++;
    if(i>=cases.length)break;
    const order=i%2?[...models].reverse():models;
    for(const model of order)trials.push(await run(cases[i],i,model));
  }
}));
const percentile=(values,p)=>values[Math.ceil(values.length*p)-1];
const summary=models.map(model=>{
  const all=trials.filter(x=>x.model===model);
  const ms=all.filter(x=>!x.error).map(x=>x.ms).sort((a,b)=>a-b);
  const usd=all.reduce((a,x)=>a+(x.usd||0),0);
  const exact=all.filter(x=>x.exact).length;
  return {model,cases:all.length,exact,errors:all.filter(x=>x.error).length,p50:percentile(ms,.5),p95:percentile(ms,.95),usd,usdPer1000:usd/all.length*1000,usdPerExact:usd/exact,critical:all.filter(x=>x.differences.some(d=>['intent','amount','paymentMethod','scheduledDate','scheduledTime','items','discountAmount','discountPercent','customerReference'].includes(d.field))).length};
});
console.log(JSON.stringify({summary,trials},null,2));

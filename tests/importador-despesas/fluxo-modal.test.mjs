import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {webcrypto} from 'node:crypto';
import vm from 'node:vm';
import ts from 'typescript';
import * as tiposPlanilha from '../../app/modules/importador-despesas/lib/tipos-planilha.ts';
import {validarReciboImportacao} from '../../app/modules/importador-despesas/lib/confirmacao.ts';
const require=createRequire(import.meta.url);
const file='app/modules/importador-despesas/components/ImportadorDespesasModal.tsx';
const source=readFileSync(file,'utf8');
const names=[...source.matchAll(/const \[(\w+),\s*set\w+\] = useState/g)].map(x=>x[1]);
const item={id:'linha-1',data:'2026-10-10',descricao:'Mercado',descricaoOriginal:'Mercado',valor:35.5,valorOriginal:35.5,tipo:'Alimentação',incluir:true,natureza:'despesa'};
function harness(options={}){
 const states=new Map(Object.entries({etapa:'revisando',itens:[{...item}],totalDocumento:35.5,loteChave:'arquivo-hash',...options.states}));
 const refs=[],effects=[],timeouts=[],requests=[],calls={finished:0,closed:0,expired:0,removed:0,drafts:[],draftStatus:[]};let cursor=0,refCursor=0,tree;
 const db={auth:{getSession:async()=>({data:{session:options.expired?null:{access_token:'local-test',user:{id:'usuario'}}}}),refreshSession:async()=>({data:{session:null},error:null})},from:table=>({upsert:async(row,config)=>{calls.drafts.push({table,row,config});return{error:options.draftFailure?{message:'Falha controlada'}:null};},delete:()=>{const q={eq:()=>q,match:()=>q,then:(resolve,reject)=>options.cleanupFailure?Promise.reject(Error('Falha ao limpar rascunho')).then(resolve,reject):Promise.resolve({error:null}).then(resolve,reject)};return q;}})};
 const win={setInterval:()=>1,clearInterval(){},setTimeout:fn=>{timeouts.push(fn);return timeouts.length;},clearTimeout(){},localStorage:{removeItem(){calls.removed++;}}};
 const exports={};vm.runInNewContext(ts.transpileModule(source.replace('onClick={() => void confirmar()}', 'onClick={() => confirmar()}')+'\nexport const testing={parseData,parseValor,linhasTabulares,lerTexto,dataNoMesDestino,linhaCabecalho};',{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}).outputText,{exports,crypto:webcrypto,TextEncoder,Uint8Array,Date,Intl,Error,Number,Map,Set,URLSearchParams,AbortSignal,FormData,console,window:win,fetch:async(path,init)=>{const body=init.body instanceof FormData?null:JSON.parse(init.body);requests.push({path,body});if(path.endsWith('/analisar'))return Response.json(options.analysis||{tipo_documento:'fatura-cartao',total_documento:30,despesas:[{pagina:1,data:'2026-09-10',descricao:'Mercado',valor:35.5,cartao_final:null}],estornos:[{pagina:1,data:'2026-09-11',descricao:'Estorno',valor:5.5,cartao_final:null}],envios_restantes:2});if(path.endsWith('/sugestoes'))return Response.json({sugestoes:options.suggestionType?body.itens.map(i=>({id:i.id,tipo:options.suggestionType,ocorrencias:10})):[]});return options.response||Response.json({erro:false,resultado:{total:body.lancamentos.length,inseridos:body.lancamentos.length,ignorados:0,lote_chave:body.loteChave}});},require(id){if(id==='react')return{useState:v=>{const name=names[cursor++];if(!states.has(name))states.set(name,v);return[states.get(name),value=>states.set(name,typeof value==='function'?value(states.get(name)):value)];},useMemo:fn=>fn(),useRef:v=>refs[refCursor++]??(refs[refCursor-1]={current:v}),useEffect:fn=>effects.push(fn)};if(id==='@/app/lib/supabase')return{supabase:db};if(id==='../lib/confirmacao')return{validarReciboImportacao};if(id==='../lib/tipos-planilha')return tiposPlanilha;return require(id);}});
 const props={arquivo:new File(['data;tipo de despesa;descrição;valor\n10/10/2026;Alimentação;Mercado;35,50'],'despesas.csv'),empresaId:'empresa',mesDestino:'OUTUBRO',anoDestino:2026,despesasCadastradas:[{nome:'Alimentação'}],corPrimaria:'#003e73',darkMode:false,onFechar:()=>calls.closed++,onConcluido:()=>calls.finished++,onSessaoExpirada:()=>calls.expired++,onEstadoRascunho:value=>calls.draftStatus.push(value),...options.props};
 const render=()=>{cursor=0;refCursor=0;effects.length=0;tree=exports.default(props);return tree;};render();
 function nodes(node,found=[]){if(!node||typeof node!=='object')return found;if(Array.isArray(node)){node.forEach(n=>nodes(n,found));return found;}found.push(node);nodes(node.props?.children,found);return found;}
 return {states,calls,requests,testing:exports.testing,render,async confirm(){render();const button=nodes(tree).find(n=>n.type==='button'&&n.props.children==='Confirmar e lançar despesas');assert.ok(button,'botão de confirmação existe');assert.equal(button.props.disabled,false,'formulário válido habilita confirmação');await button.props.onClick();await new Promise(r=>setImmediate(r));},flush(){timeouts.splice(0).forEach(fn=>fn());},async analyze(){render();effects.find(fn=>fn.toString().includes('if (arquivo)'))();await new Promise(r=>setTimeout(r,40));this.flush();},async autosave(){render();effects.find(fn=>fn.toString().includes("etapa !== 'revisando'"))();this.flush();await new Promise(r=>setImmediate(r));},reconcileTypes(tipos){props.despesasCadastradas=tipos.map(nome=>({nome}));render();effects.find(fn=>fn.toString().includes('reconciliarTipoPlanilha'))();render();},nodes:()=>nodes(tree)};
}

test('CSV e modelo Excel preservam valores, tipos, datas e linhas parcialmente preenchidas',async()=>{
 const h=harness();const parsed=h.testing.lerTexto('Data;Tipo de despesa;Descrição;Valor\n10/10/2026;Alimentação;Mercado;35,50',['Alimentação']);assert.equal(parsed[0].tipo,'Alimentação');assert.equal(parsed[0].valor,35.5);
 const XLSX=require('xlsx');const workbook=XLSX.read(readFileSync('public/modelos/modelo-importacao-despesas-avantalab.xlsx'),{type:'buffer',cellDates:true});const sheet=workbook.Sheets[workbook.SheetNames[0]];
 XLSX.utils.sheet_add_aoa(sheet,[[new Date(2026,9,10),'Alimentação','Mercado',35.5]],{origin:'A4'});
 const saved=XLSX.read(XLSX.write(workbook,{type:'buffer',bookType:'xlsx'}),{type:'buffer',cellDates:true});const rows=XLSX.utils.sheet_to_json(saved.Sheets[saved.SheetNames[0]],{header:1,defval:''});const header=h.testing.linhaCabecalho(rows);assert.ok(header>=0);const items=h.testing.linhasTabulares(rows[header].map(String),rows.slice(header+1),['Alimentação']);assert.equal(items[0].tipo,'Alimentação');assert.equal(items[0].valor,35.5);assert.equal(items[0].data,'2026-10-10');
});
test('revisão válida envia um lote e atualiza o financeiro após confirmação',async()=>{const h=harness();await h.confirm();assert.equal(h.requests.length,1);assert.equal(h.requests[0].path,'/api/importador-despesas/confirmar');assert.equal(h.requests[0].body.lancamentos[0].tipo_despesa,'Alimentação');assert.equal(h.calls.finished,1);h.flush();assert.equal(h.calls.closed,1);});
test('falha de gravação retorna à revisão com mensagem e preserva as despesas',async()=>{const h=harness({response:Response.json({erro:true,mensagem:'Sem permissão'},{status:403})});await h.confirm();assert.equal(h.states.get('etapa'),'revisando');assert.equal(h.states.get('erro'),'Sem permissão');assert.equal(h.states.get('itens').length,1);assert.equal(h.calls.finished,0);});
test('sessão expirada não deixa o importador preso em Inserindo lançamentos',async()=>{const h=harness({expired:true});await h.confirm();assert.equal(h.calls.expired,1);assert.equal(h.states.get('etapa'),'revisando');assert.match(h.states.get('erro'),/sessão/i);assert.equal(h.requests.length,0);});
test('falha ao limpar rascunho após gravação não transforma sucesso em erro nem impede atualizar a tela',async()=>{const h=harness({cleanupFailure:true});await h.confirm();assert.equal(h.calls.finished,1);h.flush();assert.equal(h.calls.closed,1);});
test('resposta sem confirmação válida não é tratada como despesa lançada',async()=>{const h=harness({response:Response.json({})});await h.confirm();assert.equal(h.calls.finished,0);assert.equal(h.states.get('etapa'),'revisando');assert.match(h.states.get('erro'),/confirm|resposta/i);});

test('fatura PDF: despesas e estornos separados, mês de destino e confirmação revisada',async()=>{
 const h=harness({states:{itens:[],totalDocumento:null},props:{arquivo:new File(['%PDF fixture'],'fatura.pdf',{type:'application/pdf'})}});
 await h.analyze();assert.equal(h.states.get('erro'),'');assert.equal(h.states.get('etapa'),'revisando');
 const items=h.states.get('itens');assert.equal(items.length,2);assert.equal(items[1].natureza,'estorno');assert.equal(items[1].incluir,false);assert.equal(items[0].data,'2026-10-10');
 h.states.set('itens',items.map(x=>({...x,tipo:x.natureza==='despesa'?'Alimentação':''})));await h.confirm();
 assert.equal(h.requests.at(-1).body.lancamentos.length,1);assert.equal(h.requests.at(-1).body.lancamentos[0].valor,35.5);assert.equal(h.calls.finished,1);
});
test('extrato CSV lê, revisa e confirma apenas saídas no mês escolhido',async()=>{
 const h=harness({states:{itens:[],totalDocumento:null},props:{arquivo:new File(['Data;Histórico;Valor\n10/09/2026;Mercado;-35,50\n11/09/2026;Salário;1000,00'],'extrato.csv')}});
 await h.analyze();assert.equal(h.states.get('erro'),'');assert.equal(h.states.get('itens').length,1);
 h.states.set('itens',h.states.get('itens').map(x=>({...x,tipo:'Alimentação'})));await h.confirm();assert.equal(h.calls.finished,1);assert.equal(h.requests.at(-1).body.lancamentos[0].data,'2026-10-10');
});

test('mês envia o centro escolhido e não confirma contexto obrigatório sem centro',async()=>{
 const f=harness({props:{centroCustoId:'5a1035ad-997f-4849-b047-903f4ee3402f',centroCustoNome:'LIKA',centroObrigatorio:true}});await f.confirm();
 assert.equal(f.requests[0].body.centroCustoId,'5a1035ad-997f-4849-b047-903f4ee3402f');assert.equal(f.calls.finished,1);
 const missing=harness({props:{centroObrigatorio:true}});await missing.confirm();assert.equal(missing.requests.length,0);assert.match(missing.states.get('erro'),/centro de custo/);
});

test('salvamento automático separa centros e só informa salvo após sucesso',async()=>{
 for(const center of ['5a1035ad-997f-4849-b047-903f4ee3402f','822d2787-eccf-4db7-b8c3-8f5aea5f4330']){
  const f=harness({props:{centroCustoId:center,centroObrigatorio:true}});await f.autosave();assert.equal(f.calls.drafts[0].table,'importador_despesas_rascunhos_centros');assert.equal(f.calls.drafts[0].row.centro_custo_id,center);assert.equal(f.calls.drafts[0].row.dados.centroCustoId,center);assert.equal(f.calls.draftStatus.at(-1),true);
 }
 const failed=harness({draftFailure:true,props:{centroCustoId:'5a1035ad-997f-4849-b047-903f4ee3402f',centroObrigatorio:true}});await failed.autosave();assert.equal(failed.calls.draftStatus.includes(true),false);assert.match(failed.states.get('erro'),/salvar automaticamente/);assert.equal(failed.states.get('itens').length,1);
});

test('tipo vindo da planilha não se perde se os tipos do perfil chegarem depois, em qualquer centro',()=>{
 for(const centroCustoId of ['principal','lika','luciana']){
  const parsed=fixtureParse();const f=harness({props:{centroCustoId,despesasCadastradas:[]},states:{itens:parsed}});
  assert.equal(f.states.get('itens')[0].tipo,'');assert.equal(f.states.get('itens')[0].tipoInformado,'Água');
  f.reconcileTypes(['Água','Energia']);assert.equal(f.states.get('itens')[0].tipo,'Água');
  assert.equal(f.nodes().find(n=>n.type==='select'&&n.props['aria-label']?.startsWith('Tipo da despesa')).props.value,'Água');
 }
 function fixtureParse(){const f=harness();return f.testing.lerTexto('Data;Tipo de despesa;Descrição;Valor\n28/10/2026;Água;TESTE;1000,00',[]);}
});
test('reconhecimento preserva escolha manual e não usa categorias de outro perfil',()=>{
 const parser=harness();const parsed=parser.testing.lerTexto('Data;Tipo de despesa;Descrição;Valor\n28/10/2026; água ;TESTE;1000,00',['Água','Energia']);
 const f=harness({props:{despesasCadastradas:[{nome:'Água'},{nome:'Energia'}]},states:{itens:parsed}});f.reconcileTypes(['Água','Energia']);
 f.nodes().find(n=>n.type==='select'&&n.props['aria-label']?.startsWith('Tipo da despesa')).props.onChange({target:{value:'Energia'}});
 f.reconcileTypes(['Água','Energia','Internet']);assert.equal(f.states.get('itens')[0].tipo,'Energia');
 const other=harness({states:{itens:parsed}});other.reconcileTypes(['Combustível']);assert.equal(other.states.get('itens')[0].tipo,'');assert.equal(other.states.get('itens')[0].tipoInformado,'água');
});
test('histórico não substitui tipo explícito não reconhecido no arquivo',async()=>{
 const f=harness({suggestionType:'Alimentação',props:{arquivo:new File(['Data;Tipo de despesa;Descrição;Valor\n28/10/2026;Água;TESTE;1000,00'],'teste.csv')}});await f.analyze();
 assert.equal(f.states.get('itens')[0].tipo,'');assert.equal(f.states.get('itens')[0].tipoInformado,'Água');
});

test('modelo Excel Água/TESTE/R$ 1.000 reconhece categoria após carga tardia sem trocar valores',()=>{
 const XLSX=require('xlsx'),workbook=XLSX.read(readFileSync('public/modelos/modelo-importacao-despesas-avantalab.xlsx'),{type:'buffer',cellDates:true});
 XLSX.utils.sheet_add_aoa(workbook.Sheets[workbook.SheetNames[0]],[[new Date(2026,9,28),'Água','TESTE',1000]],{origin:'A4'});
 const reaberto=XLSX.read(XLSX.write(workbook,{type:'buffer',bookType:'xlsx'}),{type:'buffer',cellDates:true});
 const rows=XLSX.utils.sheet_to_json(reaberto.Sheets[reaberto.SheetNames[0]],{header:1,defval:''});const parser=harness();const header=parser.testing.linhaCabecalho(rows);
 const itens=parser.testing.linhasTabulares(rows[header].map(String),rows.slice(header+1),[]);const f=harness({states:{itens},props:{centroCustoId:'lika',despesasCadastradas:[]}});
 f.reconcileTypes(['Água']);assert.equal(f.states.get('itens')[0].tipo,'Água');assert.equal(f.states.get('itens')[0].valor,1000);assert.equal(f.states.get('itens')[0].valorOriginal,1000);assert.equal(f.states.get('itens')[0].descricao,'TESTE');assert.equal(f.states.get('itens')[0].data,'2026-10-28');
});

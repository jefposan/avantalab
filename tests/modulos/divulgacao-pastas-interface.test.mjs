import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import * as jsx from 'react/jsx-runtime';
const source=readFileSync('app/components/NovidadesVendasModal.tsx','utf8');
const codigo=ts.transpileModule(source,{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
function montar({extras=[]}={}){
 const pastas=[{id:'raiz',pasta_pai_id:null,nome:'Catálogos'},{id:'filha',pasta_pai_id:'raiz',nome:'2026'},{id:'outra',pasta_pai_id:null,nome:'Outros'}];
 const material={id:'pdf',pasta_id:'raiz',titulo:'Catálogo PDF',tipo:'pdf',arquivo_url:'https://pdf',miniatura_url:'https://capa'};
 const materiais=[material,...extras];
 const presets={pastas,materiais,pastaAtiva:'raiz',pastaPaiNova:'outra',novaPasta:'Nome antigo'};
 const nomes=[...source.matchAll(/const\s+\[(\w+),\s*\w+\]\s*=\s*useState/g)].map(x=>x[1]);
 let cursor=0,refCursor=0,falha=false,limiteSucessos=Infinity,rpcs=0;const states=[],refs=[],calls=[];
 const react={useState(v){const i=cursor++;if(!(i in states))states[i]=nomes[i] in presets?presets[nomes[i]]:v;return[states[i],n=>{states[i]=typeof n==='function'?n(states[i]):n;}];},useRef(v){return refs[refCursor++] ||= {current:v};},useEffect(){}};
 const supabase={rpc:async(nome,args)=>{calls.push({nome,args});rpcs++;return (falha||rpcs>limiteSucessos)?{error:{code:'P0001',message:'Não foi possível mover o material.'}}:{data:{material:{...materiais.find(m=>m.id===args.p_material_id),pasta_id:args.p_pasta_destino_id},capas_limpas:[]}};},storage:{from(){return{remove:async(paths)=>{calls.push({storage:paths});return{};}}}},from(tabela){return{delete(){let id;const q={eq(chave,valor){if(chave==='id')id=valor;return q;},select(){return q;},async single(){calls.push({tabela,excluir:id});return falha?{error:{message:'Falha'}}:{data:{id}};}};return q;},insert(payload){calls.push({tabela,payload});return{select(){return{single:async()=>({data:{id:'nova',...payload,pasta_pai_id:payload.pasta_pai_id,criado_em:''}})}}}}}}};
 const m={exports:{}};vm.runInNewContext(codigo,{exports:m.exports,module:m,require:n=>n==='react'?react:n==='react/jsx-runtime'?jsx:n.endsWith('/supabase')?{supabase}:{default:()=>null},process:{env:{}},console,window:{matchMedia:()=>({matches:false}),requestAnimationFrame:fn=>fn()},Set,Map});
 const render=()=>{cursor=0;refCursor=0;return m.exports.default({aberto:true,empresaId:'empresa',nomeEmpresa:'Empresa',darkMode:false,corPrimaria:'#009999',onFechar(){}});};
 const nos=t=>!t||typeof t!=='object'?[]:Array.isArray(t)?t.flatMap(nos):(t.props?.hidden?[]:[t,...(t.props?.aberto===false?[]:nos(t.props?.children))]);
 const texto=t=>(typeof t==='string'||typeof t==='number')?String(t):Array.isArray(t)?t.map(texto).join(''):t?.props?texto(t.props.children):'';
 const find=fn=>nos(render()).find(fn);
 const arrastavel=()=>find(n=>n.type==='article'&&n.props.draggable!==undefined);
 const destino=()=>find(n=>n.type==='button'&&n.props.onDrop&&texto(n).includes('2026'));
 const evento=()=>({preventDefault(){},stopPropagation(){},dataTransfer:{setData(){},files:[]},currentTarget:{contains(){return false;}},relatedTarget:null});
 return{render,nos,texto,find,arrastavel,destino,evento,calls,flush:()=>new Promise(r=>setImmediate(r)),falhar:()=>{falha=true;},falharDepois:n=>{limiteSucessos=n;}};
}

test('arrastar PDF move vínculo uma vez; arraste externo/cancelado não vira movimentação ou upload',async()=>{
 const c=montar();c.destino().props.onDrop(c.evento());assert.equal(c.calls.length,0);
 c.arrastavel().props.onDragStart(c.evento());c.arrastavel().props.onDragEnd();assert.equal(c.calls.length,0);
 c.arrastavel().props.onDragStart(c.evento());c.destino().props.onDragOver(c.evento());c.destino().props.onDrop(c.evento());await c.flush();
 assert.equal(c.calls.length,1);assert.deepEqual({...c.calls[0].args},{p_empresa_id:'empresa',p_material_id:'pdf',p_pasta_origem_id:'raiz',p_pasta_destino_id:'filha'});
 assert.equal(c.arrastavel(),undefined);assert.match(c.texto(c.render()),/Material movido/);
});
test('falha ao mover mantém material na origem e permite tentar novamente',async()=>{
 const c=montar();c.falhar();c.arrastavel().props.onDragStart(c.evento());c.destino().props.onDrop(c.evento());await c.flush();assert.ok(c.arrastavel());assert.match(c.texto(c.render()),/Não foi possível mover/);assert.equal(c.calls.length,1);
});
test('Nova abre criação contextual e cria dentro da pasta aberta sem depender do seletor da esquerda',async()=>{
 const c=montar();c.find(n=>n.props?.['aria-label']==='Nova pasta dentro da pasta aberta').props.onClick();
 const dialogo=()=>c.find(n=>n.props?.rotulo==='Nova subpasta');assert.equal(dialogo().props.aberto,true);
 let form=c.nos(dialogo()).find(n=>n.type==='form');form.props.onSubmit({preventDefault(){}});await c.flush();assert.equal(c.calls.length,0,'nome vazio não reutiliza rascunho da esquerda');
 c.nos(dialogo()).find(n=>n.type==='input').props.onChange({target:{value:'Nova subpasta'}});
 form=c.nos(dialogo()).find(n=>n.type==='form');form.props.onSubmit({preventDefault(){}});await c.flush();
 assert.equal(c.calls[0].payload.pasta_pai_id,'raiz');assert.equal(c.calls[0].payload.nome,'Nova subpasta');assert.equal(dialogo().props.aberto,false);
 assert.ok(c.find(n=>n.props?.['aria-label']==='Nova pasta dentro da pasta aberta'),'pasta original permanece aberta');
});


test('destaque fica dentro da pasta e cabeçalho permanece fixo na área rolável',()=>{
 const c=montar();c.arrastavel().props.onDragStart(c.evento());c.destino().props.onDragOver(c.evento());
 assert.match(c.destino().props.className,/ring-inset/);
 const header=c.find(n=>n.type==='header'&&n.props['data-divulgacao-fixed-header']!==undefined);
 assert.match(header.props.className,/sticky top-0/);assert.ok(c.texto(header).includes('Nova'));assert.ok(c.texto(header).includes('Selecionar'));
});

test('seleção move vários arquivos e Cancelar não altera materiais',async()=>{
 const c=montar({extras:[{id:'pdf2',pasta_id:'raiz',titulo:'Outro PDF',tipo:'pdf'}]});
 const clicar=texto=>c.find(n=>n.props?.onClick&&c.texto(n)===texto).props.onClick();
 clicar('Selecionar');c.find(n=>n.props?.['aria-label']==='Selecionar arquivo Catálogo PDF').props.onChange();clicar('Cancelar');assert.equal(c.calls.length,0);assert.ok(c.arrastavel());
 clicar('Selecionar');for(const titulo of ['Catálogo PDF','Outro PDF']) c.find(n=>n.props?.['aria-label']===`Selecionar arquivo ${titulo}`).props.onChange();
 clicar('Mover');const dialogo=()=>c.find(n=>n.props?.rotulo==='Mover material');
 c.nos(dialogo()).find(n=>n.type==='select').props.onChange({target:{value:'filha'}});
 c.nos(dialogo()).find(n=>n.type==='form').props.onSubmit({preventDefault(){}});await c.flush();await c.flush();
 assert.equal(c.calls.filter(x=>x.nome==='mover_material_divulgacao_rpc').length,2);assert.equal(c.arrastavel(),undefined);assert.ok(c.texto(c.render()).includes('2 de 2 arquivo(s) movido(s).'));
});

test('excluir pasta pela seleção confirma antes e não exclui arquivo coberto duas vezes',async()=>{
 const c=montar({extras:[{id:'pdf2',pasta_id:'filha',titulo:'Dentro',tipo:'pdf'}]});
 c.find(n=>n.props?.onClick&&c.texto(n)==='Selecionar').props.onClick();
 c.find(n=>n.props?.['aria-label']==='Selecionar pasta 2026').props.onChange();
 c.find(n=>n.props?.onClick&&c.texto(n)==='Excluir').props.onClick();
 const modal=()=>c.find(n=>n.props?.titulo==='Excluir itens selecionados');assert.equal(modal().props.aberto,true);assert.match(modal().props.mensagem,/subpastas e arquivos/);assert.equal(c.calls.length,0);
 modal().props.aoCancelar();assert.equal(c.calls.length,0);
 c.find(n=>n.props?.onClick&&c.texto(n)==='Excluir').props.onClick();modal().props.aoConfirmar();await c.flush();
 assert.deepEqual(c.calls.filter(x=>x.excluir).map(x=>({tabela:x.tabela,id:x.excluir})),[{tabela:'vendas_mobile_divulgacao_pastas',id:'filha'}]);
});

test('falha parcial mantém apenas os arquivos não movidos selecionados para nova tentativa',async()=>{
 const c=montar({extras:[{id:'pdf2',pasta_id:'raiz',titulo:'Outro PDF',tipo:'pdf'}]});c.falharDepois(1);
 c.find(n=>n.props?.onClick&&c.texto(n)==='Selecionar').props.onClick();
 for(const titulo of ['Catálogo PDF','Outro PDF']) c.find(n=>n.props?.['aria-label']===`Selecionar arquivo ${titulo}`).props.onChange();
 c.find(n=>n.props?.onClick&&c.texto(n)==='Mover').props.onClick();const dialogo=()=>c.find(n=>n.props?.rotulo==='Mover material');
 c.nos(dialogo()).find(n=>n.type==='select').props.onChange({target:{value:'filha'}});c.nos(dialogo()).find(n=>n.type==='form').props.onSubmit({preventDefault(){}});await c.flush();await c.flush();
 assert.ok(c.texto(c.render()).includes('1 de 2 arquivo(s) movido(s).'));assert.equal(c.find(n=>n.props?.['aria-label']==='Selecionar arquivo Outro PDF').props.checked,true);
});

test('Compartilhar e Detalhes só aparecem com um item e detalhes de pasta contam a árvore',()=>{
 const c=montar({extras:[{id:'pdf2',pasta_id:'filha',titulo:'Dentro',tipo:'pdf',tamanho_bytes:1048576}]});
 const clicar=texto=>c.find(n=>n.props?.onClick&&c.texto(n)===texto).props.onClick();
 const acao=texto=>c.find(n=>n.props?.onClick&&c.texto(n)===texto);
 clicar('Selecionar');assert.equal(acao('Detalhes'),undefined);assert.equal(acao('Compartilhar'),undefined);
 c.find(n=>n.props?.['aria-label']==='Selecionar arquivo Catálogo PDF').props.onChange();assert.ok(acao('Compartilhar'));clicar('Detalhes');
 assert.equal(c.find(n=>n.props?.rotulo==='Detalhes da seleção').props.aberto,true);clicar('Fechar');
 c.find(n=>n.props?.['aria-label']==='Selecionar pasta 2026').props.onChange();assert.equal(acao('Detalhes'),undefined);assert.equal(acao('Compartilhar'),undefined);
 c.find(n=>n.props?.['aria-label']==='Selecionar arquivo Catálogo PDF').props.onChange();clicar('Detalhes');assert.match(c.texto(c.render()),/1 arquivo\(s\) · 0 subpasta\(s\)/);
});

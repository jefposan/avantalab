import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import * as jsxRuntime from 'react/jsx-runtime';

// Executa os handlers reais do componente; somente React hooks/rede são controlados.
function montar({ produtosExtras = [], darkMode = false } = {}) {
  const estados = [], refs = [], efeitos = [], chamadas = [];
  let cursor = 0, cursorRef = 0, primeira = true, falhar = false, pendente = null;
  const produto = { id:'p1', nome:'Produto um', sku:'T1', preco_divulgacao:31, preco_representante:20, unidade:'un', ativo:true };
  const catalogo = { id:'c1', publicado_avantavendas:true, nome:'Principal' };
  const react = {
    useState(inicial) { const i=cursor++; if (!(i in estados)) estados[i]=inicial; return [estados[i],v=>{estados[i]=typeof v==='function'?v(estados[i]):v;}]; },
    useRef(inicial) { const i=cursorRef++; return refs[i] ||= {current:inicial}; },
    useCallback(fn) { return fn; },
    useEffect(fn) { if(primeira) efeitos.push(fn); },
  };
  const supabase = { auth:{getSession:async()=>({data:{session:null}})}, rpc:async(nome,args)=>{
    chamadas.push({nome,args});
    if(nome==='listar_produtos_conteudo_vendas_mobile_rpc') return {data:{produtos:[produto,...produtosExtras]}};
    if(nome==='listar_catalogos_conteudo_vendas_mobile_rpc') return {data:{catalogos:[catalogo]}};
    if(pendente) await pendente;
    return falhar ? {error:{message:'Falha de rede'}} : {data:{id:args.p_produto_id||'novo-id'}};
  }};
  const modulo={exports:{}};
  const codigo=ts.transpileModule(fs.readFileSync('app/components/CatalogoProdutosVendas.tsx','utf8'),{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  vm.runInNewContext(codigo,{exports:modulo.exports,module:modulo,require:n=>n==='react'?react:n==='react/jsx-runtime'?jsxRuntime:n.endsWith('/supabase')?{supabase}:n.endsWith('/formatters')?{formatarDescricao:s=>s.trim(),formatarMoeda:v=>v.toLocaleString('pt-BR',{style:'currency',currency:'BRL'}),correspondeBusca:(texto,busca)=>String(texto).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().includes(String(busca).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase())}:n.endsWith('/cores-avanta')?{corTextoSobreFundo:()=> '#000'}:{default:()=>null},window:{setTimeout:fn=>{fn();return 1;},clearTimeout(){},requestAnimationFrame:fn=>fn()},console});
  const render=()=>{cursor=0;cursorRef=0;const t=modulo.exports.default({empresaId:'empresa',darkMode,corPrimaria:'#00aaaa'});primeira=false;return t;};
  function nos(t) { if(!t||typeof t!=='object') return []; if(Array.isArray(t))return t.flatMap(nos);return [t,...nos(t.props?.children)]; }
  const texto=t=>typeof t==='string'?t:Array.isArray(t)?t.map(texto).join(''):t?.props?texto(t.props.children):'';
  const botao=nome=>nos(render()).find(n=>n.props?.onClick&&texto(n)===nome);
  const campo=nome=>nos(render()).find(n=>n.type==='label'&&texto(n).startsWith(nome))?.props.children;
  const input=nome=>nos(campo(nome)).find(n=>n.type==='input');
  const flush=()=>new Promise(resolve=>setImmediate(resolve));
  const iniciar=async()=>{render();efeitos.forEach(fn=>fn());await flush();};
  return {render,nos,texto,botao,input,flush,iniciar,chamadas,produto,setFalhar:v=>{falhar=v;},esperar:p=>{pendente=p;}};
}

test('salvar conserva formulário, confirma sucesso, reabilita ao editar e Cancelar fecha',async()=>{
  const c=montar();await c.iniciar();c.botao('Editar').props.onClick();
  c.input('Nome').props.onChange({target:{value:'Produto alterado'}});
  c.botao('Salvar alterações').props.onClick();assert.ok(c.botao('Salvando...'));
  await c.flush();assert.equal(c.input('Nome').props.value,'Produto alterado');assert.equal(c.botao('Alteração salva').props.disabled,true);assert.ok(c.botao('Editar'));
  c.input('Nome').props.onBlur();assert.ok(c.botao('Alteração salva'),'blur sem alteração não deve apagar confirmação');
  c.input('Marca').props.onChange({target:{value:'Marca nova'}});assert.equal(c.botao('Salvar alterações').props.disabled,false);
  c.setFalhar(true);c.botao('Salvar alterações').props.onClick();await c.flush();assert.ok(c.botao('Salvar alterações'));assert.equal(c.input('Marca').props.value,'Marca nova');
  c.botao('Cancelar').props.onClick();assert.equal(c.input('Nome'),undefined);
});

test('novo produto mantém ID salvo e alterações feitas durante envio não são declaradas salvas',async()=>{
 const c=montar();await c.iniciar();c.botao('Novo produto').props.onClick();
 c.input('Nome').props.onChange({target:{value:'Novo'}});c.input('SKU').props.onChange({target:{value:'N1'}});
 const rotulo=c.nos(c.render()).find(n=>n.type==='label'&&n.props.children?.[0]==='Preço revenda');
 const moeda=c.nos(rotulo).find(n=>n.props?.onChange);
 moeda.props.onChange('31,00');
 let liberar; c.esperar(new Promise(r=>{liberar=r;}));c.botao('Salvar alterações').props.onClick();
 c.input('Marca').props.onChange({target:{value:'Ainda não salva'}});liberar();await c.flush();
 assert.ok(c.botao('Salvar alterações'));assert.equal(c.input('Marca').props.value,'Ainda não salva');
 c.esperar(null);c.botao('Salvar alterações').props.onClick();await c.flush();
 const saves=c.chamadas.filter(x=>x.nome==='salvar_produto_conteudo_vendas_mobile_rpc');assert.equal(saves[1].args.p_produto_id,'novo-id');assert.ok(c.botao('Alteração salva'));
});


test('lista apresenta custo do representante e status; diferencia custo zero de ausente nos dois temas',async()=>{
 for(const darkMode of [false,true]) {
  const c=montar({darkMode,produtosExtras:[{id:'p2',nome:'Inativo sem custo',ativo:false,preco_representante:null,preco_divulgacao:10},{id:'p3',nome:'Custo zero',ativo:true,preco_representante:0,preco_divulgacao:15}]});
  await c.iniciar();const nos=c.nos(c.render());
  assert.deepEqual(nos.filter(n=>n.type==='th').map(c.texto),['Produto','Status','Preço custo','Preço revenda','Imagem','Ações']);
  const linhas=nos.filter(n=>n.type==='tr'&&c.nos(n).some(x=>x.type==='td'));
  const celulas=linha=>c.nos(linha).filter(n=>n.type==='td');
  assert.match(c.texto(celulas(linhas[0])[2]),/20,00/);assert.match(c.texto(celulas(linhas[0])[3]),/31,00/);
  const ativo=c.nos(celulas(linhas[0])[1]).find(n=>n.type==='span');assert.equal(c.texto(ativo),'Ativo');assert.match(ativo.props.className,/text-green-/);
  const inativo=c.nos(celulas(linhas[1])[1]).find(n=>n.type==='span');assert.equal(c.texto(inativo),'Inativo');assert.match(inativo.props.className,/text-red-/);
  assert.equal(c.texto(celulas(linhas[1])[2]),'—');assert.match(c.texto(celulas(linhas[2])[2]),/0,00/);
  assert.match(nos.find(n=>n.type==='thead').props.className,/sticky top-0/);
 }
});


test('pesquisa filtra por nome/EAN e exclusão exige confirmação antes da RPC',async()=>{
 const c=montar({produtosExtras:[{id:'p2',nome:'Máquina de corte',sku:'MAQ',codigo_barras:'78912345',ativo:true}]});await c.iniciar();
 const busca=()=>c.nos(c.render()).find(n=>n.props?.['aria-label']==='Pesquisar produtos');
 busca().props.onChange('maquina');assert.equal(c.nos(c.render()).filter(n=>n.type==='td').length,6);
 busca().props.onChange('78912345');assert.ok(c.texto(c.render()).includes('Máquina de corte'));
 busca().props.onChange('inexistente');assert.ok(c.texto(c.render()).includes('Nenhum produto encontrado.'));
 busca().props.onChange('');c.botao('Editar').props.onClick();c.botao('Excluir produto').props.onClick();
 assert.equal(c.chamadas.some(x=>x.nome==='excluir_produto_conteudo_vendas_mobile_rpc'),false);
 let modal=c.nos(c.render()).find(n=>n.props?.titulo==='Excluir produto');assert.equal(modal.props.aberto,true);modal.props.aoCancelar();
 assert.equal(c.chamadas.some(x=>x.nome==='excluir_produto_conteudo_vendas_mobile_rpc'),false);
 c.botao('Excluir produto').props.onClick();modal=c.nos(c.render()).find(n=>n.props?.titulo==='Excluir produto');modal.props.aoConfirmar();await c.flush();
 const chamada=c.chamadas.find(x=>x.nome==='excluir_produto_conteudo_vendas_mobile_rpc');assert.equal(chamada.args.p_confirmado,true);assert.equal(chamada.args.p_produto_id,'p1');assert.equal(c.input('Nome'),undefined);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import * as jsxRuntime from 'react/jsx-runtime';

// Executa os handlers reais do componente; somente React hooks/rede são controlados.
function montar() {
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
    if(nome==='listar_produtos_conteudo_vendas_mobile_rpc') return {data:{produtos:[produto]}};
    if(nome==='listar_catalogos_conteudo_vendas_mobile_rpc') return {data:{catalogos:[catalogo]}};
    if(pendente) await pendente;
    return falhar ? {error:{message:'Falha de rede'}} : {data:{id:args.p_produto_id||'novo-id'}};
  }};
  const modulo={exports:{}};
  const codigo=ts.transpileModule(fs.readFileSync('app/components/CatalogoProdutosVendas.tsx','utf8'),{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  vm.runInNewContext(codigo,{exports:modulo.exports,module:modulo,require:n=>n==='react'?react:n==='react/jsx-runtime'?jsxRuntime:n.endsWith('/supabase')?{supabase}:n.endsWith('/formatters')?{formatarDescricao:s=>s.trim()}:n.endsWith('/cores-avanta')?{corTextoSobreFundo:()=> '#000'}:{default:()=>null},window:{setTimeout:fn=>{fn();return 1;},clearTimeout(){},requestAnimationFrame:fn=>fn()},console});
  const render=()=>{cursor=0;cursorRef=0;const t=modulo.exports.default({empresaId:'empresa',darkMode:false,corPrimaria:'#00aaaa'});primeira=false;return t;};
  function nos(t) { if(!t||typeof t!=='object') return []; if(Array.isArray(t))return t.flatMap(nos);return [t,...nos(t.props?.children)]; }
  const texto=t=>typeof t==='string'?t:Array.isArray(t)?t.map(texto).join(''):t?.props?texto(t.props.children):'';
  const botao=nome=>nos(render()).find(n=>n.props?.onClick&&texto(n)===nome);
  const campo=nome=>nos(render()).find(n=>n.type==='label'&&texto(n).startsWith(nome))?.props.children;
  const input=nome=>nos(campo(nome)).find(n=>n.type==='input');
  const flush=()=>new Promise(resolve=>setImmediate(resolve));
  const iniciar=async()=>{render();efeitos.forEach(fn=>fn());await flush();};
  return {render,nos,botao,input,flush,iniciar,chamadas,produto,setFalhar:v=>{falhar=v;},esperar:p=>{pendente=p;}};
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

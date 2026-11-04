// Renderiza apenas o componente real de apresentação, com dados fictícios.
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import ts from 'typescript';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
const require=createRequire(import.meta.url),root=process.cwd(),cache=new Map();
function load(file){
  if(cache.has(file))return cache.get(file);
  const module={exports:{}};
  const code=ts.transpileModule(readFileSync(file,'utf8'),{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  const localRequire=id=>{
    if(id.endsWith('.module.css'))return {default:new Proxy({},{get:(_t,p)=>String(p)})};
    if(id==='@/app/components/ModuloHeader')return {AdaptiveModuleLogo:({src,alt,className})=>React.createElement('img',{src,alt,className})};
    if(id.startsWith('@/'))return load(path.join(root,id.slice(2)+'.tsx'));
    return require(id);
  };
  // A função de contraste não exige montar nenhum outro consumidor do produto.
  const original=localRequire;
  new Function('require','module','exports',code)(id=>id==='@/app/lib/formatters'?{corEhClara:color=>color==='#e8c843'}:original(id),module,module.exports);
  cache.set(file,module.exports);return module.exports;
}
const View=load(path.join(root,'app/components/SelecaoModulos.tsx')).default;
const out=process.argv[2]; if(!out)throw new Error('Informe uma pasta de saída temporária já criada.');
const css=readFileSync('app/modulos/modulos.module.css','utf8');
const fixture={empresa:{id:'ficticia',nome:'TRIDIUM COSMÉTICOS',corPrimaria:'#003E73',temaEscuro:false},nomeUsuario:'Mariana Silva',perfil:'operador_completo',dashboard:false,planoAtivo:true,modulos:[{id:'marketplaces',nome:'Anúncios em marketplaces',descricao:'Anúncios, produtos e pedidos.'},{id:'projetos',nome:'Projetos',descricao:'Etapas, tarefas e equipe.'},{id:'vendas',nome:'Vendas e Serviços',descricao:'Clientes, vendas e serviços.'}]};
for(const [name,dark,brand] of [['desktop',false,'#003E73'],['escuro',true,'#003E73'],['contraste',false,'#e8c843']]){
  const perfil={...fixture,empresa:{...fixture.empresa,temaEscuro:dark,corPrimaria:brand}};
  const html=renderToStaticMarkup(React.createElement(View,{perfis:[perfil],perfil,error:'',opening:'',onAbrir(){},onSair(){},onSelecionarPerfil(){},onTrocarPerfil(){},onTentarNovamente(){}}));
  writeFileSync(path.join(out,name+'.html'),`<!doctype html><html lang="pt-BR"><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>*{box-sizing:border-box}body{margin:0;font-family:Arial}h1,h2,p{margin:0}button{font:inherit;cursor:pointer;border:0}picture img{width:100%;height:100%;object-fit:cover}picture{position:absolute;inset:0} ${css}</style>${html.replaceAll('src="/images/','src="/images/').replaceAll('srcSet="/images/','srcSet="/images/')}</html>`);
}
console.log('Prévia do componente real gerada em '+out);

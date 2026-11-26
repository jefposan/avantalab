import * as XLSX from 'xlsx';
import { CAMPOS_EXCEL } from './excel-seletivo.ts';
export type ProdutoReferencia={id:string;sku:string;nome:string;excluido_em?:string|null};
export type OrigemPreco={codigo:string;nome:string};
export type LinhaImportacao={id:string;sku:string;valores:Record<string,unknown>};
export type AbaImportacao={nome:string;codigo:string;produto:string;colunas:OrigemPreco[];linhas:LinhaImportacao[];ocorrencias:string[]};
export type ArquivoPrecos={abas:AbaImportacao[]};
export type PrecoImportado={produto_id:string;sku:string;tabela_codigo:string;preco:number|null};
export const normalizar=(v:unknown)=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLocaleLowerCase('pt-BR').replace(/\s+/g,' ');
export function lerPreco(v:unknown,contexto:string):number|null{
 if(v===null||v===undefined||String(v).trim()==='')return null;
 if(typeof v==='boolean'||typeof v==='object')throw Error(`Preço inválido: ${contexto}.`);
 const raw=String(v).trim().replace(/^R\$\s*/i,'').replace(/\s/g,'');
 const value=typeof v==='number'?v:Number(raw.includes(',')?raw.replace(/\./g,'').replace(',','.'):raw);
 if(!/^(?:\d+(?:\.\d+)?|\d{1,3}(?:\.\d{3})*,\d+|\d+,\d+)$/.test(raw)||!Number.isFinite(value)||value<0||value>9999999999.99)throw Error(`Preço inválido: ${contexto}.`);
 return Math.round((value+Number.EPSILON)*100)/100;
}
export function sugerirOrigem(tabela:{nome:string;codigo:string;padrao:boolean},colunas:OrigemPreco[]){
 const norm=(v:string)=>normalizar(v).replace(/\bprecos?\b/g,'').replace(/[^a-z0-9]+/g,' ').trim();
 const nomes=tabela.padrao?['padrão','preço padrão']:[tabela.nome,tabela.codigo];
 const matches=colunas.filter(c=>nomes.some(n=>norm(c.nome.replace(/^Preço · /,''))===norm(n)||norm(c.codigo)===norm(n)));
 return matches.length===1?matches[0].codigo:'';
}
export function lerArquivoPrecos(bytes:ArrayBuffer|Uint8Array,empresaId:string,produtos:ProdutoReferencia[]):ArquivoPrecos{
 const livro=XLSX.read(bytes,{type:'array'});
 const meta=livro.Sheets.Metadados?XLSX.utils.sheet_to_json<unknown[]>(livro.Sheets.Metadados,{header:1,defval:''}):[];
 const formato=String(meta.find(r=>r[0]==='formato')?.[1]||'');
 const oficial=meta.length>0;
 if(oficial&&(!['AVANTALAB-CUSTOS-2','AVANTALAB-CUSTOS-3'].includes(formato)||String(meta.find(r=>r[0]==='empresa_id')?.[1]||'')!==empresaId))throw Error('Metadados inválidos ou planilha de outra empresa.');
 const porCodigo=new Map<string,ProdutoReferencia[]>();
 produtos.filter(p=>!p.excluido_em).forEach(p=>porCodigo.set(normalizar(p.sku),[...(porCodigo.get(normalizar(p.sku))||[]),p]));
 const abas:AbaImportacao[]=[];
 for(const nome of livro.SheetNames.filter(n=>n!=='Metadados'&&n!=='Tabelas de preços')){
  const rows=XLSX.utils.sheet_to_json<unknown[]>(livro.Sheets[nome],{header:1,defval:''});
  const headers=(rows[0]||[]).map(v=>String(v).trim());
  const code=headers.findIndex(h=>['codigo','sku','codigo do produto'].includes(normalizar(h)));
  const name=headers.findIndex(h=>['nome','produto','nome do produto'].includes(normalizar(h)));
  if(code<0||name<0)continue;
  if(new Set(headers.map(normalizar)).size!==headers.length)throw Error(`Cabeçalhos repetidos na aba ${nome}.`);
  const dados=rows.slice(1).map((r,i)=>({r,linha:i+1})).filter(({r})=>r.some(v=>String(v??'').trim()));
  const cad=new Set(CAMPOS_EXCEL.filter(([f])=>f!=='preco_venda').map(([,h])=>normalizar(h)));
  const colunas=headers.flatMap((h,i)=>{
   if(i===code||i===name||cad.has(normalizar(h))||/^(id interno|atualizado em|estoque|quantidade|codigo de barras)/.test(normalizar(h)))return [];
   if(h)return [{codigo:h,nome:h}];
   return [];
  });
  const ocorrencias:string[]=[],usados=new Set<string>();
  const linhas:LinhaImportacao[]=[];
  dados.forEach(({r,linha},i)=>{
   const sku=String(r[code]??'').trim(),nomeProduto=String(r[name]??'').trim();
   let candidatos=porCodigo.get(normalizar(sku))||[];
   const idCol=headers.findIndex(h=>normalizar(h).startsWith('id interno'));
   if(oficial){const id=String(r[idCol]??'');candidatos=candidatos.filter(p=>p.id===id);}
   else if(idCol>=0&&String(r[idCol]??'').trim())candidatos=candidatos.filter(p=>p.id===String(r[idCol]).trim());
   else if(candidatos.length>1)candidatos=candidatos.filter(p=>normalizar(p.nome)===normalizar(nomeProduto));
   if(!sku||!nomeProduto||candidatos.length!==1){ocorrencias.push(`Linha ${i+2}: ${sku||'sem código'} — ${candidatos.length>1?'identificação ambígua':'produto não localizado com segurança'}.`);return;}
   const p=candidatos[0];if(usados.has(p.id)){ocorrencias.push(`Linha ${i+2}: código ${sku} repetido.`);return;}usados.add(p.id);
   linhas.push({id:p.id,sku:p.sku,valores:Object.fromEntries(headers.map((h,j)=>{const cell=livro.Sheets[nome][XLSX.utils.encode_cell({r:linha,c:j})];return [h,cell?.t==='e'||(cell?.f&&cell.v==null)?{erro:'Célula com erro ou fórmula sem resultado'}:r[j]??''];}))});
  });
  if(oficial&&formato==='AVANTALAB-CUSTOS-2'&&livro.Sheets['Tabelas de preços']){
   const legados=XLSX.utils.sheet_to_json<Record<string,unknown>>(livro.Sheets['Tabelas de preços'],{defval:''});
   const pares=new Set<string>();
   for(const row of legados){const codigo=String(row['Código da tabela']||'').trim();if(!codigo)continue;const key=`Preço · ${codigo}`;
    if(!colunas.some(c=>c.codigo===key))colunas.push({codigo:key,nome:key});
    const matches=linhas.filter(l=>normalizar(l.sku)===normalizar(row['Código do produto']));
    const pair=`${codigo}:${normalizar(row['Código do produto'])}`;
    if(matches.length!==1||pares.has(pair)){ocorrencias.push(`Tabela ${codigo}: produto repetido ou não localizado (${row['Código do produto']}).`);continue;}
    pares.add(pair);matches[0].valores[key]=row.Preço;
   }
  }
  if(!colunas.length)ocorrencias.push('Nenhuma coluna de preços identificada.');
  abas.push({nome,codigo:headers[code],produto:headers[name],colunas,linhas,ocorrencias});
 }
 if(!abas.length)throw Error('A planilha deve conter as colunas Código e Nome.');
 return {abas};
}
export function montarPrecos(aba:AbaImportacao,mapeamentos:Array<{destino:string;origem:string}>):PrecoImportado[]{
 if(aba.ocorrencias.length)throw Error('Resolva as ocorrências da planilha antes de importar.');
 if(!mapeamentos.length)throw Error('Ative ao menos uma tabela.');
 if(new Set(mapeamentos.map(m=>m.destino)).size!==mapeamentos.length)throw Error('Tabela de destino repetida.');
 return mapeamentos.flatMap(m=>{
  if(!aba.colunas.some(c=>c.codigo===m.origem))throw Error('Escolha a coluna de cada tabela ativada.');
  return aba.linhas.map(l=>({produto_id:l.id,sku:l.sku,tabela_codigo:m.destino,preco:lerPreco(l.valores[m.origem],`${m.origem}, produto ${l.sku}`)}));
 });
}

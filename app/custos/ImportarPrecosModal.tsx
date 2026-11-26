'use client';
import {useEffect,useId,useRef,useState} from 'react';
import {Modal} from '@/app/projetos/components/Modal';
import ChaveAtivacao from '@/app/components/ChaveAtivacao';
import BotaoAcaoCompacto from '@/app/components/BotaoAcaoCompacto';
import AvisoFormulario from '@/app/components/AvisoFormulario';
import {formatarMoeda} from '@/app/lib/formatters';
import {lerArquivoPrecos,montarPrecos,sugerirOrigem,type ArquivoPrecos,type PrecoImportado} from './importacao-precos';
import {importarSomentePrecos,type RevisaoPrecosImportados} from './repository';
import type {ProdutoCustos,TabelaPreco} from './types';
import styles from './custos.module.css';
export default function ImportarPrecosModal({arquivo,companyId,produtos,tabelas,podeEditar,onClose,onRecarregar,executarImportacao=importarSomentePrecos}:{arquivo:File;companyId:string;produtos:ProdutoCustos[];tabelas:TabelaPreco[];podeEditar:boolean;onClose:()=>void;onRecarregar:()=>Promise<void>;executarImportacao?:typeof importarSomentePrecos}){
 const erroId=useId();
 const [livro,setLivro]=useState<ArquivoPrecos|null>(null),[abaIndex,setAbaIndex]=useState(0);
 const [ativas,setAtivas]=useState<Record<string,boolean>>({}),[origens,setOrigens]=useState<Record<string,string>>({});
 const [erro,setErro]=useState(''),[ocupado,setOcupado]=useState(false),[revisao,setRevisao]=useState<RevisaoPrecosImportados|null>(null);
 const [payload,setPayload]=useState<PrecoImportado[]>([]),[aplicado,setAplicado]=useState(false);
 const trava=useRef(false),geracao=useRef(0),produtosRef=useRef(produtos);
 const elegiveis=tabelas.filter(t=>t.ativo||t.padrao),aba=livro?.abas[abaIndex];
 useEffect(()=>{
  const atual=++geracao.current;let viva=true;
  setOcupado(true);setErro('');
  const leitura=arquivo.size>15*1024*1024?Promise.reject(Error('Use um arquivo de até 15 MB.')):arquivo.arrayBuffer();
  void leitura.then(bytes=>{
   if(!viva||geracao.current!==atual)return;
   const parsed=lerArquivoPrecos(bytes,companyId,produtosRef.current);setLivro(parsed);setAbaIndex(0);setAtivas({});setOrigens({});setRevisao(null);setAplicado(false);
  }).catch(e=>{if(viva)setErro(e instanceof Error?e.message:'Não foi possível ler o arquivo.');}).finally(()=>{if(viva)setOcupado(false);});
  return()=>{viva=false;geracao.current++;};
 },[arquivo,companyId]);
 const escolherAba=(index:number)=>{setAbaIndex(index);setAtivas({});setOrigens({});setErro('');setRevisao(null);};
 const revisar=async()=>{
  if(trava.current||!aba||!podeEditar)return;
  trava.current=true;setOcupado(true);setErro('');
  try{
   const lista=montarPrecos(aba,elegiveis.filter(t=>ativas[t.codigo]).map(t=>({destino:t.codigo,origem:origens[t.codigo]||''})));
   const resultado=await executarImportacao(companyId,arquivo.name,lista);
   setPayload(lista);setRevisao(resultado);
  }catch(e){setErro(e instanceof Error?e.message:'Não foi possível revisar.');}
  finally{trava.current=false;setOcupado(false);}
 };
 const confirmar=async()=>{
  if(trava.current||!revisao||!podeEditar)return;
  trava.current=true;setOcupado(true);setErro('');
  try{
   const resultado=await executarImportacao(companyId,arquivo.name,payload,revisao.revisao);
   setRevisao(resultado);setAplicado(true);
   try{await onRecarregar();}catch{setErro('Preços importados. Reabra o módulo para atualizar os dados da tela.');}
  }catch(e){setErro(e instanceof Error?e.message:'Não foi possível importar.');}
  finally{trava.current=false;setOcupado(false);}
 };
 return <div className={styles.importPriceScope}><Modal open title={aplicado?'Importação concluída':revisao?'Revisar importação':'Importar preços'} description={revisao?arquivo.name:'Escolha qual coluna do Excel atualizará cada tabela.'} onClose={()=>!ocupado&&onClose()} wide compact headerTone="accent">
  <div className={styles.exportSelection}>
   {erro&&<AvisoFormulario titulo="Confira a importação" mensagem={erro} idMensagem={erroId}/>}
   {!podeEditar&&<p role="alert">Sem permissão para importar preços.</p>}
   {!revisao&&<>

    {livro&&livro.abas.length>1&&<label className={styles.field}>Aba<select value={abaIndex} disabled={ocupado} onChange={e=>escolherAba(Number(e.target.value))}>{livro.abas.map((a,i)=><option key={a.nome} value={i}>{a.nome}</option>)}</select></label>}
    {aba&&<>
     {aba.ocorrencias.length>0&&<section className={styles.importPriceIssues} aria-label="Ocorrências da planilha"><strong>{aba.linhas.length} produtos identificados · {aba.ocorrencias.length} ocorrências</strong><ul>{aba.ocorrencias.map((o,i)=><li key={i}>{o}</li>)}</ul></section>}
     <div className={styles.importPriceGrid} role="list" aria-label="Tabelas para importar">{elegiveis.map(t=>{
      const ativa=Boolean(ativas[t.codigo]);return <div key={t.id} role="listitem" aria-label={t.nome} className={`${styles.importPriceMapping} ${ativa?styles.importPriceEnabled:''}`}><strong className={styles.importPriceName}>{t.nome}</strong><ChaveAtivacao className={styles.importPriceToggle} aria-label={`Importar ${t.nome}`} checked={ativa} disabled={ocupado||!podeEditar} onChange={valor=>{setAtivas(a=>({...a,[t.codigo]:valor}));if(valor&&!origens[t.codigo])setOrigens(o=>({...o,[t.codigo]:sugerirOrigem(t,aba.colunas)}));}}/><select aria-label={`Coluna para ${t.nome}`} value={ativa?origens[t.codigo]||'':''} disabled={!ativa||ocupado||!podeEditar} onChange={e=>setOrigens(o=>({...o,[t.codigo]:e.target.value}))}><option value="">{ativa?'Selecione a coluna':'Ative para selecionar'}</option>{aba.colunas.map(c=><option key={c.codigo} value={c.codigo}>{c.nome}</option>)}</select></div>;
     })}</div>
     {!elegiveis.length&&<p>Nenhuma tabela elegível nesta empresa.</p>}
     <p className={styles.importPriceHint}>Somente tabelas ativadas serão atualizadas. As demais mantêm seus registros de preços.</p>{elegiveis.some(t=>t.padrao&&ativas[t.codigo])&&<p className={styles.importPriceHint}>Tabelas sem preço próprio continuam acompanhando o preço padrão.</p>}
    </>}
   </>}
   {revisao&&<>
    <div className={styles.importPriceSummary}><p><strong>{revisao.produtos}</strong> produtos identificados · <strong>{revisao.alterados}</strong> preços {aplicado?'atualizados':'a alterar'} · <strong>{revisao.preservados}</strong> valores preservados</p></div>
    <div className={styles.tableWrap}><table><thead><tr><th>Tabela</th><th>Coluna do Excel</th></tr></thead><tbody>{elegiveis.filter(t=>ativas[t.codigo]).map(t=><tr key={t.id}><td>{t.nome}</td><td>{origens[t.codigo]}</td></tr>)}</tbody></table></div>
    <div className={styles.importPriceReview}><table><thead><tr><th>Código</th><th>Tabela</th><th>Atual</th><th>Novo</th></tr></thead><tbody>{revisao.mudancas.map(m=><tr key={`${m.produto_id}:${m.tabela_id}`}><td>{m.sku}</td><td>{m.tabela}</td><td>{formatarMoeda(m.anterior)}</td><td>{formatarMoeda(m.novo)}</td></tr>)}</tbody></table></div>
    <p>Preços vazios e iguais ao atual são preservados. Zero informado substitui o preço. Dados cadastrais não são alterados.</p>
   </>}
   <footer className={styles.importPriceFooter}><p role="status">{ocupado?(livro?'Conferindo preços…':'Lendo arquivo…'):aplicado?'Importação aplicada.':'Nenhuma alteração aplicada.'}</p><div>
    {aplicado?<BotaoAcaoCompacto onClick={onClose} disabled={ocupado}>Fechar</BotaoAcaoCompacto>:<>
     {!revisao&&<BotaoAcaoCompacto disabled={ocupado} onClick={()=>{setAtivas({});setOrigens({});setErro('');}}>Limpar seleção</BotaoAcaoCompacto>}
     {revisao&&<BotaoAcaoCompacto disabled={ocupado} onClick={()=>{setRevisao(null);setErro('');}}>Voltar à seleção</BotaoAcaoCompacto>}
     <BotaoAcaoCompacto disabled={ocupado} onClick={onClose}>Cancelar</BotaoAcaoCompacto>
     <BotaoAcaoCompacto variante="primario" disabled={ocupado||!podeEditar||(!revisao&&(!aba||aba.ocorrencias.length>0||!elegiveis.some(t=>ativas[t.codigo])))||Boolean(revisao&&!revisao.alterados)} onClick={()=>void(revisao?confirmar():revisar())}>{revisao?'Confirmar importação':'Revisar importação'}</BotaoAcaoCompacto>
    </>}
   </div></footer>
  </div>
 </Modal></div>;
}

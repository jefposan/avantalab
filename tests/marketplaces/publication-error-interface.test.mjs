import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire, stripTypeScriptTypes } from 'node:module';
import vm from 'node:vm';
import ts from 'typescript';
import { publicationErrors } from '../../app/modules/marketplaces/services/catalog-publication.ts';
import * as publicationPrefill from '../../app/modules/marketplaces/publication-prefill.ts';
const require=createRequire(import.meta.url);

for (const simulated of [false, true]) test(`formulário ${simulated ? 'simulado' : 'real'} mostra recusa, preserva edição/chave e foca campo; recusa sem campo foca diagnóstico`,async()=>{
  const states=[],refs=[],effects=[],frames=[],requests=[],focused=[],scrolled=[];
  let cursor=0,refCursor=0,first=true,tree;
  let successResponse=null,published=0;
  const product={id:'local',source:'local_product',name:'Ventilador',picture:'https://example.test/foto.jpg',pictures:['https://example.test/foto.jpg'],attributes:[{id:'COLOR',name:'Cor',value:'Preto'}],description:'Produto de teste'};
  const prepared={status:'found',ean:'7891129598607',localProductId:'local',product,categoryId:'MLB1234',categories:[{id:'MLB1234',name:'Ventiladores'}],listingTypes:[{id:'gold_special',name:'Clássico'}],shippingModes:[{id:'me2',name:'Mercado Envios'}],conditions:[{id:'new',name:'Novo'}],requiredAttributes:[{id:'VOLTAGE',name:'Voltagem',values:[]}]};
  const form={ean:prepared.ean,productId:'local',localProductId:'local',categoryId:prepared.categoryId,price:198,stock:1,listingType:'gold_special',shippingMode:'me2',condition:'new',warrantyType:'factory',warrantyTime:'3 meses',description:'Dados mantidos',pictureUrl:product.picture,attributes:{VOLTAGE:'127'}};
  let failure=Object.assign(new Error('Informe a quantidade e a unidade da garantia.'),{code:'invalid_fields',details:'Warranty time must include unit.',fields:{warrantyTime:'Prazo da garantia: informe a quantidade e a unidade.','attribute:COLOR':'Cor: valor não aceito.','attribute:VOLTAGE':'Voltagem inválida.'}});
  prepared.localProductRevision='revision-1';prepared.constraints={maxTitleLength:60};
  let rejectNameSave=false;
  const request=async(path,body)=>{requests.push({path,body});if(path==='produtos/preparar')return{result:prepared,form,sourceTitle:product.name};if(path==='preparar/conteudo'){if(rejectNameSave)throw Error('Falha ao salvar nome');return{result:{...prepared,product:{...product,name:body.form.name},localProductRevision:'revision-2'}};}assert.equal(path,'publicar');if(successResponse)return successResponse;throw failure;};
  const all=node=>Array.isArray(node)?node.flatMap(all):node&&typeof node==='object'?[node,...all(node.props?.children)]:[];
  const exported={};
  vm.runInNewContext(ts.transpileModule(readFileSync('app/marketplaces/NewListing.tsx','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText,{
    exports:exported,crypto,Object,Number,Error,AbortSignal,
    requestAnimationFrame:fn=>frames.push(fn),
    document:{getElementById(id){if(!all(tree).some(node=>node.props?.id===id))return null;return{tagName:id==='new-attributes'?'DETAILS':'INPUT',focus:()=>focused.push(id),scrollIntoView:()=>scrolled.push(id),closest:()=>null};}},
    require(name){
      if(name==='react')return{useCallback:fn=>fn,useState(initial){const i=cursor++;if(!(i in states))states[i]=typeof initial==='function'?initial():initial;return[states[i],value=>states[i]=typeof value==='function'?value(states[i]):value];},useRef(initial){return refs[refCursor++] ||= {current:initial};},useEffect(fn){if(first)effects.push(fn);}};
      if(name==='./PublicationOptionalAttributes')return {default:'optional-attributes'};
      if(name==='./ProductPhotoInput')return {default:'photo-input'};
      if(name==='./usePreparationSummary')return {default:()=>({current:null})};
      if(name==='./LocalProductPricing')return {PreparationPriceReference:'price-reference'};
      if(name.includes('publication-content-readiness'))return {publicationContentReadiness:()=>[]};
      if(name==='./PublicationShipping')return{default:'shipping'};
      if(name==='./ProductThumbnail')return{default:'product-thumbnail'};
      if(name==='./publication-request')return{publicationRequest:action=>action(undefined)};
      if(name==='./Anunciados')return{marketplaceClientRequest:simulated?()=>{throw new Error('Simulação tentou usar cliente real');}:request};
      if(name.includes('publication-prefill'))return publicationPrefill;
      if(name.includes('catalog-publication'))return{publicationErrors};
      if(name.includes('formatters'))return{formatarMoedaDigitada:value=>(Number(value)/100).toFixed(2).replace('.',','),moedaDigitadaParaNumero:value=>Number(value.replace(',','.'))};
      if(name.endsWith('.module.css'))return{default:new Proxy({},{get:(_,key)=>key})};
      if(name.includes('account-identification'))return{accountDisplayName:()=> 'Conta',accountReferenceDetail:()=>''};
      if(name.includes('MarketplaceAccountPicker'))return{default:'account-picker'};
      if(name.includes('MarketplaceSelect'))return{default:'select'};
      if(name.includes('CatalogCandidateChooser'))return{default:'catalog-candidate-chooser'};
      if(name.includes('CampoBusca'))return{default:'search'};
      if(name.includes('BotaoAcaoCompacto'))return{default:'button'};
      if(name.includes('CarregamentoDadosModulo'))return{default:'preparation-loading'};
      if(name.includes('ModalConfirmacao'))return{default:'publication-popup'};
      if(name.includes('MultiAccountPublication'))return{default:'multi-account-publication'};
      if(name.includes('/Icon'))return{Icon:'icon'};
      return require(name);
    },
  });
  const props={companyId:'company',accountId:'target',accounts:[{id:'target',status:'connected'}],canManage:true,onBusyChange(){},onPublished(){published++;},onCopyHandled(){},copyRequest:{id:'copy',localProductId:'local',targetConnectionId:'target'}};
  if(simulated)props.simulation={request};
  const render=()=>{cursor=0;refCursor=0;tree=exported.default(props);first=false;return tree;};
  const byId=id=>all(tree).find(node=>node.props?.id===id);
  const button=text=>all(tree).find(node=>node.type==='button'&&node.props?.children===(simulated&&text==='Publicar'?'Simular publicação':text));
  const summaryValues=()=>all(all(tree).find(node=>node.type==='aside')).filter(node=>node.type==='dd').map(node=>node.props.children);
  render();effects.forEach(fn=>fn());await new Promise(setImmediate);render();
  if(simulated)assert.equal(all(tree).find(node=>node.type==='shipping').props.request,request,'frete também usa exclusivamente o adaptador fictício');
  assert.ok(summaryValues().includes('R$ 198,00'));
  assert.ok(summaryValues().includes('1 un.'));
  assert.ok(summaryValues().includes('Conta'));
  assert.ok(summaryValues().includes('Ventiladores'));
  byId('new-title').props.onChange({target:{value:'A'.repeat(67)}});render();
  assert.match(byId('new-title-error').props.children,/67 caracteres/);
  byId('new-title').props.onBlur();await new Promise(setImmediate);render();
  assert.equal(requests.filter(row=>row.path==='preparar/conteudo').length,0,'nome acima do limite não é salvo automaticamente');
  byId('new-title').props.onChange({target:{value:'A'.repeat(53)}});render();
  assert.equal(byId('new-title-error'),undefined,'aviso acompanha a correção durante a digitação');
  byId('new-title').props.onBlur();await new Promise(setImmediate);render();
  assert.equal(requests.at(-1).body.form.name,'A'.repeat(53));
  assert.equal(byId('new-title').props.value,'A'.repeat(53));
  assert.equal(byId('new-publication-error'),undefined,'salvamento automático não recria aviso no rodapé');
  assert.equal(byId('catalog-match').props.checked,false);
  rejectNameSave=true;
  byId('new-title').props.onChange({target:{value:'Nome corrigido'}});render();
  await button('Publicar').props.onClick();await new Promise(setImmediate);render();
  assert.match(byId('new-title-error').props.children,/tentar novamente/);
  assert.equal(byId('new-title').props.value,'Nome corrigido','falha mantém edição');
  assert.equal(requests.filter(row=>row.path==='publicar').length,0);
  rejectNameSave=false;
  await button('Publicar').props.onClick();await new Promise(setImmediate);render();
  assert.equal(byId('new-title-error'),undefined);
  assert.equal(byId('new-publication-error'),undefined,'sucesso após tentar novamente limpa o erro sem aviso de sucesso');
  byId('new-title').props.onChange({target:{value:product.name}});render();
  byId('new-title').props.onBlur();await new Promise(setImmediate);render();
  const preview=()=>all(tree).find(node=>node.type==='aside');
  assert.equal(all(preview()).find(node=>node.type==='product-thumbnail').props.url,product.picture);
  assert.ok(summaryValues().includes('De fábrica · 3 meses'));
  assert.ok(all(preview()).some(node=>node.type==='p'&&node.props.children==='Dados mantidos'));
  const actions=all(tree).find(node=>node.props?.className==='preparationActions');
  assert.equal(actions.props.role,'group');
  assert.equal(actions.props['aria-label'],'Ações do anúncio');
  const actionButtons=all(actions).filter(node=>node.type==='button');
  assert.deepEqual(actionButtons.map(node=>node.props.children),['Cancelar anúncio','Revalidar dados',simulated?'Simular publicação':'Publicar']);
  assert.deepEqual(actionButtons.map(node=>node.props.className),['preparationCancel','preparationReview','preparationPublish']);
  assert.equal(all(tree).some(node=>node.props?.children==='Validar EAN'),false,'EAN recebido e válido não pede nova validação');
  assert.equal(byId('new-local-ean').props['aria-describedby'],undefined);
  all(tree).find(node=>node.type==='shipping').props.onReview({shippingQuoteToken:'simulated-proof'},false);render();
  // Confirmação ausente não transforma o botão em um controle morto: indica a pendência sem POST.
  assert.equal(button('Publicar').props.disabled,false);
  await button('Publicar').props.onClick();render();frames.splice(0).forEach(fn=>fn());
  assert.equal(requests.filter(row=>row.path==='publicar').length,0);assert.equal(focused.at(-1),'catalog-match');
  assert.equal(byId('catalog-match').props['aria-invalid'],true);
  assert.equal(byId('catalog-match').props['aria-describedby'],'catalog-match-error');
  assert.equal(all(tree).find(node=>node.props?.className==='catalogMatchArea').props['data-invalid'],true);
  byId('catalog-match').props.onChange({target:{checked:true}});render();
  assert.equal(byId('catalog-match').props['aria-invalid'],false);
  assert.equal(byId('catalog-match-error'),undefined);
  byId('new-local-ean').props.onChange({target:{value:'7899882306941'}});render();
  await button('Publicar').props.onClick();render();frames.splice(0).forEach(fn=>fn());
  assert.equal(requests.filter(row=>row.path==='publicar').length,0,'EAN alterado não é silenciosamente substituído pelo código antigo no envio');
  assert.equal(focused.at(-1),'new-local-ean');
  byId('new-local-ean').props.onChange({target:{value:prepared.ean}});render();
  assert.equal(button('Publicar').props.disabled,false);
  const sending=button('Publicar').props.onClick();render();
  assert.equal(all(tree).find(node=>node.type==='publication-popup').props.aberto,true);
  assert.equal(all(tree).find(node=>node.type==='publication-popup').props.carregando,true);
  assert.equal(all(tree).find(node=>node.type==='publication-popup').props.mensagem,'');
  await sending;await new Promise(setImmediate);render();frames.splice(0).forEach(fn=>fn());
  assert.equal(all(tree).find(node=>node.type==='publication-popup').props.aberto,false);
  assert.equal(byId('new-warrantyTime').props['aria-invalid'],true);
  assert.equal(byId('new-attributes').props.open,true);
  assert.equal(byId('new-price').props.value,'198,00');assert.equal(byId('new-stock').props.value,'1');assert.equal(byId('new-description').props.value,'Dados mantidos');
  assert.ok(focused.includes('new-warrantyTime'));assert.ok(scrolled.includes('new-warrantyTime'));
  assert.match(byId('new-publication-error').props.children,/quantidade e a unidade/);
  const technical=all(tree).find(node=>node.type==='summary'&&node.props.children==='Detalhes técnicos (última tentativa)');
  assert.ok(technical);
  assert.equal(all(tree).find(node=>node.type==='details'&&all(node).includes(technical)).props.open,undefined);
  assert.equal(requests.filter(row=>row.path==='publicar').length,1);
  const key=requests.at(-1).body.requestKey;
  const links=all(tree).filter(node=>node.type==='button'&&node.props?.children==='Conferir campo');assert.equal(links.length,3);
  links[1].props.onClick();assert.equal(focused.at(-1),'new-attributes');
  byId('new-warrantyTime').props.onChange({target:{value:'3 meses'}});render();assert.equal(byId('new-warrantyTime').props['aria-invalid'],false);
  byId('new-price').props.onChange({target:{value:'19900'}});render();
  assert.ok(summaryValues().includes('R$ 199,00'),'resumo acompanha a edição sem envio ao marketplace');
  assert.equal(button('Publicar').props.disabled,false);
  byId('new-attribute:VOLTAGE').props.onChange({target:{value:'127 V'}});render();assert.equal(byId('new-attribute:VOLTAGE').props['aria-invalid'],false);
  assert.ok(summaryValues().includes('127 V'),'prévia acompanha os atributos editados');
  assert.equal(all(tree).filter(node=>node.type==='button'&&node.props?.children==='Conferir campo').length,1);
  await button('Publicar').props.onClick();render();frames.splice(0).forEach(fn=>fn());
  assert.equal(requests.filter(row=>row.path==='publicar').length,1,'sem revisão do frete/confirmação não envia outra solicitação');
  assert.equal(button('Publicar').props.disabled,false);
  assert.ok(all(tree).some(node=>typeof node.props?.children==='string'&&node.props.children.includes('Confira a estimativa')));
  failure=new Error('Sem campo indicado pelo Mercado Livre: seller must verify identity.');
  all(tree).find(node=>node.type==='shipping').props.onReview({shippingQuoteToken:'simulated-new-proof'},false);render();
  byId('catalog-match').props.onChange({target:{checked:true}});render();
  await button('Publicar').props.onClick();await new Promise(setImmediate);render();frames.splice(0).forEach(fn=>fn());
  assert.equal(focused.at(-1),'new-publication-error');assert.equal(byId('new-warrantyTime').props.value,'3 meses');
  const retryKey=requests.at(-1).body.requestKey;
  assert.notEqual(retryKey,key);assert.equal(requests.filter(row=>row.path==='publicar').length,2);
  // Recusa confirmada renovou a chave; resposta desconhecida conserva a nova, sem duplicar.
  await button('Publicar').props.onClick();await new Promise(setImmediate);render();
  assert.equal(requests.at(-1).body.requestKey,retryKey);assert.equal(button('Publicar').props.disabled,false);
  assert.equal(byId('new-price').props.value,'199,00');
  failure=Object.assign(new Error('O Mercado Livre exigiu EAN.'),{code:'invalid_fields',fields:{ean:'EAN / GTIN obrigatório nesta categoria.'}});
  await button('Publicar').props.onClick();await new Promise(setImmediate);render();frames.splice(0).forEach(fn=>fn());
  assert.equal(focused.at(-1),'new-local-ean');assert.equal(scrolled.at(-1),'new-local-ean');
  assert.equal(byId('new-local-ean').props['aria-invalid'],true);
  assert.ok(button('Validar EAN'),'recusa de EAN permite revalidar mesmo sem alterar o código');
  assert.equal(byId('new-local-ean').props['aria-describedby'],'new-local-ean-error');
  assert.notEqual(focused.at(-1),'new-ean');
  assert.equal(byId('new-local-ean-error').props.children,'EAN / GTIN obrigatório nesta categoria.');
  assert.equal(published,0,'recusas e respostas desconhecidas não encerram a preparação');
  successResponse={status:'publishing',listing:{id:'MLB123'},localProductId:'local'};
  await button('Publicar').props.onClick();await new Promise(setImmediate);render();
  assert.equal(published,0);assert.ok(byId('new-price'),'resultado não concluído conserva dados');
  successResponse={status:'published',listing:{id:'MLB123'},localProductId:'local'};
  await button('Publicar').props.onClick();await new Promise(setImmediate);render();
  assert.equal(published,1);assert.equal(byId('new-price'),undefined);assert.equal(button('Publicar'),undefined);
  assert.equal(all(tree).some(node=>node.type==='aside'),false,'preparação concluída não deixa resumo antigo');
  assert.equal(byId('new-ean').props.value,'');assert.equal(byId('new-search-description').props.value,'');
  const popup=all(tree).find(node=>node.type==='publication-popup');
  assert.equal(popup.props.aberto,true);assert.equal(popup.props.carregando,false);
  assert.equal(popup.props.titulo,simulated?'Simulação concluída':'Publicação concluída');
  assert.equal(popup.props.centralizarTexto,true);
  assert.equal(byId('new-publication-error'),undefined);
  popup.props.aoConfirmar();render();assert.equal(all(tree).find(node=>node.type==='publication-popup').props.aberto,false);
});

test('ações usam componente oficial, alinhamento central e estados de interação acessíveis',()=>{
 const source=readFileSync('app/marketplaces/NewListing.tsx','utf8');
 const css=readFileSync('app/marketplaces/marketplaces.module.css','utf8');
 const actions=source.slice(source.indexOf('<div className={styles.preparationActions}'),source.indexOf('{publishedId && connectedAccounts.filter'));
 assert.equal((actions.match(/<BotaoAcaoCompacto\b/g)||[]).length,3);
 assert.doesNotMatch(actions,/<button\b/);
 assert.match(css,/\.preparationActions \{[^}]*flex-wrap: wrap;[^}]*justify-content: center/);
 for(const [name,color] of [['Cancel','#b42318'],['Review','#003e73'],['Publish','#047857']]){
   assert.match(css,new RegExp(`\\.preparation${name} \\{ --preparation-action: ${color};`));
   assert.match(css,new RegExp(`\\.dark \\.preparation${name} \\{ --preparation-action:`));
 }
 assert.match(css,/\.preparationActions > button:hover:not\(:disabled\) > span \{[^}]*translateY\(-1px\)/);
 assert.match(css,/\.preparationActions > button:active:not\(:disabled\) > span \{[^}]*box-shadow: inset[^}]*translateY\(1px\)/);
 assert.match(css,/\.preparationActions > button \{ --av-action-focus: var\(--preparation-action\)/);
 assert.match(css,/prefers-reduced-motion: reduce\) \{\s*\.preparationActions > button > span \{ transition: none/);
 assert.match(css,/\.preparationActions > button:is\(:hover,:active\):not\(:disabled\) > span \{ transform: none/);
});

test('retorno da preparação usa rodapé próprio, sem disputar espaço com ações ou prévia',()=>{
 const source=readFileSync('app/marketplaces/NewListing.tsx','utf8');
 const css=readFileSync('app/marketplaces/marketplaces.module.css','utf8');
 assert.match(source,/\(message \|\| technicalDetails\) && <section className=\{styles\.newListingFooter\} aria-label="Retorno da preparação">/);
 assert.match(css,/\.newListingFooter \{[^}]*clear: both;[^}]*width: 100%;[^}]*margin-top: 28px/);
 assert.match(css,/\.newListingFooter :is\(\.connectionMessage, \.catalogSuccess\) \{[^}]*padding: 14px 16px;[^}]*text-align: left/);
 assert.match(css,/\.dark \.newListingFooter \{[^}]*border-color/);
});

test('salvar ficha manual ou automaticamente não cria aviso de sucesso no rodapé',()=>{
 const source=readFileSync('app/marketplaces/NewListing.tsx','utf8');
 assert.doesNotMatch(source,/Nome atualizado no cadastro\.|Ficha salva no cadastro\./);
});

for(const field of ['ean','attribute:GTIN','attribute:EAN']) test(`Conferir campo de ${field} usa EAN do anúncio, nunca pesquisa`,()=>{
  const source=readFileSync('app/marketplaces/NewListing.tsx','utf8');
  const start=source.indexOf('  function focusFirstError('),end=source.indexOf('\n  function toggleScanner(',start);
  for(const hasInput of [true,false]){
    const focused=[],queried=[];
    const focus=vm.runInNewContext(`(${stripTypeScriptTypes(source.slice(start,end))})`,{Object,document:{getElementById(id){queried.push(id);if(!['new-ean','new-attributes',...(hasInput?['new-local-ean']:[])].includes(id))return null;return{tagName:id==='new-attributes'?'DETAILS':'INPUT',open:false,closest:()=>null,scrollIntoView(){},focus:()=>focused.push(id)};}}});
    focus({[field]:'Erro de EAN'});
    assert.equal(focused.at(-1),hasInput?'new-local-ean':'new-attributes');
    assert.equal(queried.includes('new-ean'),false);
  }
});

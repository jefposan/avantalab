import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import {PGlite} from '@electric-sql/pglite';
import {fiscalItemDetails,fiscalOperationCfop,fiscalIbsCbsRequired} from '../../app/vendas/lib/fiscal-item-presentation.mjs';
import {validateFiscalDraft} from '../../app/vendas/lib/domain.mjs';

const item={sku:'T016',name:'Produto de nome longo para conferência',kind:'produto',unit:'UN',quantity:12,unitPrice:99,unitDiscount:1,ncm:'33059000',taxableUnit:'UN',fiscalOriginCode:'0',cfopInternal:'5102',cfopInterstate:'',icmsCode:'102',pisCst:'49',cofinsCst:'49',fiscalStatus:'Completo'};
const config={companyDocument:'12345678000190',taxRegime:'simples_nacional',cityCode:'3550308',stateRegistration:'123',certificateValid:true,providerConnected:true,fiscalResponsible:'Responsável',taxReviewConfirmed:true,taxReformReviewConfirmed:true,fiscalMatrixRuleMatched:true,fiscalMatrixRuleReviewed:true,fiscalDestination:'Dentro da UF',issueDate:'2026-11-05'};

test('conferência exige somente o CFOP da operação; campos obrigatórios e outra UF continuam protegidos',()=>{
 const run=(changed={})=>validateFiscalDraft({documentType:'nfe',recipient:{name:'Cliente',document:'12345678909',city:'São Paulo/SP'},items:[item],config:{...config,...changed}});
 assert.equal(run().draftReady,true);
 assert.equal(run().transmissionReady,true);
 assert.equal(run({fiscalDestination:'Fora da UF'}).draftReady,false);
 assert.equal(run({certificateValid:false}).transmissionReady,false);
 assert.equal(run({fiscalMatrixRuleReviewed:false}).draftReady,false);
 assert.equal(fiscalOperationCfop(item,'Dentro da UF'),'5102');
 assert.equal(fiscalOperationCfop(item,'Fora da UF'),'');
});

test('IBS/CBS: exceção explícita NF-e Simples em 2026; outros regimes, anos e contextos permanecem exigidos',()=>{
 assert.equal(fiscalIbsCbsRequired({documentType:'nfe',taxRegime:'Simples Nacional',issueDate:'2026-11-05'}),false);
 for(const changed of [{taxRegime:'lucro_presumido'},{issueDate:'2027-01-01'},{documentType:'nfse'},{issueDate:'2026-99-99'},{taxRegime:''}]) assert.equal(fiscalIbsCbsRequired({documentType:'nfe',taxRegime:'simples_nacional',issueDate:'2026-11-05',...changed}),true);
 const base={documentType:'nfe',recipient:{name:'Cliente',document:'12345678909',city:'São Paulo/SP'},items:[item],config};
 assert.equal(validateFiscalDraft(base).checks.some(x=>x.key==='reforma-itens'),false);
 assert.equal(validateFiscalDraft({...base,config:{...config,issueDate:'2027-01-01'}}).checks.find(x=>x.key==='reforma-itens').ready,false);
});

test('ficha fiscal organiza rótulos, só mostra complementos informados e não inventa pendências',()=>{
 const fields=fiscalItemDetails(item,'Dentro da UF');
 assert.ok(fields.some(x=>x.label==='NCM'&&x.value==='33059000'));
 assert.ok(fields.some(x=>x.label==='CFOP da operação'&&x.value==='5102'));
 assert.ok(!fields.some(x=>['CST IBS/CBS','CST do IPI','Base do ICMS-ST','CEST'].includes(x.label)));
 assert.ok(!fields.some(x=>/pendente|\.\.\./i.test(x.value)));
 assert.ok(fiscalItemDetails({...item,cest:'1234567',ibsCbsCst:'000',ibsCbsClassification:'000001'}).some(x=>x.label==='Classificação IBS/CBS'));
});

const source=readFileSync('app/vendas/sistema/VendasServicosPrototype.tsx','utf8');
function ui(){
 const start=source.indexOf('function useFiscalSectionScroll('),end=source.indexOf('\nfunction FiscalRejectedCorrectionDialog(',start);
 const node=(type,props)=>({type,props}); let calls=0;
 const sandbox={exports:{},require:()=>({jsx:node,jsxs:node,Fragment:'fragment'}),useState:value=>[value,()=>{}],useRef:()=>({current:null}),useEffect:()=>{},useContext:()=>({can:()=>true}),PermissionContext:{},Dialog:'Dialog',Badge:'Badge',Icon:'Icon',Table:'Table',BotaoAcaoCompacto:'Button',BotaoExpandirCard:'Expand',fiscalItemDetails,fiscalDraftUserStatus:()=>({label:'A revisar',tone:'warning'}),fiscalStatusPresentation:()=>({label:'Autorizada',tone:'success'}),documentLabel:()=> 'NF-e',money:value=>String(value),paymentMethodLabel:()=> 'À vista'};
 vm.runInNewContext(ts.transpileModule(source.slice(start,end)+'\nexports.details=FiscalDraftDetailsDialog;exports.tax=FiscalItemTaxDetails;', {compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,sandbox);
 const draft={id:'draft',originId:'2026/1',sourceLabel:'Pedido',documentType:'nfe',client:'Cliente',clientDocument:'123',total:1188,items:[item],status:'Com pendências',commercialTotals:{orderDiscount:0,freight:0,insurance:0,other:0},checks:[{key:'certificado',label:'Certificado',detail:'Adicione o certificado',ready:false,scope:'transmissao'}],events:[{label:'Criado',date:'2026-11-05',description:'Histórico original',user:'Sistema'}]};
 return {draft,details:extra=>sandbox.exports.details({draft,company:{name:'Empresa'},onClose(){calls++;},onRevalidate(){calls++;},...extra}),tax:()=>sandbox.exports.tax({draft}),calls:()=>calls};
}
function nodes(tree){return !tree||typeof tree!=='object'?[]:[tree,...[tree.props?.children].flat(Infinity).flatMap(nodes)];}
test('abrir detalhes não executa ações, mantém pendências visíveis e recolhe ficha/histórico com controle oficial',()=>{
 const f=ui(),tree=f.details(),all=nodes(tree);
 assert.equal(f.calls(),0);
 assert.ok(all.some(n=>n.props?.['aria-label']==='Pendências para emissão'));
 assert.ok(all.some(n=>n.type==='Table'&&n.props.headers.join('|')==='Produto ou serviço|Quantidade|Valor unit.|Desconto unit.|Subtotal'));
 assert.ok(!all.some(n=>n.props?.['data-label']==='Classificação'));
 assert.ok(all.some(n=>n.props?.hidden===true&&n.props.id==='fiscal-history-draft'));
 const tax=nodes(f.tax());assert.ok(tax.some(n=>n.type==='Expand'&&n.props.variante==='painel'&&n.props.modo==='lista'&&!n.props.expandido));
 assert.ok(tax.some(n=>n.props?.hidden===true));
 assert.equal(f.calls(),0);
 const authorized=nodes(f.details({remoteStatus:{state:'authorized',authorized:true,environment:'homologacao'}}));
 assert.ok(!authorized.some(n=>n.props?.['aria-label']==='Pendências para emissão'));
});

test('migração Tridium inclui ativos e inativos de todos os catálogos; preserva serviços, outras empresas, dados e escolha posterior',async()=>{
 const db=new PGlite();const company='ec9604fd-38f2-429b-9c00-c4bc6c642b0e';
 try{
  await db.exec(`create table vendas_mobile_catalogos(id uuid primary key,empresa_id uuid);
   create table vendas_mobile_catalogo_produtos(id int primary key,catalogo_id uuid references vendas_mobile_catalogos, tipo_item text,ativo boolean,ncm text,cest text,usar_fiscal_empresa boolean,cst_pis text,excluido_em timestamptz);
   create table custos_importacoes_catalogo_backups(id bigserial,empresa_id uuid,catalogo_id uuid,origem text,retrato jsonb);
   insert into vendas_mobile_catalogos values('10000000-0000-4000-8000-000000000001','${company}'),('10000000-0000-4000-8000-000000000002','${company}'),('10000000-0000-4000-8000-000000000003','10000000-0000-4000-8000-000000000004');
   insert into vendas_mobile_catalogo_produtos(id,catalogo_id,tipo_item,ativo,ncm,cest,usar_fiscal_empresa,cst_pis) values(1,'10000000-0000-4000-8000-000000000001','produto',true,'33059000','1234567',false,'04'),(2,'10000000-0000-4000-8000-000000000002','produto',false,'33059000',null,null,null),(3,'10000000-0000-4000-8000-000000000001','servico',true,null,null,false,'49'),(4,'10000000-0000-4000-8000-000000000003','produto',true,'33059000',null,false,'04');`);
  await db.exec(`insert into vendas_mobile_catalogo_produtos values(5,'10000000-0000-4000-8000-000000000001','produto',false,'33059000',null,false,'04',now());
    create function proteger_excluido() returns trigger language plpgsql as $$begin if old.excluido_em is not null then raise exception 'Histórico protegido';end if;return new;end$$;
    create trigger preservar_historico before update on vendas_mobile_catalogo_produtos for each row execute function proteger_excluido();`);
  const sql=readFileSync('supabase/migrations/20261105190000_tridium_adotar_heranca_fiscal_produtos.sql','utf8');await db.exec(sql);
  const rows=(await db.query('select id,usar_fiscal_empresa,ncm,cest,cst_pis from vendas_mobile_catalogo_produtos order by id')).rows;
  assert.deepEqual(rows.map(x=>x.usar_fiscal_empresa),[true,true,false,false,false]);
  assert.equal(rows[0].ncm,'33059000');assert.equal(rows[0].cest,'1234567');assert.equal(rows[0].cst_pis,'04');
  const backup=(await db.query('select retrato from custos_importacoes_catalogo_backups order by id')).rows;
  assert.equal(backup.length,2);assert.equal(backup[0].retrato.produtos[0].usar_fiscal_empresa,false);
  await db.exec('update vendas_mobile_catalogo_produtos set usar_fiscal_empresa=false where id=1');await db.exec(sql);
  assert.equal((await db.query('select usar_fiscal_empresa from vendas_mobile_catalogo_produtos where id=1')).rows[0].usar_fiscal_empresa,false);
  assert.equal((await db.query('select count(*)::int n from custos_importacoes_catalogo_backups')).rows[0].n,2);
 }finally{await db.close();}
});

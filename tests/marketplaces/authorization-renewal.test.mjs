import assert from 'node:assert/strict';
import test from 'node:test';
import { registerHooks } from 'node:module';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { randomBytes } from 'node:crypto';

const root = resolve(import.meta.dirname, '../..');
const hooks = registerHooks({ resolve(specifier, context, next) {
  if (specifier === 'server-only') return { url: 'data:text/javascript,export {}', shortCircuit: true };
  if (specifier === '@supabase/supabase-js') return { url: 'data:text/javascript,export function createClient(){return globalThis.renewalDb}', shortCircuit: true };
  if (specifier === 'next/server') return { url: 'data:text/javascript,export class NextResponse extends Response {static json(body,options){return new NextResponse(JSON.stringify(body),options)}}', shortCircuit: true };
  if (specifier.endsWith('/management-access') || specifier === './management-access') return { url: 'data:text/javascript,export class MarketplaceError extends Error {constructor(status,code,message){super(message);this.status=status;this.code=code}};export function managementFailure(error){return Response.json({message:error.message,code:error.code},{status:error.status||503})};export async function authorizeMarketplace(){return globalThis.renewalAccess()}', shortCircuit: true };
  let candidate;
  if (specifier.startsWith('@/')) candidate = resolve(root, specifier.slice(2));
  else if (specifier.startsWith('.') && context.parentURL?.startsWith('file:')) candidate = resolve(dirname(new URL(context.parentURL).pathname), specifier);
  if (candidate && existsSync(`${candidate}.ts`)) return next(pathToFileURL(`${candidate}.ts`).href, context);
  return next(specifier, context);
} });
const service = await import('../../app/modules/marketplaces/services/authorization-renewal.ts');
const vault = await import('../../app/modules/marketplaces/services/secret-vault.ts');
const callback = await import('../../app/api/modulos/marketplaces/conexoes/mercado-livre/callback/route.ts');
const publicRoute = await import('../../app/api/marketplaces/renovar/route.ts');
const privateRoute = await import('../../app/api/modulos/marketplaces/conexoes/mercado-livre/renovar/route.ts');
const clientAuthorization = await import('../../app/marketplaces/renewal-authorization.ts');
hooks.deregister();
const company = '11111111-1111-4111-8111-111111111111', actor = '33333333-3333-4333-8333-333333333333', connection = '22222222-2222-4222-8222-222222222222';
const originalFetch = globalThis.fetch;
test.before(() => {
  process.env.MARKETPLACE_SECRETS_KEY = randomBytes(32).toString('base64url');
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.example'; process.env.SUPABASE_SERVICE_ROLE_KEY = 'fixture-service';
  process.env.MERCADOLIVRE_CLIENT_ID = 'fixture-id'; process.env.MERCADOLIVRE_CLIENT_SECRET = 'fixture-secret';
  process.env.MERCADOLIVRE_OAUTH_REDIRECT_URI = 'https://avantalab.com.br/api/modulos/marketplaces/conexoes/mercado-livre/callback';
});
test.afterEach(() => { globalThis.fetch = originalFetch; delete globalThis.renewalAccess; delete globalThis.renewalDb; });

class Query {
  constructor(db,table) { this.db=db;this.table=table;this.filters=[];this.mode='select'; }
  select() { return this; }
  eq(key,value) { this.filters.push(row=>row[key]===value);return this; }
  is(key,value) { this.filters.push(row=>(row[key]??null)===value);return this; }
  in(key,values) { this.filters.push(row=>values.includes(row[key]));return this; }
  gt(key,value) { this.filters.push(row=>row[key]>value);return this; }
  limit(n) { this.max=n;return this; }
  or() { this.filters.push(row=>!row.refresh_lock_until || Date.parse(row.refresh_lock_until)<Date.now());return this; }
  filter(key,op,value) { assert.equal(op,'eq');this.filters.push(row=>JSON.stringify(row[key])===value);return this; }
  update(values) { this.mode='update';this.values=values;return this; }
  insert(values) { this.mode='insert';this.values=values;return this; }
  async maybeSingle() { const result=await this.run();return {...result,data:result.data?.[0]||null}; }
  then(resolve,reject) { return this.run().then(resolve,reject); }
  async run() {
    if(this.db.fail===this.table) return {error:new Error('database'),data:null};
    if(this.mode==='update' && this.table==='marketplace_connections' && this.db.beforeUpdate) { this.db.beforeUpdate();this.db.beforeUpdate=null; }
    const rows=this.db.tables[this.table]||=[];
    let selected=rows.filter(row=>this.filters.every(fn=>fn(row))).slice(0,this.max||1000);
    if(this.mode==='insert') { const value={id:randomBytes(12).toString('hex'),consumed_at:null,...this.values};rows.push(value);selected=[value]; }
    if(this.mode==='update') selected.forEach(row=>Object.assign(row,this.values));
    return {data:selected,error:null};
  }
}
function database() {
  return { tables:{marketplace_oauth_pending:[],marketplace_connections:[{id:connection,empresa_id:company,provider:'mercado_livre',seller_reference:'123',seller_name:'CONTA_ALVO',status:'connected',connected_at:'2026-01-01',token_sealed:vault.sealMarketplaceSecret('old-tokens'),scopes:['read'],last_synced_at:'2026-10-10'}],usuarios_empresa:[{id:'member',empresa_id:company,user_id:actor,status:'ativo',perfil:'administrador'}],empresa_modulos:[{empresa_id:company,modulo_id:'marketplaces',ativo:true,expira_em:null}],marketplace_sales:[{id:'sale',connection_id:connection}],marketplace_listings:[{id:'listing',connection_id:connection}]},from(table){return new Query(this,table)} };
}
async function requested(db=database()) { const request=await service.createAuthorizationRenewal(db,company,actor,connection,'https://avantalab.com.br');const data=await service.readAuthorizationRenewal(db,request.requestId);return {db,request,...data}; }
const credentials = {sellerReference:'123',accessToken:'new-access',refreshToken:'new-refresh',scopes:['read','write'],expiresAt:new Date(Date.now()+3600000).toISOString()};

test('link fragmentado, expirável e ligado à conta; verificador só no cofre',async()=>{
  const {request,pending,intent}=await requested();
  assert.match(request.link,/\/marketplaces\/renovar#solicitacao=[\w-]{43}$/);
  assert.equal(new URL(request.link).search,'');assert.equal(intent.connectionId,connection);
  assert.equal(intent.sellerReference,'123');assert.equal(intent.purpose,'renewal');
  assert.ok(Date.parse(request.expiresAt)-Date.now()>29*60000);
  assert.ok(!JSON.stringify(request).includes(intent.verifier));assert.ok(!JSON.stringify(pending.verifier_sealed).includes(intent.verifier));
  assert.deepEqual(service.authorizationIntent('v'.repeat(86)),{purpose:'connection',verifier:'v'.repeat(86)});
});
test('conta errada ou outra empresa nunca recebe a renovação',async()=>{
  const {db,pending,intent}=await requested();const before=JSON.stringify(db.tables.marketplace_connections);
  await assert.rejects(service.completeAuthorizationRenewal(db,pending,intent,{...credentials,sellerReference:'456'}),{code:'renewal_seller_mismatch'});
  await assert.rejects(service.createAuthorizationRenewal(db,'99999999-9999-4999-8999-999999999999',actor,connection,'https://avantalab.com.br'),{code:'connection_not_found'});
  assert.equal(JSON.stringify(db.tables.marketplace_connections),before);
});
test('renovação preserva id, data original, anúncios, vendas e histórico',async()=>{
  const {db,pending,intent}=await requested();
  await service.completeAuthorizationRenewal(db,pending,intent,credentials);
  const target=db.tables.marketplace_connections[0];
  assert.equal(target.id,connection);assert.equal(target.connected_at,'2026-01-01');assert.equal(target.last_synced_at,'2026-10-10');
  assert.deepEqual(JSON.parse(vault.openMarketplaceSecret(target.token_sealed)),{accessToken:'new-access',refreshToken:'new-refresh'});
  assert.equal(db.tables.marketplace_sales.length,1);assert.equal(db.tables.marketplace_listings.length,1);
});
test('links expirados, usados, inválidos, desconectados e sem permissão falham fechados',async()=>{
  for(const mutation of [d=>d.tables.marketplace_oauth_pending[0].expires_at=new Date(Date.now()-1).toISOString(),d=>d.tables.marketplace_oauth_pending[0].consumed_at=new Date().toISOString(),d=>d.tables.usuarios_empresa[0].perfil='operador_completo',d=>d.tables.usuarios_empresa[0].status='inativo',d=>d.tables.empresa_modulos[0].ativo=false,d=>d.tables.marketplace_connections[0].status='disconnected',d=>d.tables.marketplace_connections[0].seller_reference='456']) {
    const {db,request}=await requested();mutation(db);await assert.rejects(service.readAuthorizationRenewal(db,request.requestId),{code:'renewal_unavailable'});
  }
  await assert.rejects(service.readAuthorizationRenewal(database(),'guess'),{code:'renewal_unavailable'});
});
test('falha de banco, refresh em andamento e alteração concorrente não sobrescrevem tokens',async()=>{
  for(const mode of ['database','lock','race']) {
    const {db,pending,intent}=await requested();
    if(mode==='database') db.fail='usuarios_empresa';
    if(mode==='lock') db.tables.marketplace_connections[0].refresh_lock_until=new Date(Date.now()+60000).toISOString();
    if(mode==='race') db.beforeUpdate=()=>db.tables.marketplace_connections[0].token_sealed=vault.sealMarketplaceSecret('concurrent-tokens');
    await assert.rejects(service.completeAuthorizationRenewal(db,pending,intent,credentials));
    assert.notEqual(vault.openMarketplaceSecret(db.tables.marketplace_connections[0].token_sealed),JSON.stringify({accessToken:'new-access',refreshToken:'new-refresh'}));
  }
});
test('somente pendências vigentes entram no limite de geração',async()=>{
  const db=database();for(let i=0;i<20;i++) db.tables.marketplace_oauth_pending.push({id:String(i),empresa_id:company,started_by:actor,consumed_at:null,expires_at:new Date(Date.now()+60000).toISOString()});
  await assert.rejects(service.createAuthorizationRenewal(db,company,actor,connection,'https://avantalab.com.br'),{code:'renewal_limit'});
});
test('cancelamento privado invalida só o link do solicitante e não desconecta a conta',async()=>{
  const {db,request}=await requested();globalThis.renewalAccess=async()=>({db,empresaId:company,usuario:{id:actor}});
  const response=await privateRoute.DELETE(new Request('https://avantalab.com.br/api/modulos/marketplaces/conexoes/mercado-livre/renovar',{method:'DELETE',body:JSON.stringify({empresaId:company,requestId:request.requestId})}));
  assert.equal(response.status,200);assert.equal(db.tables.marketplace_connections[0].status,'connected');
  await assert.rejects(service.readAuthorizationRenewal(db,request.requestId),{code:'renewal_unavailable'});
});
test('rotas privadas exigem administração e não cancelam link de outra empresa ou solicitante',async()=>{
  const {db,request}=await requested();
  const makeRequest=(method)=>new Request('https://avantalab.com.br/api/modulos/marketplaces/conexoes/mercado-livre/renovar',{method,body:JSON.stringify({empresaId:company,connectionId:connection,requestId:request.requestId})});
  globalThis.renewalAccess=async()=>{throw Object.assign(new Error('Acesso negado'),{status:403,code:'forbidden'})};
  assert.equal((await privateRoute.POST(makeRequest('POST'))).status,403);
  assert.equal((await privateRoute.DELETE(makeRequest('DELETE'))).status,403);
  assert.equal(db.tables.marketplace_oauth_pending.length,1);
  for(const different of [{empresaId:company,usuario:{id:'44444444-4444-4444-8444-444444444444'}},{empresaId:'99999999-9999-4999-8999-999999999999',usuario:{id:actor}}]) {
    globalThis.renewalAccess=async()=>({db,...different});
    assert.equal((await privateRoute.DELETE(makeRequest('DELETE'))).status,410);
    assert.equal(db.tables.marketplace_oauth_pending[0].consumed_at,null);
  }
  assert.equal(db.tables.marketplace_connections[0].status,'connected');
});
test('consulta pública só mostra a conta alvo; origem inválida e fluxo de conectar são recusados',async()=>{
  const {db,request}=await requested();globalThis.renewalDb=db;
  const post=(origin,action='consultar')=>publicRoute.POST(new Request('https://avantalab.com.br/api/marketplaces/renovar',{method:'POST',headers:{Origin:origin},body:JSON.stringify({action,requestId:request.requestId})}));
  assert.equal((await post('https://attacker.example')).status,403);
  const response=await post('https://avantalab.com.br');const data=await response.json();
  assert.deepEqual(Object.keys(data).sort(),['expiresAt','sellerName','sellerReference']);assert.equal(response.headers.get('cache-control'),'no-store');
  const authorize=await (await post('https://avantalab.com.br','autorizar')).json();
  assert.equal(new URL(authorize.authorizationUrl).hostname,'auth.mercadolivre.com.br');assert.equal(new URL(authorize.authorizationUrl).searchParams.get('code_challenge_method'),'S256');
  db.tables.marketplace_oauth_pending[0].verifier_sealed=vault.sealMarketplaceSecret('v'.repeat(86));assert.equal((await post('https://avantalab.com.br')).status,410);
});
test('callback real é de uso único e recusa vendedor divergente antes de persistir',async()=>{
  for(const seller of [123,456]) {
    const {db,request}=await requested();globalThis.renewalDb=db;let exchanges=0;
    globalThis.fetch=async(url,options)=>{assert.equal(url,'https://api.mercadolibre.com/oauth/token');assert.ok(options.body.get('code_verifier'));exchanges++;return Response.json({access_token:'new-access',refresh_token:'new-refresh',user_id:seller,expires_in:21600,scope:'read write'})};
    const before=JSON.stringify(db.tables.marketplace_connections);const url=`https://avantalab.com.br/api/modulos/marketplaces/conexoes/mercado-livre/callback?state=${request.requestId}&code=fixture-code`;
    const response=await callback.GET(new Request(url));const html=await response.text();
    assert.match(html,/\/marketplaces\/renovar/);assert.ok(!html.includes('fixture-code'));assert.ok(!html.includes('new-access'));
    if(seller===123) assert.equal(vault.openMarketplaceSecret(db.tables.marketplace_connections[0].token_sealed),'\{"accessToken":"new-access","refreshToken":"new-refresh"\}');
    else {assert.equal(JSON.stringify(db.tables.marketplace_connections),before);assert.match(html,/Foi autorizada outra conta/)}
    await callback.GET(new Request(url));assert.equal(exchanges,1);
  }
});
test('callback cancelado consome só a solicitação e preserva credenciais',async()=>{
  const {db,request}=await requested();globalThis.renewalDb=db;const before=JSON.stringify(db.tables.marketplace_connections);
  const result=await callback.GET(new Request(`https://avantalab.com.br/api/modulos/marketplaces/conexoes/mercado-livre/callback?state=${request.requestId}&error=access_denied`));
  assert.match(await result.text(),/autorização foi cancelada/);assert.equal(JSON.stringify(db.tables.marketplace_connections),before);
});
test('callback de conexão anterior permanece compatível com verificador criptografado simples',async()=>{
  const {db,request}=await requested();globalThis.renewalDb=db;
  db.tables.marketplace_oauth_pending[0].verifier_sealed=vault.sealMarketplaceSecret('v'.repeat(86));
  globalThis.fetch=async(_url,options)=>{assert.equal(options.body.get('code_verifier'),'v'.repeat(86));return Response.json({access_token:'new-access',refresh_token:'new-refresh',user_id:123,expires_in:21600,scope:'read write'})};
  const response=await callback.GET(new Request(`https://avantalab.com.br/api/modulos/marketplaces/conexoes/mercado-livre/callback?state=${request.requestId}&code=fixture-code`));
  const html=await response.text();
  assert.match(html,/marketplaceConnection=connected/);assert.doesNotMatch(html,/\/marketplaces\/renovar/);
  assert.equal(db.tables.marketplace_connections.length,1);
  assert.equal(JSON.parse(vault.openMarketplaceSecret(db.tables.marketplace_connections[0].token_sealed)).accessToken,'new-access');
});
test('interface usa tooltip padrão, mantém contas expiradas e link sem token de acesso',()=>{
  const source=readFileSync(resolve(root,'app/marketplaces/MarketplacesClient.tsx'),'utf8');
  assert.match(source,/Renovar autorização/);assert.match(source,/<Tooltip texto="Renovar a autorização/);
  assert.match(source,/\['connected', 'expired', 'attention'\]/);
  const panel=readFileSync(resolve(root,'app/marketplaces/AuthorizationRenewal.tsx'),'utf8');
  assert.match(panel,/Copiar link/);assert.match(panel,/Cancelar link/);assert.match(panel,/sem compartilhar a senha/);assert.doesNotMatch(panel,/localStorage|sessionStorage/);
  assert.match(panel,/Autorizar agora/);assert.match(panel,/popup\.opener = null/);assert.match(panel,/if \(!popup\)/);assert.match(panel,/popup\.closed/);
  assert.match(panel,/styles\.renewalActions/);assert.doesNotMatch(panel,/styles\.panelHeadingActions/);
  assert.match(panel, /styles\.renewalMainActions[\s\S]*?Autorizar agora[\s\S]*?Gerar link[\s\S]*?<\/div>/);
  assert.doesNotMatch(panel, /onRefresh|async function refresh|>Atualizar contas</);
  assert.doesNotMatch(panel, /styles\.renewalFooter/);
  const css=readFileSync(resolve(root,'app/marketplaces/marketplaces.module.css'),'utf8');
  assert.match(css,/\.connectedAccount \{ display: grid; grid-template-columns: minmax\(0, 1fr\);/);
  assert.match(css,/\.connectedAccountSelect strong, \.connectedAccountSelect small \{[^}]*white-space: normal/);
  assert.match(css,/\.compactConnectionButton::before \{[^}]*inset: 6px 0/);
  assert.match(css,/\.page \.compactConnectionButton \{[^}]*min-height: 44px/);
  assert.match(css,/\.renewalMainActions \{[^}]*grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/);
});
test('renovação expande dentro da conta e atualização geral fica ao lado de conectar',()=>{
  const source=readFileSync(resolve(root,'app/marketplaces/MarketplacesClient.tsx'),'utf8');
  const accountCards=source.slice(source.indexOf('renewableAccounts.map'),source.indexOf('</article>)}</div>'));
  assert.match(accountCards,/renewAccount\?\.id === account\.id && <div id=\{`account-renewal-\$\{account\.id\}`\}><AuthorizationRenewal companyId=\{companyId\} account=\{account\}/);
  assert.match(accountCards,/aria-controls=\{`account-renewal-\$\{account\.id\}`\}/);
  assert.match(accountCards,/document\.getElementById\(`renew-account-\$\{account\.id\}`\)\?\.focus\(\)/);
  assert.equal((source.match(/<AuthorizationRenewal /g)||[]).length,1);
  const generalActions=source.slice(source.indexOf('className={styles.connectionGeneralActions}'),source.indexOf('{connectedAccounts.length > 0 && <p'));
  assert.match(generalActions,/Conectar outra conta[\s\S]*updateConnections\(\)[\s\S]*Atualizar contas/);
  assert.match(generalActions,/connectionsRefreshing \? 'Atualizando…'/);
  assert.match(generalActions,/accountSelectionLocked \|\| publicationBusy/);
  const refresh=source.match(/async function updateConnections\(\) \{([\s\S]*?)\n  \}/)?.[1];
  assert.match(refresh,/await refreshConnections\(\)/);
  assert.match(refresh,/finally \{ setConnectionsRefreshing\(false\); \}/);
  assert.doesNotMatch(refresh,/conexoes\/mercado-livre\/renovar|sincronizar|fetch\(/);
});
test('autorização direta e link utilizam o mesmo endpoint e destino oficial validado',async()=>{
  const expected='https://auth.mercadolivre.com.br/authorization?client_id=fixture&state=fixture';
  globalThis.fetch=async(url,options)=>{
    assert.equal(url,'/api/marketplaces/renovar');assert.equal(options.method,'POST');assert.equal(options.cache,'no-store');assert.equal(options.referrerPolicy,'no-referrer');
    assert.deepEqual(JSON.parse(options.body),{action:'autorizar',requestId:'fixture-request'});return Response.json({authorizationUrl:expected});
  };
  assert.equal(await clientAuthorization.renewalAuthorizationUrl('fixture-request'),expected);
});
test('destino inesperado, sem URL ou malformado nunca navega o titular',async()=>{
  for(const authorizationUrl of ['https://attacker.example/authorization','https://auth.mercadolivre.com.br/other','https://login:password@auth.mercadolivre.com.br/authorization','invalid',null]) {
    globalThis.fetch=async()=>Response.json({authorizationUrl});
    await assert.rejects(clientAuthorization.renewalAuthorizationUrl('fixture-request'));
  }
  globalThis.fetch=async()=>Response.json({message:'Solicitação expirada.'},{status:410});
  await assert.rejects(clientAuthorization.renewalAuthorizationUrl('fixture-request'),{message:'Solicitação expirada.'});
});

import assert from 'node:assert/strict';
import test from 'node:test';
import { registerHooks } from 'node:module';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { randomBytes } from 'node:crypto';
import { PGlite } from '@electric-sql/pglite';

const root = resolve(import.meta.dirname, '../..');
const hooks = registerHooks({ resolve(specifier, context, next) {
  if (specifier === 'server-only') return { url: 'data:text/javascript,export {}', shortCircuit: true };
  if (specifier === '@supabase/supabase-js') return { url: 'data:text/javascript,export function createClient(){return globalThis.magaluDb}', shortCircuit: true };
  if (specifier === 'next/server') return { url: 'data:text/javascript,export class NextRequest extends Request{get nextUrl(){return new URL(this.url)};get cookies(){return {get:name=>{const v=(this.headers.get("cookie")||"").split("; ").find(v=>v.startsWith(name+"="));return v?{value:v.slice(name.length+1)}:undefined}}}};export class NextResponse extends Response{cookies={set:(name,value,options)=>this.headers.append("set-cookie",name+"="+value+"; "+JSON.stringify(options))};static json(data,options){return new NextResponse(JSON.stringify(data),options)}}', shortCircuit: true };
  if (specifier.endsWith('/management-access') || specifier === './management-access') return { url: 'data:text/javascript,export class MarketplaceError extends Error{constructor(status,code,message){super(message);this.status=status;this.code=code}};export function managementFailure(e){return Response.json({message:e.code?e.message:"Falha de conexão",code:e.code||"unavailable"},{status:e.status||503})};export async function authorizeMarketplace(request,company,permission){return globalThis.magaluAccess(request,company,permission)}', shortCircuit: true };
  let path;
  if (specifier.startsWith('@/')) path = resolve(root, specifier.slice(2));
  else if (specifier.startsWith('.') && context.parentURL?.startsWith('file:')) path = resolve(dirname(new URL(context.parentURL).pathname), specifier);
  if (path && existsSync(`${path}.ts`)) return next(pathToFileURL(`${path}.ts`).href, context);
  return next(specifier, context);
} });
const oauth = await import('../../app/modules/marketplaces/services/magalu-oauth.ts');
const service = await import('../../app/modules/marketplaces/services/magalu-connection.ts');
const vault = await import('../../app/modules/marketplaces/services/secret-vault.ts');
const callback = await import('../../app/api/modulos/marketplaces/conexoes/magalu/callback/route.ts');
const start = await import('../../app/api/modulos/marketplaces/conexoes/magalu/iniciar/route.ts');
const { NextRequest } = await import('next/server');
hooks.deregister();
const company = '11111111-1111-4111-8111-111111111111', actor = '22222222-2222-4222-8222-222222222222';
const seller = 'GENPUB.33333333-3333-4333-8333-333333333333';
const config = { clientId: 'fixture-client', clientSecret: 'fixture-secret', redirectUri: `http://localhost:3000${oauth.MAGALU_CALLBACK_PATH}` };
const originalFetch = globalThis.fetch;
const fixtureEnvKeys = ['NODE_ENV', 'MAGALU_OAUTH_ENABLED', 'MAGALU_CLIENT_ID', 'MAGALU_CLIENT_SECRET', 'MAGALU_OAUTH_REDIRECT_URI', 'MAGALU_LOCAL_CREDENTIALS_FILE', 'MARKETPLACE_SECRETS_KEY', 'NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'];
const originalEnv = Object.fromEntries(fixtureEnvKeys.map(key => [key, process.env[key]]));
// As rotas locais são uma fixture de desenvolvimento, mesmo no build da Vercel.
test.beforeEach(() => { process.env.NODE_ENV = 'development'; });
test.before(() => {
  process.env.MAGALU_OAUTH_ENABLED = 'true'; process.env.MAGALU_CLIENT_ID = config.clientId; process.env.MAGALU_CLIENT_SECRET = config.clientSecret;
  process.env.MAGALU_OAUTH_REDIRECT_URI = config.redirectUri; process.env.MARKETPLACE_SECRETS_KEY = randomBytes(32).toString('base64url');
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://fixture.example'; process.env.SUPABASE_SERVICE_ROLE_KEY = 'fixture-service';
});
test.afterEach(() => { globalThis.fetch = originalFetch; delete globalThis.magaluDb; delete globalThis.magaluAccess; process.env.MAGALU_OAUTH_ENABLED = 'true'; process.env.MAGALU_CLIENT_ID = config.clientId; process.env.MAGALU_OAUTH_REDIRECT_URI = config.redirectUri; });
test.after(() => {
  for (const key of fixtureEnvKeys) {
    if (originalEnv[key] === undefined) delete process.env[key];
    else process.env[key] = originalEnv[key];
  }
});

class Query {
  constructor(db, table) { this.db=db; this.table=table; this.filters=[]; this.mode='select'; }
  select() { return this; }
  eq(key,value) { this.filters.push(row=>row[key]===value); return this; }
  is(key,value) { this.filters.push(row=>(row[key]??null)===value); return this; }
  gt(key,value) { this.filters.push(row=>row[key]>value); return this; }
  in(key,values) { this.filters.push(row=>values.includes(row[key])); return this; }
  filter(key,op,value) { assert.equal(op,'eq'); this.filters.push(row=>JSON.stringify(row[key])===value); return this; }
  limit(n) { this.max=n; return this; }
  update(values) { this.mode='update'; this.values=values; return this; }
  insert(values) { this.mode='insert'; this.values=values; return this; }
  async maybeSingle() { const r=await this.run(); return {...r,data:r.data?.[0]||null}; }
  then(resolve,reject) { return this.run().then(resolve,reject); }
  async run() {
    if(this.db.fail===this.table) return {error:new Error('DB-private-detail'),data:null};
    if(this.mode==='update' && this.table==='marketplace_connections' && this.db.beforeSave) {this.db.beforeSave();this.db.beforeSave=null;}
    const rows=this.db.tables[this.table]||=[]; let selected=rows.filter(row=>this.filters.every(fn=>fn(row))).slice(0,this.max||1000);
    if(this.mode==='insert') { const row={id:crypto.randomUUID(),consumed_at:null,...this.values}; rows.push(row); selected=[row]; }
    if(this.mode==='update') selected.forEach(row=>Object.assign(row,this.values));
    return {error:null,data:selected};
  }
}
function database() {
  return {tables:{marketplace_oauth_pending:[],marketplace_connections:[{id:crypto.randomUUID(),empresa_id:company,provider:'mercado_livre',seller_reference:'123',status:'connected',token_sealed:{existing:true}}],usuarios_empresa:[{id:actor,user_id:actor,empresa_id:company,status:'ativo',perfil:'administrador'}],empresa_modulos:[{empresa_id:company,modulo_id:'marketplaces',ativo:true,expira_em:null}]},from(table){return new Query(this,table)} };
}
async function fixture() { const db=database();const auth=await service.startMagaluConnection(db,company,actor,config);globalThis.magaluDb=db;return {db,auth,row:db.tables.marketplace_oauth_pending[0]}; }
function request(auth,query='&code=fixture-code',binding=auth.browserBinding) {
  return new NextRequest(`${config.redirectUri}?state=${auth.state}${query}`,{headers:{Cookie:`${oauth.magaluCookieName(auth.state)}=${binding}`}});
}
function token(claims={}) {return `eyJhbGciOiJSUzI1NiJ9.${Buffer.from(JSON.stringify({sub:seller,exp:Math.floor(Date.now()/1000)+7200,aud:['https://api.magalu.com'],...claims})).toString('base64url')}.fixture-signature`;}
function tokenResponse(changes={}) {return {access_token:token(),refresh_token:'fixture-refresh',token_type:'Bearer',expires_in:7200,scope:oauth.MAGALU_CONNECTION_SCOPES.join(' '),...changes};}

test('URL oficial, loja escolhida, PKCE S256, state aleatório e intenções criptografadas',async()=>{
  const {auth,row}=await fixture(); const url=new URL(auth.authorizationUrl);
  assert.equal(url.origin,'https://id.magalu.com'); assert.equal(url.pathname,'/login');assert.equal(url.searchParams.get('choose_tenants'),'true');
  assert.equal(url.searchParams.get('state'),auth.state); assert.equal(url.searchParams.get('code_challenge_method'),'S256');
  assert.equal(url.searchParams.get('scope'),oauth.MAGALU_CONNECTION_SCOPES.join(' '));
  assert.ok(!auth.authorizationUrl.includes(config.clientSecret));assert.ok(!auth.authorizationUrl.includes(auth.intent.verifier));
  assert.equal(row.browser_binding_hash,oauth.magaluBrowserHash(auth.browserBinding));assert.equal(row.provider,'magalu');
  assert.deepEqual(oauth.readMagaluIntent(vault.openMarketplaceSecret(row.verifier_sealed),config),auth.intent);
  assert.ok(!JSON.stringify(row).includes(auth.intent.verifier));assert.ok(Date.parse(row.expires_at)-Date.now()<=600000);
});
test('configuração recusa destinos externos, credenciais, parâmetros e HTTP público',()=>{
  for(const uri of ['https://evil.example'+oauth.MAGALU_CALLBACK_PATH,'https://avantalab.com.br.evil.example'+oauth.MAGALU_CALLBACK_PATH,'http://avantalab.com.br'+oauth.MAGALU_CALLBACK_PATH,'https://u:p@avantalab.com.br'+oauth.MAGALU_CALLBACK_PATH,config.redirectUri+'?x=1',config.redirectUri+'#hash','https://avantalab.com.br/other']) assert.throws(()=>oauth.validateMagaluRedirectUri(uri));
  assert.equal(oauth.validateMagaluRedirectUri(config.redirectUri),config.redirectUri);
  const before=process.env.NODE_ENV;process.env.NODE_ENV='production';try{
    assert.throws(()=>oauth.validateMagaluRedirectUri(config.redirectUri));
    const uri=`https://avantalab.com.br${oauth.MAGALU_CALLBACK_PATH}`;
    assert.equal(oauth.validateMagaluRedirectUri(uri),uri);
  }finally{if(before===undefined)delete process.env.NODE_ENV;else process.env.NODE_ENV=before;}
});
test('intenção não aceita outra plataforma, configuração trocada ou PKCE incompleto',async()=>{
  const {auth}=await fixture();
  for(const changes of [{provider:'mercado_livre'},{clientId:'other'},{redirectUri:'https://evil.example/callback'},{verifier:'short'}]) assert.throws(()=>oauth.readMagaluIntent(JSON.stringify({...auth.intent,...changes}),config));
  assert.equal(oauth.magaluBrowserMatches(auth.browserBinding,'a'.repeat(64)),false);
  assert.equal(oauth.magaluBrowserMatches('short',oauth.magaluBrowserHash(auth.browserBinding)),false);
});
test('início exige origem, módulo e administrador; cookie limitado, HttpOnly e Lax',async()=>{
  const db=database();let calls=0;globalThis.magaluAccess=async(_r,id,permission)=>{calls++;assert.equal(id,company);assert.equal(permission,'connections');return {db,empresaId:company,usuario:{id:actor}};};
  const req=origin=>new Request('http://localhost:3000/api/modulos/marketplaces/conexoes/magalu/iniciar',{method:'POST',headers:{origin},body:JSON.stringify({empresaId:company})});
  assert.equal((await start.POST(req('https://evil.example'))).status,403);assert.equal(calls,0);
  const res=await start.POST(req('http://localhost:3000'));assert.equal(res.status,200);const data=await res.json();assert.deepEqual(Object.keys(data),['authorizationUrl']);
  assert.match(res.headers.get('set-cookie'),/"httpOnly":true/);assert.match(res.headers.get('set-cookie'),/"sameSite":"lax"/);assert.match(res.headers.get('set-cookie'),/"maxAge":600/);
  assert.equal(res.headers.get('cache-control'),'no-store');assert.ok(!JSON.stringify(data).includes('verifier'));
  globalThis.magaluAccess=async()=>{throw Object.assign(new Error('negado'),{status:403,code:'forbidden'})};assert.equal((await start.POST(req('http://localhost:3000'))).status,403);
  process.env.MAGALU_OAUTH_ENABLED='false';assert.equal((await start.POST(req('http://localhost:3000'))).status,503);
});
test('retorno troca código só no servidor, de uso único e sem tocar ML',async()=>{
  const {db,auth}=await fixture();const before=JSON.stringify(db.tables.marketplace_connections[0]);let exchanges=0;
  globalThis.fetch=async(url,options)=>{exchanges++;assert.equal(url,'https://id.magalu.com/oauth/token');assert.equal(options.redirect,'error');const body=JSON.parse(options.body);assert.equal(body.client_secret,config.clientSecret);assert.equal(body.code_verifier,auth.intent.verifier);assert.equal(body.redirect_uri,config.redirectUri);return Response.json(tokenResponse());};
  const response=await callback.GET(request(auth));const html=await response.text();assert.match(html,/Autorização Magalu concluída/);assert.match(html,/sincronização.*preparação/);
  assert.equal(response.headers.get('referrer-policy'),'no-referrer');assert.equal(response.headers.get('cache-control'),'no-store');assert.match(response.headers.get('content-security-policy'),/frame-ancestors 'none'/);
  assert.match(response.headers.get('set-cookie'),/"maxAge":0/);assert.match(html,/history.replaceState/);
  for(const secret of ['fixture-code','fixture-refresh',config.clientSecret,auth.intent.verifier,token()]) assert.ok(!html.includes(secret));
  const conn=db.tables.marketplace_connections.find(row=>row.provider==='magalu');assert.equal(conn.empresa_id,company);assert.equal(conn.seller_reference,seller);assert.equal(conn.status,'attention');assert.equal(conn.last_error_code,'magalu_connector_pending');
  assert.equal(JSON.parse(vault.openMarketplaceSecret(conn.token_sealed)).refreshToken,'fixture-refresh');assert.equal(JSON.stringify(db.tables.marketplace_connections[0]),before);
  await callback.GET(request(auth));assert.equal(exchanges,1);
});
test('início HTTPS usa cookie Secure e não aceita fallback de credencial local em produção',async()=>{
  const db=database();const uri=`https://avantalab.com.br${oauth.MAGALU_CALLBACK_PATH}`;process.env.MAGALU_OAUTH_REDIRECT_URI=uri;
  globalThis.magaluAccess=async()=>({db,empresaId:company,usuario:{id:actor}});
  const res=await start.POST(new Request('https://avantalab.com.br/api/modulos/marketplaces/conexoes/magalu/iniciar',{method:'POST',headers:{Origin:'https://avantalab.com.br'},body:JSON.stringify({empresaId:company})}));
  assert.equal(res.status,200);assert.match(res.headers.get('set-cookie'),/"secure":true/);
  const before=process.env.NODE_ENV;process.env.NODE_ENV='production';process.env.MAGALU_LOCAL_CREDENTIALS_FILE='.codex/magalu/client-credentials.json';delete process.env.MAGALU_CLIENT_ID;
  try{assert.throws(()=>oauth.getMagaluOAuthConfiguration(),/não está configurada/);}finally{if(before===undefined)delete process.env.NODE_ENV;else process.env.NODE_ENV=before;delete process.env.MAGALU_LOCAL_CREDENTIALS_FILE;process.env.MAGALU_CLIENT_ID=config.clientId;}
});
test('cookie ausente/incorreto, pendência expirada, outra plataforma ou config alterada não trocam código',async()=>{
  for(const mode of ['cookie','expiry','provider','config','missing-cookie','database','origin']) {
    const {db,auth,row}=await fixture();let exchanges=0;globalThis.fetch=async()=>{exchanges++;return Response.json(tokenResponse());};
    if(mode==='expiry')row.expires_at=new Date(Date.now()-1).toISOString();if(mode==='provider')row.provider='mercado_livre';if(mode==='config')process.env.MAGALU_CLIENT_ID='changed';if(mode==='database')db.fail='marketplace_oauth_pending';
    let req=request(auth,'&code=fixture-code',mode==='cookie'?'x'.repeat(43):auth.browserBinding);
    if(mode==='missing-cookie')req=new NextRequest(req.url);if(mode==='origin')req=new NextRequest(req.url.replace('localhost:3000','attacker.example'),{headers:req.headers});
    const html=await (await callback.GET(req)).text();assert.doesNotMatch(html,/Autorização Magalu concluída/);assert.equal(exchanges,0);assert.equal(db.tables.marketplace_connections.length,1);assert.equal(row.consumed_at,null);process.env.MAGALU_CLIENT_ID=config.clientId;
  }
});
test('cancelamento consome pendência, preserva conta e não mostra erro bruto externo',async()=>{
  const {db,auth,row}=await fixture();const before=JSON.stringify(db.tables.marketplace_connections);globalThis.fetch=()=>{throw Error('não deve consultar');};
  const html=await(await callback.GET(request(auth,'&error=access_denied&error_description=SECRET'))).text();assert.match(html,/cancelada/);assert.ok(!html.includes('SECRET'));assert.ok(row.consumed_at);assert.equal(JSON.stringify(db.tables.marketplace_connections),before);
});
test('permissão revogada antes ou durante consentimento impede salvar',async()=>{
  for(const during of [false,true]) {
    const {db,auth}=await fixture();let exchanges=0;if(!during)db.tables.usuarios_empresa[0].status='inativo';
    globalThis.fetch=async()=>{exchanges++;db.tables.usuarios_empresa[0].perfil='operador_simples';return Response.json(tokenResponse());};
    assert.doesNotMatch(await(await callback.GET(request(auth))).text(),/Autorização Magalu concluída/);assert.equal(db.tables.marketplace_connections.length,1);assert.equal(exchanges,during?1:0);
  }
});
test('rejeita tokens incompletos, identidade pessoal, audiência errada e escopos parciais',async()=>{
  for(const changes of [{access_token:'opaque'}, {access_token:token({sub:'PERSON.user'})}, {access_token:token({aud:'other'})}, {access_token:token({exp:1})}, {scope:oauth.MAGALU_CONNECTION_SCOPES[0]}, {expires_in:-1}, {expires_in:999999}, {refresh_token:''}, {token_type:'Other'}]) {
    const {db,auth}=await fixture();globalThis.fetch=async()=>Response.json(tokenResponse(changes));const html=await(await callback.GET(request(auth))).text();assert.doesNotMatch(html,/Autorização Magalu concluída/);assert.equal(db.tables.marketplace_connections.length,1);
  }
});
test('repetição paralela do mesmo callback troca o código uma única vez',async()=>{
  const {db,auth}=await fixture();let exchanges=0;globalThis.fetch=async()=>{exchanges++;return Response.json(tokenResponse());};
  await Promise.all([callback.GET(request(auth)),callback.GET(request(auth))]);assert.equal(exchanges,1);assert.equal(db.tables.marketplace_connections.filter(row=>row.provider==='magalu').length,1);
});
test('desconexão concorrente e falha no banco não viram sucesso',async()=>{
  for(const mode of ['race','database']) {
    const {db,auth}=await fixture();const existing={id:crypto.randomUUID(),empresa_id:company,provider:'magalu',seller_reference:seller,status:'attention',token_sealed:vault.sealMarketplaceSecret('old')};db.tables.marketplace_connections.push(existing);
    if(mode==='race')db.beforeSave=()=>{existing.status='disconnected';existing.token_sealed=null;};else db.fail='marketplace_connections';
    globalThis.fetch=async()=>Response.json(tokenResponse());assert.doesNotMatch(await(await callback.GET(request(auth))).text(),/Autorização Magalu concluída/);
    if(mode==='race')assert.equal(existing.token_sealed,null);else assert.equal(vault.openMarketplaceSecret(existing.token_sealed),'old');
  }
});
test('pendências limitadas por empresa, usuário e plataforma',async()=>{
  const db=database();for(let i=0;i<10;i++)await service.startMagaluConnection(db,company,actor,config);await assert.rejects(service.startMagaluConnection(db,company,actor,config),{status:429});
});
test('SQL real amplia só pendências OAuth, mantém RLS e registros existentes',async()=>{
  const db=new PGlite();try{
    await db.exec("create role anon;create role authenticated;create role service_role;create table marketplace_oauth_pending(id uuid primary key,provider text not null check(provider='mercado_livre'),state text,verifier_sealed jsonb);insert into marketplace_oauth_pending values(gen_random_uuid(),'mercado_livre','existing','{}');");
    const sql=readFileSync(resolve(root,'supabase/migrations/20261012160000_marketplace_magalu_oauth.sql'),'utf8');await db.exec(sql);await db.exec(sql);
    assert.equal((await db.query("select state from marketplace_oauth_pending where provider='mercado_livre'")).rows[0].state,'existing');
    await db.exec("insert into marketplace_oauth_pending values(gen_random_uuid(),'magalu','new','{}',null)");
    await assert.rejects(db.exec("insert into marketplace_oauth_pending values(gen_random_uuid(),'other','bad','{}',null)"));
    assert.equal((await db.query("select relrowsecurity from pg_class where relname='marketplace_oauth_pending'")).rows[0].relrowsecurity,true);
    for(const role of ['anon','authenticated'])assert.equal((await db.query(`select has_table_privilege('${role}','marketplace_oauth_pending','SELECT') as allowed`)).rows[0].allowed,false);
    assert.equal((await db.query("select has_table_privilege('service_role','marketplace_oauth_pending','INSERT') as allowed")).rows[0].allowed,true);
  }finally{await db.close();}
});

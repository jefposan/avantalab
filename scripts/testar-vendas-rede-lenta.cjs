// Runtime completo (app + cliente), SDK/backend fictícios; nenhum dado real.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const zlib = require('node:zlib');
const { createRequire } = require('node:module');
const runtimeRequire = process.env.AVANTA_PLAYWRIGHT_ROOT ? createRequire(path.join(process.env.AVANTA_PLAYWRIGHT_ROOT,'package.json')) : require;
const { chromium } = runtimeRequire('playwright');
const root = path.resolve(__dirname,'..');
const arquivos = require('../app/avantavendas/recursos/scripts-proprios.json');
const consultas=[];
const fixture = `(()=>{
  const modo=new URLSearchParams(location.search).get('modo');
  const user={id:'usuario-teste',email:'teste@example.invalid',user_metadata:{full_name:'Usuário Teste'}};
  const session={user,access_token:'fixture-sem-valor-real',expires_at:Math.floor(Date.now()/1000)+3600};
  window.__VENDAS_MOBILE_EMBEDDED__=true;window.__VENDAS_MOBILE_VERSION__='3.2.0.30-av190';
  window.VENDAS_MOBILE_CONFIG={supabaseUrl:location.origin,supabaseAnonKey:'fixture'};
  window.__marcos={telas:[],saidas:0};
  const listeners={addListener:async()=>({remove:async()=>{}}),getLaunchUrl:async()=>null};
  window.Capacitor={getPlatform:()=> 'android',isNativePlatform:()=>true,Plugins:{App:listeners,Browser:{...listeners,open:async()=>{},close:async()=>{}}}};
  new MutationObserver(()=>{const a=document.getElementById('app');__marcos.telas.push({t:performance.now(),login:!!document.getElementById('loginContato'),shell:document.documentElement.classList.contains('vendas-shell-active'),texto:a.textContent.slice(0,180)});}).observe(document.getElementById('app'),{childList:true,subtree:true});
  const request=(tipo,nome,extra={})=>fetch('/fixture?modo='+modo+'&tipo='+tipo+'&nome='+nome+'&extra='+encodeURIComponent(JSON.stringify(extra))).then(r=>r.json());
  const auth={
    getSession:async()=>({data:{session:modo==='login'?null:session},error:null}),
    getUser:()=>request('auth','user'),
    refreshSession:async()=>({data:{session},error:null}),
    signOut:async()=>{__marcos.saidas++;return {error:null};},
    onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}}),
  };
  const client={auth,from(nome){const q={filtros:{},unico:false,then(a,b){return request('table',nome,{filtros:q.filtros,unico:q.unico}).then(a,b);}};
    for(const k of ['select','order','limit','range','in','neq','is','gte','lte'])q[k]=()=>q;
    q.eq=(k,v)=>{q.filtros[k]=v;return q;};q.maybeSingle=q.single=()=>{q.unico=true;return q;};
    for(const k of ['insert','update','delete','upsert'])q[k]=()=>{throw Error('Escrita inesperada na fixture: '+nome);};return q;},
    rpc:(nome,dados)=>request('rpc',nome,dados),
    channel(){const c={on:()=>c,subscribe:()=>c,unsubscribe(){}};return c;},removeChannel:async()=>{},
  };
  window.supabase={createClient:(url,key,opcoes)=>{__marcos.storageKey=opcoes.auth.storageKey;return client;}};
})();`;
const server=http.createServer(async(req,res)=>{
  const u=new URL(req.url,'http://localhost');
  if(u.pathname==='/'){
    res.setHeader('Content-Type','text/html; charset=utf-8');
    const tipo=u.searchParams.get('tipo');
    res.end('<!doctype html><html><body><div id="app"></div><script>'+fixture+'</script>'+['config.js','supabase-client.js','app.js'].map(a=>'<script src="/script/'+a+'?tipo='+tipo+'"></script>').join('')+'</body></html>');return;
  }
  if(u.pathname.startsWith('/script/')){
    const nome=u.pathname.slice(8);
    if(!arquivos.includes(nome)){res.statusCode=404;res.end();return;}
    const dir=u.searchParams.get('tipo')==='original'?'sistema':'runtime-compacto';
    res.setHeader('Content-Type','application/javascript; charset=utf-8');res.setHeader('Content-Encoding','gzip');res.setHeader('Cache-Control','no-store');
    res.end(zlib.gzipSync(fs.readFileSync(path.join(root,'app/avantavendas',dir,nome))));return;
  }
  let body={};
  const modo=u.searchParams.get('modo')||(req.headers.referer&&new URL(req.headers.referer).searchParams.get('modo'));
  if(u.pathname==='/fixture'){
    const tipo=u.searchParams.get('tipo'),nome=u.searchParams.get('nome'),extra=JSON.parse(u.searchParams.get('extra')||'{}');consultas.push({modo,tipo,nome,extra});
    let data=tipo==='table'&&extra.unico?null:[],error=null;
    if(tipo==='auth'){
      data={user:{id:'usuario-teste',email:'teste@example.invalid',user_metadata:{full_name:'Usuário Teste'}}};
      if(modo==='falha-rede'){data={user:null};error={name:'AuthRetryableFetchError',message:'Failed to fetch',status:0};}
    }
    if(tipo==='rpc'){
      if(nome==='minhas_contas_vendas_mobile_rpc')data=[{id:'conta-teste',nome:'Conta Teste',empresa_id:modo==='premium-bloqueado'?'empresa-teste':null,papel:'vendedor'}];
      if(nome==='meus_acessos_vendas_mobile_rpc'){
        if(modo==='premium-bloqueado')data=[{empresa_id:'empresa-teste',empresa_nome:'Empresa Teste',papel:'vendedor',status:'ativo'}];
        if(modo==='acesso-negado')error={message:'Acesso não autorizado na fixture',code:'42501'};
      }
      if(nome==='modulo_vendas_mobile_ativo_rpc')data=true;
      if(nome==='obter_integracao_gestao_vendas_mobile_rpc')data={base_receita:'recebidos',pode_configurar:false};
    }
    if(tipo==='table'&&nome==='vendas_mobile_produtos')data=[{id:'produto-teste',nome:'Produto de teste',preco:10,ativo:true,estoque_controlado:false}];
    if(tipo==='table'&&['vendas_mobile_conteudos','vendas_mobile_divulgacao_materiais'].includes(nome))await new Promise(r=>setTimeout(r,8000));
    body={data,error};
  }else if(u.pathname==='/api/cobranca/estado')body={precisaUpgradeVendas:modo==='premium-bloqueado',estado:null};
  else {res.statusCode=404;res.end();return;}
  res.setHeader('Content-Type','application/json');res.end(JSON.stringify(body));
});
(async()=>{
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  const browser=await chromium.launch({headless:true,executablePath:process.env.AVANTA_CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
  const resultados=[];
  try{
    for(const tipo of (process.env.AVANTA_TEST_TYPES||'original,compactado').split(','))for(const modo of (process.env.AVANTA_TEST_MODES||'login,autenticado,premium-bloqueado,acesso-negado,falha-rede').split(',')){
      const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,serviceWorkers:'block'});
      const page=await context.newPage(),erros=[];page.on('pageerror',e=>erros.push(e.message));
      const cdp=await context.newCDPSession(page);await cdp.send('Network.enable');await cdp.send('Network.setCacheDisabled',{cacheDisabled:true});
      await cdp.send('Network.emulateNetworkConditions',{offline:false,latency:1500,downloadThroughput:40000,uploadThroughput:20000});await cdp.send('Emulation.setCPUThrottlingRate',{rate:6});
      const inicio=Date.now();
      await page.goto('http://127.0.0.1:'+server.address().port+'/?tipo='+tipo+'&modo='+modo,{waitUntil:'domcontentloaded',timeout:60000});
      try{
        await page.waitForFunction(m=>m==='autenticado'?document.documentElement.classList.contains('vendas-shell-active'):m==='premium-bloqueado'?document.getElementById('app').textContent.includes('Premium'):!!document.getElementById('loginContato'),modo,{timeout:40000});
      }catch(e){throw Error(tipo+'/'+modo+': '+(await page.locator('#app').innerText()).slice(0,1000)+' | '+erros.join('; '));}
      if(modo==='autenticado')await page.waitForFunction(()=>!dadosOperacionaisCarregando,{timeout:40000});
      const dados=await page.evaluate(()=>({marcos:__marcos,recursos:performance.getEntriesByType('resource').filter(r=>r.name.includes('/script/')).map(r=>({nome:r.name.split('/script/')[1].split('?')[0],bytes:r.encodedBodySize,ms:r.duration}))}));
      assert.deepEqual(erros,[]);assert.equal(dados.marcos.saidas,0);assert.equal(dados.marcos.storageKey,'avantalab-vendas-mobile-auth');
      if(['autenticado','premium-bloqueado'].includes(modo))assert.ok(!dados.marcos.telas.some(t=>t.login),'Login reapareceu após sessão válida');
      if(['premium-bloqueado','acesso-negado','falha-rede'].includes(modo))assert.ok(!consultas.some(q=>q.modo===modo&&['vendas_mobile_pedidos','vendas_mobile_clientes','vendas_mobile_produtos'].includes(q.nome)),'Leitura operacional sem acesso');
      resultados.push({tipo,modo,totalMs:Date.now()-inicio,...dados});console.log(JSON.stringify(resultados.at(-1)));
      await context.close();
    }
    fs.mkdirSync(path.join(root,'output'),{recursive:true});fs.writeFileSync(path.join(root,'output/vendas-rede-lenta-32030.json'),JSON.stringify({rede:{latenciaMs:1500,downloadBytesS:40000,uploadBytesS:20000,cpu:6},resultados,consultas},null,2));
  }finally{await browser.close();server.closeAllConnections();server.close();}
})().catch(e=>{console.error(e);server.closeAllConnections();server.close();process.exit(1);});

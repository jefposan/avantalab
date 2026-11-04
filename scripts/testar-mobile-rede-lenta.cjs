// Teste de desenvolvimento: runtime INTEIRO, backend fictício, nenhum dado real.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const zlib = require('node:zlib');
const path = require('node:path');
const { createRequire } = require('node:module');
const requireBrowser = process.env.AVANTA_PLAYWRIGHT_ROOT
  ? createRequire(path.join(process.env.AVANTA_PLAYWRIGHT_ROOT, 'package.json')) : require;
const { chromium } = requireBrowser('playwright');
const root = path.resolve(__dirname, '..');
const compactado = fs.readFileSync(path.join(root, 'public/mobile-runtime/mobile-app.js'));
const original = fs.readFileSync(path.join(root, 'public/mobile-app.js'));
const consultas = [];
const fixture = `(() => {
  const modo = new URLSearchParams(location.search).get('modo');
  const usuario = {id:'teste-usuario',email:'teste@example.invalid',user_metadata:{full_name:'Usuário Teste'}};
  const sessao = {user:usuario,access_token:'teste-sem-valor-real'};
  window.Capacitor={isNativePlatform:()=>true,getPlatform:()=> 'android'};
  window.AVANTALAB_MOBILE_CONFIG={supabaseUrl:location.origin,supabaseAnonKey:'fixture'};
  window.__marcos={telas:[],saidas:0};
  new MutationObserver(()=>{
    const r=document.getElementById('mobile-root');
    window.__marcos.telas.push({t:performance.now(),login:!!document.getElementById('entrar'),texto:r.textContent.slice(0,170)});
  }).observe(document.getElementById('mobile-root'),{childList:true,subtree:true});
  const auth={
    async getSession(){
      if(modo==='falha-sessao') return {data:{session:null},error:{message:'Conexão interrompida',name:'NetworkError'}};
      return {data:{session:modo==='login'?null:sessao},error:null};
    },
    getUser:async()=>({data:{user:usuario},error:null}),
    signOut:async()=>{__marcos.saidas++;return {error:null};},
    onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}}),
  };
  const db={auth,
    from(tabela){
      const q={filtros:{},single:false,then(a,b){
        return fetch('/fixture?tabela='+tabela+'&modo='+modo+'&single='+q.single+'&filtros='+encodeURIComponent(JSON.stringify(q.filtros))).then(r=>r.json()).then(a,b);
      }};
      for(const m of ['select','order','limit','range','in','ilike','gte','lte','neq','or'])q[m]=()=>q;
      q.eq=(k,v)=>{q.filtros[k]=v;return q;};q.is=(k,v)=>{q.filtros[k]=v;return q;};
      q.maybeSingle=q.single=()=>{q.single=true;return q;};
      for(const m of ['insert','update','upsert','delete'])q[m]=()=>{throw Error('Escrita inesperada no teste: '+m+' '+tabela);};
      return q;
    },
    rpc:async()=>({data:[],error:null}),
    channel(){const c={on(){return c;},subscribe(){return c;},unsubscribe(){}};return c;},removeChannel(){},
  };
  window.supabase={createClient:()=>db};
})();`;
const server = http.createServer(async (req,res) => {
  const url = new URL(req.url,'http://localhost');
  if(url.pathname==='/') {
    res.setHeader('Content-Type','text/html; charset=utf-8');
    res.end('<!doctype html><html><body><div id="mobile-root" data-app-version="3.2.0.29" data-cobranca-ativa="true"></div><script>'+fixture+'</script><script src="/mobile-app.js?tipo='+url.searchParams.get('tipo')+'"></script></body></html>');return;
  }
  if(url.pathname==='/mobile-app.js') {
    const fonte = url.searchParams.get('tipo')==='original'?original:compactado;
    res.setHeader('Content-Type','application/javascript; charset=utf-8');res.setHeader('Content-Encoding','gzip');
    res.setHeader('Cache-Control','no-store');res.end(zlib.gzipSync(fonte));return;
  }
  if(url.pathname.endsWith('.png')||url.pathname.endsWith('.jpg')){res.statusCode=404;res.end();return;}
  if(url.pathname==='/mobile-sw.js'){res.setHeader('Content-Type','application/javascript');res.end('');return;}
  let body={ok:true,completo:true,ativa:true,precisaPaywall:false};
  if(url.pathname==='/fixture') {
    const tabela=url.searchParams.get('tabela'),modo=url.searchParams.get('modo'),filtros=JSON.parse(url.searchParams.get('filtros'));
    consultas.push({tabela,modo,filtros});
    let data=[];
    if(tabela==='usuarios_empresa' && filtros.user_id==='teste-usuario')data=[{id:1,empresa_id:'teste-empresa',nome:'Usuário Teste',email:'teste@example.invalid',login:'fixture',perfil:'operador',status:'ativo',telefone:'11999999999',telefone_confirmado:true}];
    if(tabela==='empresas')data=[{id:'teste-empresa',nome:'Empresa de teste',tipo_perfil:'empresa'}];
    if(tabela==='configuracoes')data={centros_custo_ativo:false,duplicados_ativo:true};
    if(tabela==='lancamentos')data=[{id:1850,mes:filtros.mes,ano:filtros.ano,dia:1,valor:12,despesa_nome:'Despesa teste',descricao:'Teste sem valor real',status:'paga'}];
    if(tabela==='faturamentos')data=[{mes:filtros.mes,valor:40}];
    if(tabela==='despesas_cadastradas')await new Promise(r=>setTimeout(r,7000));
    body={data,error:null};
  } else if(url.pathname.includes('/api/acessos-usuario')) {
    const modo=req.headers.referer && new URL(req.headers.referer).searchParams.get('modo');
    body={perfis:[{empresa:{id:'teste-empresa',temaEscuro:false,logoUrl:''},dashboard:modo!=='sem-financeiro',modulos:[]}]};
    if(modo==='acesso-negado'){res.statusCode=403;body={mensagem:'Acesso não permitido neste teste'};}
  } else if(url.pathname.includes('/api/cobranca/sessoes')) {
    await new Promise(r=>setTimeout(r,1000));
  }
  res.setHeader('Content-Type','application/json');res.end(JSON.stringify(body));
});

(async()=>{
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  const browser=await chromium.launch({headless:true,executablePath:process.env.AVANTA_CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
  const resultados=[];
  try {
    for(const tipo of (process.env.AVANTA_TEST_TYPES||'original,compactado').split(','))for(const modo of (process.env.AVANTA_TEST_MODES||'login,autenticado,sem-financeiro,acesso-negado,falha-sessao').split(',')){
      const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,serviceWorkers:'block'});
      const page=await context.newPage(),erros=[];
      page.on('pageerror',e=>erros.push(e.message));
      const cdp=await context.newCDPSession(page);
      await cdp.send('Network.enable');await cdp.send('Network.setCacheDisabled',{cacheDisabled:true});
      await cdp.send('Network.emulateNetworkConditions',{offline:false,latency:1500,downloadThroughput:40000,uploadThroughput:20000});
      await cdp.send('Emulation.setCPUThrottlingRate',{rate:6});
      const inicio=Date.now();
      await page.goto('http://127.0.0.1:'+server.address().port+'/?tipo='+tipo+'&modo='+modo,{waitUntil:'domcontentloaded',timeout:60000});
      try {await page.waitForFunction(modo=>modo==='login'?!!document.getElementById('entrar'):modo==='falha-sessao'||modo==='acesso-negado'?document.getElementById('mobile-root').textContent.includes('Não foi possível concluir o acesso'):!!document.getElementById('nav-home'),modo,{timeout:35000});}
      catch(e){throw Error(tipo+'/'+modo+': '+(await page.locator('#mobile-root').innerText()).slice(0,900)+' | '+erros.join('; '));}
      const dados=await page.evaluate(()=>({marcos:window.__marcos,recursos:performance.getEntriesByType('resource').filter(r=>r.name.includes('/mobile-app.js')).map(r=>({bytes:r.encodedBodySize,ms:r.duration}))}));
      assert.deepEqual(erros,[]);assert.equal(dados.marcos.saidas,0);
      if(modo!=='login')assert.ok(!dados.marcos.telas.some(t=>t.login),'retornou ao login');
      if(modo==='sem-financeiro'||modo==='acesso-negado')assert.ok(!consultas.some(q=>q.modo===modo&&['lancamentos','faturamentos','faturamentos_entradas'].includes(q.tabela)),'financeiro não autorizado');
      resultados.push({tipo,modo,totalMs:Date.now()-inicio,...dados});
      console.log(JSON.stringify(resultados.at(-1)));
      await context.close();
    }
    fs.mkdirSync(path.join(root,'output'),{recursive:true});
    fs.writeFileSync(path.join(root,'output/mobile-rede-lenta-32029.json'),JSON.stringify({rede:{latenciaMs:1500,downloadBytesS:40000,cpu:6},resultados,consultas},null,2));
  }finally{await browser.close();server.closeAllConnections();server.close();}
})().catch(e=>{console.error(e);server.closeAllConnections();server.close();process.exit(1);});

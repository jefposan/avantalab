import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import ts from 'typescript';
import { publicationErrors } from '../../app/modules/marketplaces/services/catalog-publication.ts';
import * as publicationPrefill from '../../app/modules/marketplaces/publication-prefill.ts';
const require = createRequire(import.meta.url);

test('publicação adicional usa as fotos canônicas do cadastro, sem recarregar uma galeria diferente do catálogo', () => {
  const source = readFileSync('app/modules/marketplaces/services/mercadolivre-publication.ts', 'utf8');
  assert.match(source, /fotos do cadastro local são a fonte canônica entre contas/i);
  assert.match(source, /pictures: pictures\.length\?pictures:catalogPictures\(detail\.pictures\)/);
});

test('preparar é compartilhado entre estoque e produtos; atalho aparece para produto sem anúncio', () => {
  const source = readFileSync('app/marketplaces/ProductsStock.tsx', 'utf8');
  assert.match(source, /const showPrepareAnnouncement = canManage && !hasListing && !!onPrepareAnnouncement;/);
  assert.match(source, /\{showPrepareAnnouncement && <BotaoAcaoCompacto className=\{styles\.localProductPrepareButton\} variante="primario" disabled=\{busy \|\| preparationDisabled\} onClick=\{onPrepareAnnouncement\}>Preparar anúncio<\/BotaoAcaoCompacto>\}/);
  assert.match(source, /onPrepareAnnouncement=\{\(\) => prepareFromProduct\(product\.id, publicationAccountId\)\}/);
  assert.match(source, /canManage && !visibleLinks\.length && product\.stock_quantity != null/);
  const client = readFileSync('app/marketplaces/MarketplacesClient.tsx', 'utf8');
  assert.match(client, /setSelectedAccount\(targetConnectionId\); setCopyRequest/);
  assert.match(client, /getElementById\('new-listing-title'\)/);
  assert.match(client, /scrollMarketplacePreparation\(title\)/);
});

test('produto sem anúncio e com saldo Online prepara; anúncio vinculado oculta a ação nos detalhes', () => {
  for (const warehouse of [undefined, { id: 'offline', name: 'Saldão' }]) {
    const states = []; let cursor = 0;
    const hooks = { useState(initial) { const i=cursor++; if (!(i in states)) states[i]=typeof initial==='function'?initial():initial; return [states[i], value=>{states[i]=typeof value==='function'?value(states[i]):value;}]; }, useCallback(fn){return fn;}, useEffect(){} };
    const exported = {};
    vm.runInNewContext(ts.transpileModule(readFileSync('app/marketplaces/ProductsStock.tsx','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText, {
      exports:exported, require(name) {
        if(name==='react') return hooks;
        if(name.includes('StockSync'))return{default:'stock-sync'};
        if(name.includes('stock-reconciliation'))return{stockDivergence:()=>''};
        if(name==='react/jsx-runtime')return require(name);
        if(name.endsWith('.module.css'))return {default:new Proxy({},{get:(_,key)=>key})};
        if(name.includes('BotaoAcaoCompacto'))return {default:'button'};
        if(name.includes('MarketplaceAccountPicker'))return {default:'account-picker'};
        if(name.includes('marketplace-scope'))return {publicationAccountAvailable:()=>true};
        if(name.includes('account-identification'))return {accountDisplayName:()=> 'Conta',accountReferenceDetail:()=>''};
        return new Proxy({default:'component'}, {get:(target,key)=>target[key] || (()=>'')});
      },
    });
    const calls=[];
    const product={id:'product',stock_quantity:2,total_stock_quantity:9,allocations:[{warehouseId:'online',quantity:2}],links:[],attributes:[],pictures:[],publication_form:{},revision:1};
    const props={companyId:'company',warehouse,canManage:true,accounts:[{id:'account'}],preparationLocked:false,onPrepare:(...args)=>calls.push(args)};
    const render=()=>{cursor=0;return exported.ProductDetail({product,props,busy:false,onCommand(){},onStockBusy(){},onStockUpdated(){}});};
    const all=node=>Array.isArray(node)?node.flatMap(all):node&&typeof node==='object'?[node,...all(node.props?.children)]:[];
    let tree=render();
    assert.equal(all(tree).some(node=>node.type==='account-picker'),false,'a conta é escolhida somente no final da preparação');
    const button=()=>all(tree).find(node=>node.type==='button'&&node.props.children==='Preparar anúncio');
    assert.equal(button().props.disabled,false);
    button().props.onClick();assert.deepEqual(calls,[['product','account']]);
    product.links=[{status:'active',provider:'mercado_livre',provider_listing_id:'MLB1'}];tree=render();
    assert.equal(button(),undefined);
  }
});

test('Novo anúncio recebe os dados locais e destaca pendências antes do primeiro envio', () => {
  const source = readFileSync('app/marketplaces/NewListing.tsx', 'utf8');
  assert.match(source, /applyPreparation\(response.result, response.form\)/);
  assert.match(source, /prepared\?\.localProductId \? publicationErrors\(form,/);
  assert.match(source, /product:\{\.\.\.prepared\.product,name:nameDraft\.trim\(\)\}/);
  assert.match(source, /data-local-draft/);
  assert.match(source, /new-local-category/);
  assert.match(source, /new-pictureUrl/);
  assert.match(source, /new-local-ean/);
  const magalu = readFileSync('app/marketplaces/MagaluListing.tsx', 'utf8');
  assert.match(magalu, /magaluPublicationErrors\(form, product, template\?\.attributes/);
  assert.match(magalu, /brand: local.attributes.find/);
});

test('formulário real abre cadastro mínimo na conta escolhida e preserva edições ao validar categoria/foto', async () => {
  const states = [], refs = [], effects = [], requests = [];
  let cursor = 0, refCursor = 0, first = true;
  const preparation = { status: 'found', ean: '', localProductId: 'local', notice: 'Dados do cadastro preparados para a conta selecionada. Selecione a categoria correta para consultar as condições de venda.', product: { id: 'local', name: 'Produto cadastrado', source: 'local_product', pictures: [], picture: null, attributes: [], description: '' }, categories: [] };
  const form = { ean: '', productId: 'local', categoryId: '', price: 0, stock: 0, listingType: '', shippingMode: '', condition: '', warrantyType: '', localProductId: 'local', description: '', attributes: {} };
  const hooks = {
    useState(initial) { const i = cursor++; if (!(i in states)) states[i] = typeof initial === 'function' ? initial() : initial; return [states[i], next => { states[i] = typeof next === 'function' ? next(states[i]) : next; }]; },
    useRef(initial) { const i = refCursor++; return refs[i] ||= { current: initial }; },
    useEffect(fn) { if (first) effects.push(fn); },
    useCallback: fn => fn,
  };
  const exported = {};
  vm.runInNewContext(ts.transpileModule(readFileSync('app/marketplaces/NewListing.tsx', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText, {
    exports: exported, crypto, Object, Number, Error, requestAnimationFrame(fn) { fn(); }, document: { getElementById() { return { focus() {} }; } },
    require(name) {
      if (name === 'react') return hooks;
      if(name==='./PublicationOptionalAttributes')return {default:'optional-attributes'};
      if(name==='./ProductPhotoInput')return {default:'photo-input'};
      if(name==='./usePreparationSummary')return {default:()=>({current:null})};
      if(name==='./LocalProductPricing')return {PreparationPriceReference:'price-reference'};
      if(name.includes('publication-content-readiness'))return {publicationContentReadiness:()=>[]};
      if (name === './PublicationShipping') return { default: 'shipping' };
      if (name === './ProductThumbnail') return { default: 'product-thumbnail' };
      if (name === './publication-request') return { publicationRequest: action => action(undefined) };
      if (name.endsWith('.module.css')) return { default: new Proxy({}, { get: (_, key) => key }) };
      if (name.includes('publication-prefill')) return publicationPrefill;
      if (name.includes('catalog-publication')) return { publicationErrors };
      if (name.includes('formatters')) return { formatarMoedaDigitada: digits => (Number(digits.replace(/\D/g, '')) / 100).toFixed(2).replace('.', ','), moedaDigitadaParaNumero: text => Number(text.replace(',', '.')) };
      if (name === './Anunciados') return { async marketplaceClientRequest(path, body) {
        requests.push({ path, body });
        if (path === 'produtos/preparar') return { result: preparation, form, sourceTitle: preparation.product.name };
        assert.equal(path, 'preparar');
        return { result: { ...preparation, ean: body.ean, categoryId: body.categoryId, categories: [{ id: body.categoryId, name: 'Categoria confirmada' }], product: { ...preparation.product, pictures: [body.pictureUrl] }, listingTypes: [{ id: 'gold_special', name: 'Clássico' }], shippingModes: [{ id: 'me2', name: 'Mercado Envios' }], conditions: [{ id: 'new', name: 'Novo' }] } };
      } };
      if (name.includes('account-identification')) return { accountDisplayName: account => account.id, accountReferenceDetail: () => '' };
      if (name.includes('MarketplaceSelect')) return { default: 'select' };
      if (name.includes('CatalogCandidateChooser')) return { default: 'catalog-candidate-chooser' };
      if (name.includes('MarketplaceAccountPicker')) return { default: 'account-picker' };
      if (name.includes('CampoBusca')) return { default: 'search' };
      if (name.includes('BotaoAcaoCompacto')) return { default: 'button' };
      if (name.includes('CarregamentoDadosModulo')) return { default: 'preparation-loading' };
      if (name.includes('ModalConfirmacao')) return { default: 'publication-popup' };
      if (name.includes('MultiAccountPublication')) return { default: 'multi-account-publication' };
      if (name.includes('/Icon')) return { Icon: 'icon' };
      return require(name);
    },
  });
  const props = { companyId: 'company', accountId: 'target', accounts: [{ id: 'target', status: 'connected' }], accountSelectionLocked: false, onSelectAccount() {}, onBusyChange() {}, canManage: true, onPublished() {}, copyRequest: { id: 'request', localProductId: 'local', targetConnectionId: 'target' }, onCopyHandled() {} };
  function render() { cursor = 0; refCursor = 0; const tree = exported.default(props); first = false; return tree; }
  function all(node) { if (Array.isArray(node)) return node.flatMap(all); if (!node || typeof node !== 'object') return []; return [node, ...all(node.props?.children)]; }
  let tree = render(); effects.forEach(fn => fn()); await new Promise(done => setImmediate(done)); tree = render();
  const input = id => { const found = all(tree).find(node => node.props?.id === id); assert.ok(found, id); return found; };
  const button = text => { const found = all(tree).find(node => node.type === 'button' && node.props.children === text); assert.ok(found, text); return found; };
  assert.equal(requests[0].body.connectionId, 'target');
  assert.equal(input('new-stock').props.value, '0');
  assert.equal(input('new-price').props['aria-invalid'], true);
  assert.equal(input('new-categoryId').props.error.length > 0, true);
  assert.ok(input('new-pictureUrl'));
  assert.ok(input('new-local-ean'),'produto sem EAN mantém o campo próprio do anúncio');
  assert.match(input('new-local-ean-help').props.children,/Não informe um código fictício/);
  const text = () => all(tree).flatMap(node => typeof node.props?.children === 'string' ? [node.props.children] : []).join('\n');
  assert.doesNotMatch(text(), /Dados do cadastro preparados|Dados do cadastro carregados|Preparar o anúncio não altera o cadastro/);
  assert.equal(all(tree).some(node => node.props?.children === 'Validar EAN'), false);
  assert.equal(input('new-local-ean').props['aria-describedby'], 'new-local-ean-help');
  input('new-price').props.onChange({ target: { value: '12345' } });
  input('new-description').props.onChange({ target: { value: 'Descrição digitada' } });
  input('new-pictureUrl').props.onChange({ target: { value: 'https://example.com/foto.jpg' } });
  input('new-local-category').props.onChange({ target: { value: 'MLB1234' } });
  tree = render(); button('Validar categoria e opções').props.onClick(); await new Promise(done => setImmediate(done)); tree = render();
  assert.equal(requests.at(-1).body.categoryId, 'MLB1234');
  assert.equal(requests.at(-1).body.pictureUrl, 'https://example.com/foto.jpg');
  assert.equal(input('new-price').props.value, '123,45');
  assert.equal(input('new-description').props.value, 'Descrição digitada');
  assert.equal(input('new-pictureUrl').props.value, 'https://example.com/foto.jpg');
  button('Revalidar dados').props.onClick(); await new Promise(setImmediate); tree = render();
  assert.equal(requests.at(-1).path, 'preparar');
  assert.equal(input('new-price').props.value, '123,45');
  assert.equal(input('new-description').props.value, 'Descrição digitada');
  assert.ok(requests.every(request => request.path !== 'publicar'));

  input('new-local-ean').props.onChange({ target: { value: '7891129598607' } }); tree = render();
  assert.ok(button('Validar EAN'), 'código digitado requer revalidação');
  assert.equal(input('new-local-ean').props['aria-invalid'], true);
  assert.equal(input('new-local-ean').props['aria-describedby'], 'new-local-ean-error');
  preparation.notice = 'Dados do cadastro preparados para a conta selecionada.';
  button('Validar EAN').props.onClick(); await new Promise(setImmediate); tree = render();
  assert.equal(requests.at(-1).body.ean, '7891129598607');
  assert.equal(input('new-local-ean').props['aria-invalid'], false);
  assert.equal(input('new-local-ean').props['aria-describedby'], undefined);
  assert.equal(all(tree).some(node => node.props?.id === 'new-local-ean-help'), false);
  assert.equal(all(tree).some(node => node.props?.children === 'Validar EAN'), false, 'EAN preparado não pede validação repetida');
  assert.doesNotMatch(text(), /Dados do cadastro preparados|Este é o EAN do anúncio/);
  preparation.notice = 'Não foi possível confirmar a categoria do produto. Não publique sem revisar a ficha no Mercado Livre.';
  button('Revalidar dados').props.onClick(); await new Promise(setImmediate); tree = render();
  assert.ok(text().includes(preparation.notice), 'aviso específico continua visível');
  input('new-local-ean').props.onChange({ target: { value: '7899882306941' } }); tree = render();
  assert.ok(button('Validar EAN'));
  assert.equal(input('new-local-ean').props['aria-invalid'], true);
  assert.ok(button('Cancelar anúncio'));
  assert.equal(all(tree).some(node => node.props?.children === 'Limpar preparação'), false);
  button('Cancelar anúncio').props.onClick(); tree = render();
  assert.equal(all(tree).some(node => node.props?.id === 'new-local-ean'), false);
  assert.equal(input('new-ean').props.value, '');
  assert.equal(input('new-search-description').props.value, '');
  assert.ok(requests.every(request => request.path !== 'publicar'), 'validar/cancelar nunca publica');
});

'use client';
import usePreparationSummary from './usePreparationSummary';

import {listingSaleState} from '@/app/modules/marketplaces/listing-sale-state';
import { useCallback, useEffect, useRef, useState } from 'react';
import ProductPhotoInput from './ProductPhotoInput';
import {publicationContentReadiness} from '@/app/modules/marketplaces/publication-content-readiness';
import { formatarMoedaDigitada, moedaDigitadaParaNumero } from '@/app/lib/formatters';
import { publicationErrors, type CatalogPreparation, type PublicationForm } from '@/app/modules/marketplaces/services/catalog-publication';
import { Icon } from '@/app/projetos/components/Icon';
import { marketplaceClientRequest, type MarketplaceAccount } from './Anunciados';
import CampoBusca from '@/app/components/CampoBusca';
import BotaoAcaoCompacto from '@/app/components/BotaoAcaoCompacto';
import ModalConfirmacao from '@/app/components/ModalConfirmacao';
import CarregamentoDadosModulo from '@/app/components/CarregamentoDadosModulo';
import MarketplaceAccountPicker from './MarketplaceAccountPicker';
import MarketplaceSelect from './MarketplaceSelect';
import PublicationShipping from './PublicationShipping';
import PublicationOptionalAttributes from './PublicationOptionalAttributes';
import ProductThumbnail from './ProductThumbnail';
import MultiAccountPublication,{type MultiAccountPublicationHandle} from './MultiAccountPublication';
import {copiedSelectionOptions,copiedSelectionValue,copiedAttributeValues} from '@/app/modules/marketplaces/publication-prefill';
import { publicationRequest } from './publication-request';
import styles from './marketplaces.module.css';
import { accountDisplayName, accountReferenceDetail } from './account-identification';
import CatalogCandidateChooser from './CatalogCandidateChooser';

export type ListingCopyRequest = { id: string; targetConnectionId: string } & ({ sourceConnectionId: string; listingId: string; localProductId?: never } | { localProductId: string; sourceConnectionId?: never; listingId?: never });
type Props = { multiAccountEnabled?: boolean; companyId: string; brand?: string; dark?: boolean; marketplaceName?: string; marketplaceAvailable?: boolean; accountId: string; accounts: MarketplaceAccount[]; accountSelectionLocked: boolean; onSelectAccount: (id: string) => void; onBusyChange: (busy: boolean) => void; onPriceReferenceChange?: (reference: number | null | undefined) => void; canManage: boolean; onPublished: () => void; copyRequest: ListingCopyRequest | null; onCopyHandled: () => void; simulation?: { request: typeof marketplaceClientRequest } };
const initial = (): PublicationForm => ({ ean: '', productId: '', categoryId: '', price: 0, stock: -1, listingType: '', shippingMode: '', condition: '', warrantyType: '', description: '', attributes: {} });
const routineLocalNotices = new Set([
  'Dados do cadastro preparados para a conta selecionada.',
  'Dados do cadastro preparados para a conta selecionada. Selecione a categoria correta para consultar as condições de venda.',
]);

export default function NewListing({ multiAccountEnabled=false, companyId, brand, dark = false, marketplaceName = 'Mercado Livre', marketplaceAvailable = true, accountId: selectedAccountId, accounts, accountSelectionLocked, onSelectAccount, onBusyChange, onPriceReferenceChange, canManage, onPublished, copyRequest, onCopyHandled, simulation }: Props) {
  // O adaptador de teste substitui TODAS as operações, inclusive a cotação de frete.
  const request = simulation ? simulation.request : marketplaceClientRequest;
  const accountId=selectedAccountId||accounts.find(account=>account.status==='connected')?.id||'';
  const multiRef=useRef<MultiAccountPublicationHandle>(null);
  const activeRef = useRef(true);
  const eanInputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState<PublicationForm>(initial);
  const multiAccount=multiAccountEnabled&&!!form.localProductId;
  const [searchDescription, setSearchDescription] = useState('');
  const [priceText, setPriceText] = useState('');
  const [stockText, setStockText] = useState('');
  const [prepared, setPrepared] = useState<CatalogPreparation | null>(null);
  const [preparing, setPreparing] = useState(false);
  const [searchingBy, setSearchingBy] = useState<'ean' | 'description' | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [publicationSucceeded, setPublicationSucceeded] = useState(false);
  const [publicationSummary, setPublicationSummary] = useState('');
  useEffect(() => {
    if (!publicationSucceeded || publicationSummary) return;
    const timer = setTimeout(() => setPublicationSucceeded(false), 2500);
    return () => clearTimeout(timer);
  }, [publicationSucceeded, publicationSummary]);
  const [matched, setMatched] = useState(false);
  const [message, setMessage] = useState('');
  const [publishedId, setPublishedId] = useState('');
  const [submittedErrors, setErrors] = useState<Record<string, string>>({});
  const [scannerArmed, setScannerArmed] = useState(false);
  const [requestKey, setRequestKey] = useState(() => crypto.randomUUID());
  const [copyTargetId, setCopyTargetId] = useState('');
  const [categoryDraft, setCategoryDraft] = useState('');
  const [preserveCopiedFields, setPreserveCopiedFields] = useState(false);
  const [technicalDetails, setTechnicalDetails] = useState('');
  const [nameDraft, setNameDraft] = useState('');
  const contentSavingRef = useRef(false);
  const [shippingCostUnavailable, setShippingCostUnavailable] = useState(true);
  const [photoUploading,setPhotoUploading]=useState(false);
  const hasCancellableDraft = !!prepared || !!form.ean.trim() || !!searchDescription.trim() || !!form.productId || !!form.localProductId || !!form.copySource;
  const reviewShipping = useCallback((patch: Partial<PublicationForm>, costUnavailable?: boolean) => {
    setForm(current => ({ ...current, ...patch }));
    if (costUnavailable !== undefined) setShippingCostUnavailable(costUnavailable);
    if ('freeShipping' in patch) setMatched(false);
  }, []);
  const handledCopy = useRef('');

  useEffect(() => { activeRef.current = true; return () => { activeRef.current = false; }; }, []);
  useEffect(() => { onBusyChange(preparing || publishing || !!prepared); return () => onBusyChange(false); }, [preparing, publishing, prepared, onBusyChange]);

  function applyPreparation(result: CatalogPreparation, preferred?: PublicationForm, preserve = preserveCopiedFields) {
    setPrepared(result);
    setNameDraft(result.product?.name || '');
    if (!result.query) setSearchDescription('');
    setForm((current) => {
      const base = preferred ? { ...current, ...preferred, attributes: preferred.attributes || {} } : current;
      const sameProduct = !!result.product && base.productId === result.product.id;
      const copied=!!base.copySource;
      const allowed = <T extends { id: string }>(options: T[] | undefined, value: string) => copiedSelectionValue(options,value,copied);
      const profilePicture = result.product?.source === 'profile_catalog'
        ? result.product.pictures.includes(base.pictureUrl || '') ? base.pictureUrl : result.product.pictures[0] || ''
        : sameProduct ? base.pictureUrl || result.product?.pictures[0] || '' : result.product?.pictures[0] || base.pictureUrl || '';
      return { ...base, ean: result.ean, productId: result.product?.id || '', categoryId: result.categoryId || (copied?base.categoryId:''),
        listingType: allowed(result.listingTypes, base.listingType), shippingMode: allowed(result.shippingModes, base.shippingMode), condition: allowed(result.conditions, base.condition),
        description: result.product && !sameProduct && !preserve ? result.product.description || '' : base.description || result.product?.description || '', pictureUrl: profilePicture,additionalPictures:sameProduct?base.additionalPictures||[]:[],
        attributes: copied?copiedAttributeValues(result,base):base.attributes || {}, shippingQuoteToken: undefined, acknowledgeUnavailableShippingCost: false };
    });
    setPreserveCopiedFields(preserve || !!preferred);
    if (preferred) {
      setPriceText(Number.isFinite(preferred.price) && preferred.price > 0 ? formatarMoedaDigitada(String(Math.round(preferred.price * 100))) : '');
      setStockText(Number.isSafeInteger(preferred.stock) && preferred.stock >= 0 ? String(preferred.stock) : '');
    }
    setRequestKey(crypto.randomUUID());
  }

  async function prepare(ean = form.ean, productId = '', categoryId = '', connectionId = accountId, preferred?: PublicationForm, query = '') {
    if (!canManage || !connectionId || preparing || publishing) return;
    setTechnicalDetails('');
    setSearchingBy(productId || categoryId ? null : query ? 'description' : 'ean');
    setPreparing(true); setScannerArmed(false); setMessage(''); setErrors({}); setPublishedId(''); setMatched(false);
    try {
      const response = await publicationRequest(signal => request('preparar', { empresaId: companyId, connectionId, ean, query, productId, categoryId, ...(!query && form.localProductId ? { localProductId: form.localProductId, pictureUrl: form.pictureUrl } : {}), ...(!query && form.copySource ? { copySource: form.copySource } : {}) }, signal), 'prepare') as { result: CatalogPreparation };
      if (!activeRef.current) return;
      applyPreparation(response.result, preferred);
    } catch (failure) { if (activeRef.current) { if (!productId && !categoryId) setPrepared(null); setMessage(failure instanceof Error ? failure.message : 'Não foi possível pesquisar o produto.'); } }
    finally { setPreparing(false); setSearchingBy(null); }
  }

  useEffect(() => {
    if (!copyRequest || copyRequest.targetConnectionId !== accountId || handledCopy.current === copyRequest.id) return;
    const currentCopy = copyRequest;
    handledCopy.current = currentCopy.id;
    async function copyListing() {
      if (!canManage || preparing || publishing) return;
      setTechnicalDetails('');
      setPreparing(true); setScannerArmed(false); setMessage(''); setErrors({}); setPublishedId(''); setMatched(false);
      try {
        const response = await publicationRequest(signal => currentCopy.localProductId
          ? request('produtos/preparar', { empresaId: companyId, connectionId: currentCopy.targetConnectionId, productId: currentCopy.localProductId }, signal)
          : request('preparar-copia', { empresaId: companyId, sourceConnectionId: currentCopy.sourceConnectionId, targetConnectionId: currentCopy.targetConnectionId, listingId: currentCopy.listingId, multiAccount:true }, signal), 'prepare') as { result: CatalogPreparation; form: PublicationForm; sourceTitle: string };
        if (!activeRef.current) return;
        applyPreparation(response.result, response.form);
        setCategoryDraft(response.form.categoryId);
      } catch (failure) {
        if (activeRef.current) setMessage(failure instanceof Error ? failure.message : 'Não foi possível preparar a cópia do anúncio.');
      } finally {
        if (activeRef.current) setPreparing(false);
        onCopyHandled();
      }
    }
    void copyListing();
  }, [accountId, canManage, companyId, copyRequest, onCopyHandled, preparing, publishing, request]);

  async function uploadPreparationPhoto(file:File|string){
    if(preparing||publishing||!prepared?.product||!accountId)return;
    const photos=[...new Set([...prepared.product.pictures,...form.additionalPictures||[]])];
    if(photos.length>=12)throw Error('Use até 12 fotos.');
    if(typeof file!=='string'&&(!['image/jpeg','image/png','image/webp','image/avif'].includes(file.type)||file.size>2_621_440))throw Error('Use JPG, PNG, WebP ou AVIF de até 2,5 MB.');
    setPhotoUploading(true);setPreparing(true);setMessage('');
    try{const payload=typeof file==='string'?{url:file}:{mime:file.type,base64:await new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onerror=()=>reject(Error('Não foi possível ler a foto.'));reader.onload=()=>resolve(String(reader.result).split(',')[1]||'');reader.readAsDataURL(file);})};
      const photo=await request('preparar/foto',{empresaId:companyId,connectionId:accountId,...payload},AbortSignal.timeout(55_000));
      if(typeof photo.url!=='string'||!/^https:\/\//.test(photo.url))throw Error('O Mercado Livre não confirmou a foto.');
      if(activeRef.current){change('additionalPictures',[...new Set([...form.additionalPictures||[],photo.url])]);return 'Foto adicionada à preparação. Confira antes de publicar.';}
    }finally{if(activeRef.current){setPhotoUploading(false);setPreparing(false);}}
  }
  async function saveProductContent(automaticName = false){
    if(!canManage||!accountId||contentSavingRef.current||preparing||publishing||!prepared?.localProductRevision||!form.localProductId)return;
    if(automaticName && (prepared.product?.source!=='local_product'||nameDraft.trim()===prepared.product.name))return;
    if(automaticName && (!nameDraft.trim()||(prepared.constraints?.maxTitleLength&&Array.from(nameDraft.trim()).length>prepared.constraints.maxTitleLength)))return;
    contentSavingRef.current=true;
    setPreparing(true);setMessage('');
    try{const response=await request('preparar/conteudo',{empresaId:companyId,connectionId:accountId,productId:form.localProductId,revision:prepared.localProductRevision,requestKey:crypto.randomUUID(),form:{...(prepared.product?.source==='local_product'?{name:nameDraft}:{}),categoryId:form.categoryId,description:form.description||'',attributes:form.attributes||{},additionalPictures:form.additionalPictures||[]}},AbortSignal.timeout(60_000));
      if(activeRef.current){applyPreparation(response.result,{...form,additionalPictures:[]});setErrors(current=>({...current,title:''}));setMatched(false);}
    }catch(error){if(activeRef.current){setMessage(error instanceof Error?error.message:'Não foi possível salvar a ficha.');if(automaticName)setErrors(current=>({...current,title:'Não foi possível atualizar o nome. Clique em Publicar para tentar novamente.'}));}}finally{contentSavingRef.current=false;if(activeRef.current)setPreparing(false);}
  }
  function focusContent(field:string){
    const missing=prepared?.requiredAttributes?.find(attribute=>!form.attributes?.[attribute.id]?.trim());
    const id=field==='pictures'?'new-photos':field==='description'?'new-description':missing?`new-attribute:${missing.id}`:'new-optional-attributes';
    const node=document.getElementById(id),details=node instanceof HTMLDetailsElement?node:node?.closest('details');if(details)details.open=true;node?.scrollIntoView({block:'center',behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});node?.focus();
  }
  async function publish() {
    if(contentSavingRef.current||preparing||publishing)return;
    if(prepared?.product?.source==='local_product' && nameDraft.trim()!==prepared.product.name){
      if(pendingFields.title){setErrors(current=>({...current,title:pendingFields.title}));focusFirstError({title:pendingFields.title});return;}
      await saveProductContent(true);return;
    }
    if (multiAccount && !matched) { setErrors(current => ({ ...current, match: 'Marque a confirmação para continuar com a publicação.' })); requestAnimationFrame(() => focusFirstError({ match: 'Confirmação pendente' })); return; }
    if(multiAccount){await multiRef.current?.publish();return;}
    if (!prepared?.product || !canManage || !accountId || preparing || publishing || publishedId) return;
    setTechnicalDetails('');
    const current = { ...form, productId: prepared.product.id };
    const validation = publicationErrors(current, prepared);
    if (current.shippingMode === 'me2' && (!current.shippingQuoteToken || (shippingCostUnavailable && !current.acknowledgeUnavailableShippingCost))) validation.freeShipping = 'Confira a estimativa e as condições de frete antes de publicar.';
    if (!matched) validation.match = 'Confirme que a ficha corresponde exatamente ao produto.';
    setErrors(validation); setMessage('');
    if (Object.keys(validation).length) { focusFirstError(validation); return; }
    setPublishing(true);
    try {
      const result = await publicationRequest(signal => request('publicar', { empresaId: companyId, connectionId: accountId, requestKey, form: current }, signal), 'publish') as { status: string; listing: { id: string; title: string; status?: string; substatus?: string[]; stock?: number | null }; localProductId: string };
      if (result.status !== 'published' || !/^MLB\d+$/.test(result.listing?.id || '')) throw Object.assign(new Error('A publicação não foi confirmada. Seus dados foram mantidos; confira Anunciados e o Mercado Livre antes de repetir.'), { code: 'publication_uncertain' });
      clearPreparation();
      setPublishedId(result.listing.id); setPublicationSummary(`Anúncio criado · ${result.listing.id}. ${listingSaleState(result.listing)}.`); setPublicationSucceeded(true); onPublished();
    } catch (failure) {
      const detail = failure as Error & { code?: string; fields?: Record<string, string>; details?: string };
      setTechnicalDetails(detail.details || '');
      setErrors(detail.fields || {});
      requestAnimationFrame(() => {
        if (Object.values(detail.fields || {}).some(Boolean)) focusFirstError(detail.fields || {});
        else { const diagnostic = document.getElementById('new-publication-error'); diagnostic?.scrollIntoView({ block: 'center', behavior: 'auto' }); diagnostic?.focus(); }
      });
      setMessage(detail.message || 'Não foi possível confirmar a publicação. Confira a lista antes de tentar novamente.');
      // Só recusa explícita permite nova tentativa. Timeout, resultado parcial ou erro
      // desconhecido mantêm a chave: uma resposta perdida pode ter criado o anúncio.
      if (detail.code === 'invalid_fields') setRequestKey(crypto.randomUUID());
    } finally { setPublishing(false); }
  }

  const product = prepared?.product;
  const preparationLayoutRef=usePreparationSummary(product?.id||'');
  useEffect(() => {
    onPriceReferenceChange?.(product ? prepared?.referencePriceCents ?? null : undefined);
    return () => onPriceReferenceChange?.(undefined);
  }, [onPriceReferenceChange, prepared?.referencePriceCents, product]);
  const previewAttributes = Array.from(new Map([
    ...(product?.attributes || []).map(attribute => [attribute.id, { name: attribute.name, value: attribute.value }] as const),
    ...Object.entries(form.attributes || {}).map(([id, value]) => {
      const field = [...prepared?.requiredAttributes||[],...prepared?.optionalAttributes||[]].find(attribute => attribute.id === id);
      return [id, { name: field?.name || product?.attributes.find(attribute => attribute.id === id)?.name || id, value: field?.values.find(option => option.id === value)?.name || value || 'A informar' }] as const;
    }),
  ]).values());
  function clearPreparation() {
    setPrepared(null); setForm(initial()); setPriceText(''); setStockText(''); setSearchDescription(''); setNameDraft('');
    setCategoryDraft(''); setCopyTargetId(''); setMatched(false); setPublishedId(''); setMessage('');
    setTechnicalDetails(''); setErrors({}); setPreserveCopiedFields(false); setScannerArmed(false);
    setShippingCostUnavailable(true); setRequestKey(crypto.randomUUID());
  }
  const connectedAccounts = accounts.filter((account) => account.status === 'connected');
  const selectedAccount = connectedAccounts.find((account) => account.id === accountId);
  const ready = !!product && !!prepared?.categoryId && !prepared.blockingIssues?.length && !!prepared.listingTypes?.length && !!prepared.shippingModes?.length && !!prepared.conditions?.length;
  const change = <K extends keyof PublicationForm>(key: K, value: PublicationForm[K]) => {
    const changedAttributes = key === 'attributes' ? Object.entries(value as Record<string, string> || {}).filter(([id, next]) => form.attributes?.[id] !== next).map(([id]) => id) : [];
    const affectsShipping = ['price', 'listingType', 'shippingMode', 'condition', 'categoryId', 'attributes', 'productId', 'packageDimensions', 'freeShipping'].includes(key);
    setForm((current) => ({ ...current, [key]: value, ...(affectsShipping ? { shippingQuoteToken: undefined, acknowledgeUnavailableShippingCost: false } : {}) }));
    if (affectsShipping) setMatched(false);
    setErrors((current) => {
      const next = { ...current, [key]: '' };
      for (const id of changedAttributes) delete next[`attribute:${id}`];
      return next;
    });
  };
  const pendingFields = prepared?.localProductId ? publicationErrors(form, prepared.product?.source==='local_product'?{...prepared,product:{...prepared.product,name:nameDraft.trim()}}:prepared) : {};
  if(prepared?.product?.source==='local_product'&&!nameDraft.trim())pendingFields.title='Informe o nome do produto.';
  const errors = { ...pendingFields, ...Object.fromEntries(Object.entries(submittedErrors).filter(([, value]) => value)) };
  const fieldErrors = errors;
  const preparationNotice = prepared?.localProductId && routineLocalNotices.has(prepared.notice || '') ? '' : prepared?.notice;
  const eanHelp = !prepared?.localProductId ? 'Código da ficha de origem. Para corrigir, ajuste a origem e revalide os dados.'
    : !form.ean ? 'Produto sem EAN? Confira o motivo de ausência, quando disponível nesta categoria. Não informe um código fictício.' : '';
  const publicationGuidance = preparing ? 'Validando os dados. Aguarde a conclusão.'
    : publishing ? simulation ? 'Executando a simulação local. Nenhum anúncio será enviado.' : 'Enviando a publicação. Não repita a operação.'
    : !matched ? 'Marque a confirmação do produto para concluir. Você também pode clicar em Publicar para conferir todas as pendências.'
    : form.shippingMode === 'me2' && !form.shippingQuoteToken ? 'Confira ou atualize a estimativa do frete. Publicar indica as pendências sem enviar o anúncio.'
    : form.shippingMode === 'me2' && shippingCostUnavailable && !form.acknowledgeUnavailableShippingCost ? 'Confirme que está ciente do custo de envio indisponível, ou tente atualizar a estimativa.'
    : 'Se houver algum erro, Publicar indicará o campo para ajuste sem apagar seus dados.';

  function focusFirstError(currentErrors: Record<string, string>) {
    const first = Object.keys(currentErrors).find((key) => currentErrors[key]);
    if (!first) return;
    // Erros desta função são do anúncio; a busca new-ean nunca é um destino.
    const isEan = ['ean', 'attribute:GTIN', 'attribute:EAN'].includes(first);
    const target = isEan ? 'new-local-ean' : first === 'match' ? 'catalog-match' : first === 'attributes' ? 'new-attributes' : `new-${first}`;
    const element = document.getElementById(target) || (isEan ? document.getElementById('new-gtin') || document.getElementById('new-attributes') : first.startsWith('attribute:') ? document.getElementById('new-attributes') : null) || document.getElementById('catalog-errors');
    if (element?.tagName === 'DETAILS') (element as HTMLDetailsElement).open = true;
    element?.closest('details')?.setAttribute('open', '');
    element?.scrollIntoView({ block: 'center', behavior: 'auto' });
    element?.focus();
  }

  function toggleScanner() {
    if (scannerArmed) { setScannerArmed(false); return; }
    setScannerArmed(true);
    setMessage('');
    requestAnimationFrame(() => { eanInputRef.current?.focus(); eanInputRef.current?.select(); });
  }

  function changeEan(value: string) {
    if (preparing || publishing) return;
    setTechnicalDetails('');
    setSearchDescription('');
    change('ean', value.replace(/\D/g, '').slice(0, 14));
    change('copySource', undefined);
    change('localProductId', undefined);
    setPreserveCopiedFields(false);
    setPrepared(null); setMatched(false); setPublishedId(''); setMessage('');
  }

  function changeSearchDescription(value: string) {
    if (preparing || publishing) return;
    setTechnicalDetails('');
    setSearchDescription(value);
    change('ean', '');
    change('copySource', undefined);
    change('localProductId', undefined);
    setScannerArmed(false); setPreserveCopiedFields(false);
    setPrepared(null); setMatched(false); setPublishedId(''); setMessage('');
  }

  function searchByDescription() {
    if (searchDescription.trim().length < 3) return;
    void prepare('', '', '', accountId, undefined, searchDescription);
  }

  async function prepareForAnotherAccount() {
    const target = connectedAccounts.find((account) => account.id === copyTargetId);
    if (!target || target.status !== 'connected' || preparing || publishing) return;
    setTechnicalDetails('');
    const copiedForm = { ...form, attributes: { ...form.attributes } };
    setPreparing(true); setScannerArmed(false); setMessage(''); setErrors({}); setPublishedId(''); setMatched(false);
    try {
      let response: { result: CatalogPreparation };
      try {
        response = await publicationRequest(signal => request('preparar', { empresaId: companyId, connectionId: target.id, ean: copiedForm.ean, productId: copiedForm.productId, categoryId: copiedForm.categoryId, copySource: copiedForm.copySource, localProductId: copiedForm.localProductId }, signal), 'prepare') as { result: CatalogPreparation };
      } catch (failure) {
        const detail = failure as Error & { code?: string };
        if (detail.code !== 'category_mismatch') throw failure;
        response = await publicationRequest(signal => request('preparar', { empresaId: companyId, connectionId: target.id, ean: copiedForm.ean, productId: copiedForm.productId, categoryId: '', copySource: copiedForm.copySource, localProductId: copiedForm.localProductId }, signal), 'prepare') as { result: CatalogPreparation };
      }
      if (!activeRef.current) return;
      onSelectAccount(target.id);
      applyPreparation(response.result, copiedForm);
      setCopyTargetId('');
    } catch (failure) {
      if (activeRef.current) setMessage(failure instanceof Error ? failure.message : 'Não foi possível preparar a publicação na outra conta.');
    } finally { setPreparing(false); }
  }

  return <>
    <ModalConfirmacao aberto={publishing || publicationSucceeded} titulo={publishing ? (simulation ? 'Simulando publicação…' : 'Publicando…') : (simulation ? 'Simulação concluída' : 'Publicação concluída')} rotuloCabecalho="Publicação" centralizarTexto={!publishing} mensagem={publishing ? '' : simulation ? 'Nenhum anúncio foi enviado ao marketplace.' : (publicationSummary || 'Publicação confirmada pelo marketplace.')} carregando={publishing} mostrarProgresso ocultarCancelar textoConfirmar="Fechar" variante="primaria" corPrimaria={brand} darkMode={dark} aoCancelar={() => { if (!publishing) { setPublicationSummary(''); setPublicationSucceeded(false); } }} aoConfirmar={() => { if (!publishing) { setPublicationSummary(''); setPublicationSucceeded(false); } }} />
    <CarregamentoDadosModulo ativo={preparing&&!photoUploading} titulo="Preparando anúncio…" mensagem="Carregando os dados do produto e as opções da conta. Aguarde um instante." corPrimaria={brand} temaEscuro={dark} />
    <div className={styles.newListing} inert={preparing&&!photoUploading || publishing} aria-busy={preparing&&!photoUploading || publishing}>
    <div className={`${styles.form} ${styles.preparationSearch}`} data-preparation-search data-multi-account={multiAccount || undefined}>
      {!multiAccount&&<MarketplaceAccountPicker label="Conta" value={accountId} options={connectedAccounts.map((account) => ({ id: account.id, name: accountDisplayName(account), detail: accountReferenceDetail(account) }))} placeholder={connectedAccounts.length ? 'Selecione uma conta' : 'Nenhuma conta conectada'} disabled={accountSelectionLocked || preparing || publishing || !!prepared} onChange={onSelectAccount} />}
      <div className={styles.eanField}>
        <label htmlFor="new-ean">EAN / GTIN</label>
        <div className={styles.eanControl}>
          <CampoBusca inputRef={eanInputRef} id="new-ean" className={styles.eanInput} classNameControle={styles.eanSearchControl} inputMode="numeric" autoComplete="off" disabled={preparing || publishing} value={form.ean} aria-describedby={scannerArmed ? 'ean-scanner-status' : undefined} onChange={changeEan} onKeyDown={(event) => { if (event.key === 'Escape') setScannerArmed(false); if (event.key === 'Enter' && event.currentTarget.value) { event.preventDefault(); setScannerArmed(false); void prepare(event.currentTarget.value); } }} placeholder="Ex.: 7899882306941" rotuloLimpar="Limpar EAN / GTIN" />
          <button type="button" className={styles.scannerButton} aria-label={scannerArmed ? 'Desativar leitor de código de barras' : 'Ativar leitor de código de barras'} aria-pressed={scannerArmed} title={scannerArmed ? 'Leitor ativo — escaneie o código' : 'Ativar leitor de código de barras'} disabled={!canManage || !selectedAccount || preparing || publishing} onClick={toggleScanner}><Icon name="barcode" size={20} /></button>
        </div>
        <span id="ean-scanner-status" className={styles.srOnly} role="status">{scannerArmed ? 'Leitor ativado. Escaneie o código de barras agora.' : ''}</span>
      </div>
      <div className={styles.eanField}>
        <label htmlFor="new-search-description">Nome, marca ou modelo</label>
        <CampoBusca id="new-search-description" autoComplete="off" maxLength={120} disabled={preparing || publishing} value={searchDescription} onChange={changeSearchDescription} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); searchByDescription(); } }} placeholder="Digite para pesquisar" rotuloLimpar="Limpar pesquisa por descrição" />
      </div>
      <div className={styles.newListingTopActions}>
        <BotaoAcaoCompacto variante="primario" aria-busy={searchingBy !== null} disabled={!canManage || !selectedAccount || preparing || publishing || (!form.ean && searchDescription.trim().length < 3)} onClick={() => { setScannerArmed(false); if (form.ean) void prepare(); else searchByDescription(); }}>{searchingBy !== null ? 'Pesquisando…' : 'Pesquisar'}</BotaoAcaoCompacto>
        <BotaoAcaoCompacto disabled={!hasCancellableDraft || publishing || preparing} onClick={clearPreparation}>Cancelar</BotaoAcaoCompacto>
      </div>
      {!marketplaceAvailable && <p className={styles.help} role="status">Publicação no {marketplaceName} ainda não disponível.</p>}
      {marketplaceAvailable && !selectedAccount && <p className={styles.help}>{accountId ? 'Esta conta não está conectada. Reconecte-a ou selecione outra conta para publicar.' : `Conecte ou selecione uma conta do ${marketplaceName} para pesquisar o produto.`}</p>}
      {marketplaceAvailable && accountId && !canManage && <p className={styles.help}>Seu perfil pode consultar anúncios, mas não preparar publicações.</p>}
    </div>

    {prepared?.status === 'not_found' && <p className={styles.catalogNotice} role="status">{prepared.notice || 'EAN não localizado. Confira o código; nenhum anúncio foi criado.'}</p>}
    {prepared?.status === 'found' && !product && prepared.notice && <p className={styles.catalogNotice} role="status">{prepared.notice}</p>}
    <CatalogCandidateChooser aberto={!!prepared?.candidates?.length && !product} ean={prepared?.ean || form.ean} candidates={prepared?.candidates || []} dark={dark} onClose={() => setPrepared(null)} onChoose={(productId) => void prepare(prepared?.ean || form.ean, productId, '', accountId, undefined, prepared?.query || '')} />

    {product && <div ref={preparationLayoutRef} className={`${styles.catalogResult} ${styles.preparationLayout}`} data-local-draft={!!prepared.localProductId} aria-live="polite">
      <section aria-label="Dados do produto para preparar anúncio" className={styles.preparationMain}>
      <div className={styles.catalogIdentity} id={prepared.localProductId&&product.source==='local_product'?'new-product-identity':'new-title'} tabIndex={-1} data-validation-error={!!errors.title}>{product.picture && <img src={product.picture} alt={product.name} />}<div><strong>{product.name}</strong><small>{product.source === 'local_product' ? 'Cadastro local da empresa' : product.source === 'profile_catalog' ? 'Cadastro do perfil' : product.source === 'marketplace_listing' ? `Anúncio de origem · ${product.id}` : `Catálogo ML · ${product.id}`}</small><small>{prepared.ean ? `EAN ${prepared.ean}` : prepared.copySource || prepared.localProductId ? 'Produto sem EAN' : 'EAN a confirmar'}</small></div></div>
      {prepared.localProductId&&product.source==='local_product'&&<label className={`${styles.catalogField} ${styles.catalogWide}`} htmlFor="new-title">Nome do produto<input id="new-title" value={nameDraft} maxLength={220} disabled={preparing||publishing} aria-invalid={!!errors.title} aria-describedby={`new-title-help${errors.title?' new-title-error':''}`} onBlur={()=>void saveProductContent(true)} onChange={event=>{setNameDraft(event.target.value);setMatched(false);setErrors(current=>({...current,title:''}));}}/><span id="new-title-help" className={styles.help}>{Array.from(nameDraft).length}{prepared.constraints?.maxTitleLength?` / ${prepared.constraints.maxTitleLength} caracteres`: ' caracteres'}. O nome é atualizado automaticamente no cadastro ao sair deste campo.</span></label>}
      {errors.title&&<p id="new-title-error" className={styles.connectionMessage} role="alert">{errors.title}</p>}
      <section id="new-photos" tabIndex={-1} aria-label="Fotos da preparação"><h4>Fotos do produto</h4><div className={styles.catalogPictures}>{[...new Set([...product.pictures,...form.additionalPictures||[]])].map((url,index)=><img key={url} src={url} alt={`Foto ${index+1} de ${product.name}`}/>)}</div><ProductPhotoInput key={product.id} disabled={preparing||publishing||!!publishedId} onFile={uploadPreparationPhoto} onUrl={uploadPreparationPhoto}/></section>
      <section className={styles.preparationContentCheck} aria-label="Preparar conteúdo para qualidade"><h4>Preparar conteúdo para qualidade</h4><ul>{publicationContentReadiness(prepared,form).map(task=><li key={task.field}><span>{task.ready?'✓ ':''}{task.title}</span>{!task.ready&&<BotaoAcaoCompacto disabled={preparing||publishing} onClick={()=>focusContent(task.field)}>Completar</BotaoAcaoCompacto>}</li>)}</ul></section>
      <details id="new-attributes" tabIndex={-1} open={errors.attributes || Object.keys(errors).some(key => key.startsWith('attribute:') && errors[key]) ? true : undefined} data-validation-error={!!errors.attributes || Object.keys(errors).some(key => key.startsWith('attribute:') && errors[key])}><summary>Características localizadas ({product.attributes.length})</summary>{errors.attributes && <p className={styles.connectionMessage}>{errors.attributes}</p>}<dl className={styles.catalogAttributes}>{product.attributes.map((attribute) => <div key={attribute.id} data-validation-error={!!errors[`attribute:${attribute.id}`]}><dt>{attribute.name}</dt><dd>{attribute.value}</dd>{errors[`attribute:${attribute.id}`] && <p className={styles.connectionMessage}>{errors[`attribute:${attribute.id}`]} Revise esta característica no cadastro de origem e prepare novamente.</p>}</div>)}</dl></details>
      {preparationNotice && <p className={styles.catalogNotice}>{preparationNotice}</p>}
      {!!prepared.blockingIssues?.length && <ul className={styles.catalogErrors} role="alert">{prepared.blockingIssues.map((issue) => <li key={issue.code}>{issue.message}</li>)}</ul>}
      {!!prepared.warnings?.length && <ul className={styles.catalogWarnings}>{prepared.warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul>}
      {!prepared.ean && !!prepared.gtins?.length && <MarketplaceSelect id="new-gtin" className={styles.catalogField} label="EAN da embalagem" value="" disabled={preparing || publishing} options={prepared.gtins.map((code) => ({ value: code, label: code }))} placeholder="Selecione o código do seu produto" onChange={(value) => void prepare(value, product.id, '', accountId, undefined, prepared.query || '')} />}

      {(prepared.ean || prepared.copySource || prepared.localProductId) && <><div className={styles.catalogFields}>
        {prepared.localProductId && <div className={styles.catalogField}><label htmlFor="new-local-category">Código da categoria ML<input id="new-local-category" value={categoryDraft} placeholder="Ex.: MLB1234" disabled={preparing || publishing} onChange={event => setCategoryDraft(event.target.value.toUpperCase())} /></label><BotaoAcaoCompacto disabled={preparing || publishing || !/^MLB\d+$/.test(categoryDraft)} onClick={() => void prepare(form.ean, product.id, categoryDraft)}>Validar categoria e opções</BotaoAcaoCompacto></div>}
        {prepared.localProductId && !product.pictures.length && <div className={styles.catalogField}><label htmlFor="new-pictureUrl">Foto do produto (URL HTTPS)<input id="new-pictureUrl" type="url" value={form.pictureUrl || ''} aria-invalid={!!fieldErrors.pictureUrl} onChange={event => change('pictureUrl', event.target.value)} placeholder="https://…" /></label><BotaoAcaoCompacto disabled={preparing || publishing || !form.pictureUrl} onClick={() => void prepare(form.ean, product.id, form.categoryId)}>Validar foto</BotaoAcaoCompacto>{fieldErrors.pictureUrl && <small>{fieldErrors.pictureUrl}</small>}</div>}
        <div className={styles.catalogField} data-validation-error={!!errors.ean}>
          <label htmlFor="new-local-ean">EAN do produto no anúncio<input id="new-local-ean" inputMode="numeric" value={form.ean} readOnly={multiAccount||!prepared.localProductId} disabled={preparing || publishing} aria-invalid={!!errors.ean} aria-describedby={[eanHelp ? 'new-local-ean-help' : '', errors.ean ? 'new-local-ean-error' : ''].filter(Boolean).join(' ') || undefined} onChange={event => change('ean', event.target.value.replace(/\D/g, '').slice(0, 14))} /></label>
          {eanHelp && <small id="new-local-ean-help">{eanHelp}</small>}
          {errors.ean && <small id="new-local-ean-error" role="alert">{errors.ean}</small>}
          {prepared.localProductId && form.ean && (form.ean !== prepared.ean || errors.ean) && <BotaoAcaoCompacto disabled={preparing || publishing} onClick={() => void prepare(form.ean, product.id, form.categoryId)}>Validar EAN</BotaoAcaoCompacto>}
          {!form.ean && prepared.requiredAttributes?.some(field => field.id === 'EMPTY_GTIN_REASON') && <BotaoAcaoCompacto variante="discreto" onClick={() => focusFirstError({ 'attribute:EMPTY_GTIN_REASON': 'Confira o motivo da ausência de EAN.' })}>Conferir motivo de ausência</BotaoAcaoCompacto>}
        </div>
        <MarketplaceSelect id="new-categoryId" className={styles.catalogField} label="Categoria" value={form.categoryId} options={copiedSelectionOptions(prepared.categories,form.categoryId,'Categoria da origem',!!form.copySource).map((category) => ({ value: category.id, label: category.name, detail: category.path || 'Caminho indisponível. Revalide a categoria.' }))} placeholder="Selecione" error={errors.categoryId} onChange={(value) => { change('categoryId', value); void prepare(prepared.ean, product.id, value); }} />
        <label className={styles.catalogField} htmlFor="new-price">Preço de venda<input id="new-price" aria-invalid={!!errors.price} inputMode="decimal" value={priceText} onChange={(event) => { const text = formatarMoedaDigitada(event.target.value); setPriceText(text); change('price', moedaDigitadaParaNumero(text) ?? 0); }} placeholder="R$ 0,00" />{errors.price && <small role="alert">{errors.price}</small>}</label>
        <label className={styles.catalogField} htmlFor="new-stock">Saldo online disponível<input id="new-stock" readOnly={multiAccount} aria-invalid={!!errors.stock} inputMode="numeric" value={stockText} onChange={(event) => { const text = event.target.value.replace(/\D/g, '').slice(0, 5); setStockText(text); change('stock', text ? Number(text) : -1); }} placeholder="Quantidade" />{errors.stock && <small role="alert">{errors.stock}{prepared.localProductId ? " Ajuste o saldo no cadastro/estoque antes de publicar; preencher este anúncio não cria saldo." : ""}</small>}</label>
        <MarketplaceSelect id="new-listingType" className={styles.catalogField} label="Tipo de anúncio" value={form.listingType} options={copiedSelectionOptions(prepared.listingTypes,form.listingType,({gold_special:'Clássico',gold_pro:'Premium',free:'Grátis'} as Record<string,string>)[form.listingType]||form.listingType,!!form.copySource).map((option) => ({ value: option.id, label: option.name }))} placeholder="Selecione" error={errors.listingType} onChange={(value) => change('listingType', value)} />
        <MarketplaceSelect id="new-shippingMode" className={styles.catalogField} label="Forma de envio" value={form.shippingMode} options={copiedSelectionOptions(prepared.shippingModes,form.shippingMode,({me2:'Mercado Envios',me1:'Mercado Envios 1',custom:'Envio personalizado',not_specified:'A combinar'} as Record<string,string>)[form.shippingMode]||form.shippingMode,!!form.copySource).map((option) => ({ value: option.id, label: option.name }))} placeholder="Selecione" error={errors.shippingMode} onChange={(value) => change('shippingMode', value)} />
        {!multiAccount&&<PublicationShipping companyId={companyId} accountId={accountId} reviewId={requestKey} form={form} disabled={preparing || publishing || !!publishedId} onReview={reviewShipping} error={errors.freeShipping} request={request} />}
        <MarketplaceSelect id="new-condition" className={styles.catalogField} label="Condição" value={form.condition} options={copiedSelectionOptions(prepared.conditions,form.condition,({new:'Novo',used:'Usado',refurbished:'Recondicionado'} as Record<string,string>)[form.condition]||form.condition,!!form.copySource).map((option) => ({ value: option.id, label: option.name }))} placeholder="Selecione" error={errors.condition} onChange={(value) => change('condition', value)} />
        <MarketplaceSelect id="new-warrantyType" className={styles.catalogField} label="Garantia" value={form.warrantyType} options={[{ value: 'none', label: 'Sem garantia' }, { value: 'seller', label: 'Garantia do vendedor' }, { value: 'factory', label: 'Garantia de fábrica' }]} placeholder="Selecione" error={errors.warrantyType} onChange={(value) => change('warrantyType', value)} />
        {['profile_catalog', 'local_product'].includes(product.source || '') && product.pictures.length > 0 && <MarketplaceSelect id="new-pictureUrl" className={styles.catalogField} label="Imagem principal" value={form.pictureUrl || ''} options={product.pictures.map((url, index) => ({ value: url, label: `Imagem ${index + 1}` }))} placeholder="Selecione" error={errors.pictureUrl} onChange={(value) => change('pictureUrl', value)} />}
        {form.warrantyType && form.warrantyType !== 'none' && <label className={styles.catalogField} htmlFor="new-warrantyTime">Prazo da garantia<input id="new-warrantyTime" aria-invalid={!!errors.warrantyTime} aria-describedby={`new-warrantyTime-help${errors.warrantyTime ? ' new-warrantyTime-error' : ''}`} value={form.warrantyTime || ''} onChange={(event) => change('warrantyTime', event.target.value)} placeholder="Ex.: 3 meses" /><small id="new-warrantyTime-help">Quantidade + unidade. Ex.: 3 meses. Use dias, meses ou anos.</small>{errors.warrantyTime && <small id="new-warrantyTime-error" role="alert">{errors.warrantyTime}</small>}</label>}
        {prepared.requiredAttributes?.map((attribute) => attribute.values.length ? <MarketplaceSelect key={attribute.id} id={`new-attribute:${attribute.id}`} className={styles.catalogField} label={attribute.name} value={form.attributes?.[attribute.id] || ''} options={copiedSelectionOptions(attribute.values,form.attributes?.[attribute.id]||'',form.attributes?.[attribute.id]||'',!!form.copySource).map((option) => ({ value: option.id, label: option.name }))} placeholder="Selecione" error={errors[`attribute:${attribute.id}`]} onChange={(value) => change('attributes', { ...form.attributes, [attribute.id]: value })} /> : <label key={attribute.id} className={styles.catalogField} htmlFor={`new-attribute:${attribute.id}`}>{attribute.name}<input id={`new-attribute:${attribute.id}`} aria-invalid={!!errors[`attribute:${attribute.id}`]} value={form.attributes?.[attribute.id] || ''} onChange={(event) => change('attributes', { ...form.attributes, [attribute.id]: event.target.value })} />{errors[`attribute:${attribute.id}`] && <small role="alert">{errors[`attribute:${attribute.id}`]}</small>}</label>)}
        <PublicationOptionalAttributes fields={prepared.optionalAttributes} values={form.attributes} errors={errors} prefix="new" disabled={publishing||preparing} onChange={values=>change('attributes',values)}/>
        <label className={`${styles.catalogField} ${styles.catalogWide}`} htmlFor="new-description">Descrição<textarea id="new-description" rows={5} value={form.description || ''} onChange={(event) => change('description', event.target.value)} placeholder="Informações adicionais do produto" />{errors.description && <small role="alert">{errors.description}</small>}</label>
        {form.localProductId&&<div className={styles.catalogWide}><BotaoAcaoCompacto disabled={preparing||publishing||!!publishedId} onClick={()=>void saveProductContent()}>Salvar ficha no cadastro</BotaoAcaoCompacto><small className={styles.help}>Salve fotos, descrição e características para usar a mesma ficha nas contas. Publicar é uma etapa separada.</small></div>}
      </div>
      {Object.values(errors).filter(Boolean).length > 0 && <ul id="catalog-errors" className={styles.catalogErrors} role="alert" tabIndex={-1} aria-label="Campos que precisam de ajuste">{Object.entries(errors).filter(([, error]) => error).map(([field, error]) => <li key={field}><span>{error}</span> <BotaoAcaoCompacto variante="discreto" onClick={() => focusFirstError({ [field]: error })}>Conferir campo</BotaoAcaoCompacto></li>)}</ul>}
      <div className={styles.catalogMatchArea} data-invalid={!!errors.match || undefined}><label className={styles.catalogMatch}><input id="catalog-match" type="checkbox" checked={matched} aria-invalid={!!errors.match} aria-describedby={errors.match ? 'catalog-match-error' : undefined} onChange={(event) => { setMatched(event.target.checked); setErrors((current) => ({ ...current, match: '' })); }} />{form.localProductId ? 'Confirmo o produto e os dados desta publicação.' : 'Confirmo o produto e a quantidade física informada. Este será o estoque inicial do cadastro local.'}</label>{errors.match && <p id="catalog-match-error" className={styles.catalogMatchError} role="alert">{errors.match}</p>}</div>
      <p className={styles.help}>Somente o estoque Online alimenta os anúncios. Publicar em outra conta não acrescenta unidades ao estoque.</p>
      {!publishedId && <p className={styles.help} id="new-publication-readiness" role="status">{publicationGuidance}</p>}
      {multiAccount&&<MultiAccountPublication ref={multiRef} companyId={companyId} form={form} productRevision={prepared.localProductRevision} accounts={accounts} confirmed={matched} disabled={preparing} onBusyChange={setPublishing} onCompleted={summary=>{clearPreparation();setPublicationSummary(summary);setPublicationSucceeded(true);onPublished();}} sourceConnectionId={form.copySource?.connectionId} sourceListingId={form.copySource?.listingId} request={request}/>}
      <div className={styles.preparationActions} role="group" aria-label="Ações do anúncio">
      <BotaoAcaoCompacto className={styles.preparationCancel} disabled={!hasCancellableDraft || publishing || preparing} onClick={clearPreparation}>Cancelar anúncio</BotaoAcaoCompacto>
      <BotaoAcaoCompacto id="new-preparation" className={styles.preparationReview} disabled={!canManage || !selectedAccount || preparing || publishing || !!publishedId} onClick={() => void prepare(form.ean, product.id, form.categoryId)}>Revalidar dados</BotaoAcaoCompacto>
      <BotaoAcaoCompacto className={styles.preparationPublish} aria-describedby="new-publication-readiness" disabled={!canManage || !selectedAccount || publishing || preparing || !!publishedId} onClick={() => void publish()}>{simulation ? publishing ? 'Simulando…' : 'Simular publicação' : publishing ? 'Publicando…' : publishedId ? 'Publicado' : 'Publicar'}</BotaoAcaoCompacto>
      </div>
      {publishedId && connectedAccounts.filter((account) => account.id !== accountId).length > 0 && <div className={styles.publishAnotherAccount}>
        <MarketplaceAccountPicker label="Publicar esta ficha em outra conta" value={copyTargetId} options={connectedAccounts.filter((account) => account.id !== accountId).map((account) => ({ id: account.id, name: accountDisplayName(account), detail: accountReferenceDetail(account) }))} placeholder="Selecione a conta de destino" disabled={preparing || publishing} onChange={setCopyTargetId} />
        <button type="button" disabled={!copyTargetId || preparing || publishing} onClick={() => void prepareForAnotherAccount()}>Preparar em outra conta</button>
        <p>Os dados são copiados apenas para revisão. A nova conta só recebe o anúncio após uma confirmação separada.</p>
      </div>}
      {!ready && <p className={styles.help}>Antes do envio, confirme a categoria e as opções de venda permitidas pelo Mercado Livre. Publicar indica as pendências sem enviar o anúncio.</p>}
      </>}
      </section>
      <div data-preparation-summary-rail className={styles.preparationSummaryRail}><div className={styles.preparationSummaryFloat}>
      <aside className={styles.preparationSummary} aria-labelledby="new-preparation-summary-title" tabIndex={0}>
        <h3 id="new-preparation-summary-title">Prévia do anúncio</h3>
        <div className={styles.preparationPreviewIdentity}>
          <div className={styles.preparationPreviewPhoto}><ProductThumbnail key={form.pictureUrl || product.picture || ''} url={form.pictureUrl || product.picture || undefined} name={product.name} /></div>
          <div><p className={styles.preparationSummaryProduct}>{product.name}</p><p className={styles.preparationPreviewCode}>EAN {form.ean || 'Não informado'}</p></div>
        </div>
        <dl className={styles.preparationPreviewFinance}>
          <div><dt>Preço de venda</dt><dd className={styles.preparationPreviewPrice}>{Number.isFinite(form.price) && form.price > 0 ? `R$ ${priceText}` : 'A informar'}</dd></div>
          <div><dt>Quantidade</dt><dd>{Number.isSafeInteger(form.stock) && form.stock >= 0 ? `${form.stock} un.` : 'A informar'}</dd></div>
        </dl>
        <dl className={styles.preparationPreviewMetadata}>
          <div><dt>Marketplace</dt><dd>{marketplaceName}</dd></div>
          <div><dt>Contas</dt><dd>{multiAccount ? 'Selecionar ao final' : selectedAccount ? accountDisplayName(selectedAccount) : 'Conta indisponível'}</dd></div>
          <div><dt>Categoria</dt><dd>{prepared.categories?.find(category => category.id === form.categoryId)?.name || 'A confirmar'}</dd></div>
          <div><dt>Tipo de anúncio</dt><dd>{prepared.listingTypes?.find(option => option.id === form.listingType)?.name || 'A escolher'}</dd></div>
          <div><dt>Condição</dt><dd>{prepared.conditions?.find(option => option.id === form.condition)?.name || 'A escolher'}</dd></div>
          <div><dt>Envio</dt><dd>{prepared.shippingModes?.find(option => option.id === form.shippingMode)?.name || 'A escolher'}{form.shippingMode === 'me2' && form.freeShipping === true ? ' · Frete grátis' : ''}</dd></div>
          <div><dt>Garantia</dt><dd>{form.warrantyType === 'none' ? 'Sem garantia' : form.warrantyType ? `${form.warrantyType === 'factory' ? 'De fábrica' : 'Do vendedor'}${form.warrantyTime ? ` · ${form.warrantyTime}` : ''}` : 'A informar'}</dd></div>
        </dl>
        <details className={styles.preparationPreviewDetails}><summary>Descrição e características</summary><p>{form.description || 'Descrição ainda não preenchida.'}</p><dl><div><dt>Categoria completa</dt><dd>{prepared.categories?.find(category => category.id === form.categoryId)?.path || prepared.categories?.find(category => category.id === form.categoryId)?.name || 'A confirmar'}</dd></div></dl>{previewAttributes.length > 0 && <dl>{previewAttributes.map(attribute => <div key={attribute.name}><dt>{attribute.name}</dt><dd>{attribute.value}</dd></div>)}</dl>}</details>
      </aside>
      </div></div>
    </div>}
    {(message || technicalDetails) && <section className={styles.newListingFooter} aria-label="Retorno da preparação">
      {message && <p id="new-publication-error" tabIndex={-1} className={`${publishedId ? styles.catalogSuccess : styles.connectionMessage} ${styles.publicationDiagnostic}`} role={publishedId ? 'status' : 'alert'}>{message}</p>}
      {technicalDetails && <details><summary>Detalhes técnicos (última tentativa)</summary><p className={styles.publicationDiagnostic}>{technicalDetails}</p></details>}
    </section>}
  </div></>;
}

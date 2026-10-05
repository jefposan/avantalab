import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { safeHttpsImage, safeText, type CatalogAttribute, type CatalogCandidate } from './catalog-publication';

export type ProfileCatalogProduct = CatalogCandidate & {
  attributes: CatalogAttribute[];
  pictures: string[];
  description: string;
};

export type ProfileCatalogLookup = {
  status: 'found' | 'not_found' | 'choose';
  candidates: CatalogCandidate[];
  product?: ProfileCatalogProduct;
  notice: string;
};

const profileId = (id: unknown) => `PROFILE:${safeText(id, 80)}`;

function profileProduct(row: Record<string, unknown>): ProfileCatalogProduct | null {
  const id = profileId(row.id);
  const name = safeText(row.nome, 220);
  if (!/^PROFILE:[0-9a-f-]{36}$/i.test(id) || !name) return null;
  const picture = safeHttpsImage(row.imagem_url);
  const brand = safeText(row.marca, 300);
  const attributes: CatalogAttribute[] = brand ? [{ id: 'BRAND', name: 'Marca', value: brand }] : [];
  return {
    id,
    name,
    domainId: '',
    picture,
    source: 'profile_catalog',
    attributes,
    pictures: picture ? [picture] : [],
    description: safeText(row.descricao, 5000),
  };
}

export async function lookupProfileCatalogByEan(
  db: SupabaseClient,
  companyId: string,
  ean: string,
  selectedId?: unknown,
): Promise<ProfileCatalogLookup> {
  const { data: catalogs, error: catalogError } = await db.from('vendas_mobile_catalogos')
    .select('id,padrao')
    .eq('empresa_id', companyId)
    .eq('ativo', true)
    .order('padrao', { ascending: false });
  if (catalogError) return { status: 'not_found', candidates: [], notice: 'Não foi possível consultar os produtos cadastrados neste perfil agora.' };
  const catalogIds = (catalogs || []).map((row) => safeText(row.id, 80)).filter(Boolean);
  if (!catalogIds.length) return { status: 'not_found', candidates: [], notice: 'EAN não localizado no catálogo do Mercado Livre nem nos produtos cadastrados neste perfil.' };

  const variants = [...new Set([ean, ean.padStart(14, '0'), ean.replace(/^0+/, '')].filter(Boolean))];
  const { data, error } = await db.from('vendas_mobile_catalogo_produtos')
    .select('id,catalogo_id,nome,marca,descricao,imagem_url,codigo_barras')
    .in('catalogo_id', catalogIds)
    .in('codigo_barras', variants)
    .eq('ativo', true);
  if (error) return { status: 'not_found', candidates: [], notice: 'Não foi possível consultar os produtos cadastrados neste perfil agora.' };

  const products = (data || []).flatMap((row) => {
    const product = profileProduct(row as Record<string, unknown>);
    return product ? [product] : [];
  });
  const candidates = products.map(({ id, name, domainId, picture, source }) => ({ id, name, domainId, picture, source }));
  if (!products.length) return { status: 'not_found', candidates: [], notice: 'EAN não localizado no catálogo do Mercado Livre nem nos produtos cadastrados neste perfil.' };

  const requested = safeText(selectedId, 90);
  const product = requested ? products.find((candidate) => candidate.id === requested) : products.length === 1 ? products[0] : undefined;
  if (!product) return { status: 'choose', candidates, notice: 'Mais de um produto deste perfil usa este EAN. Escolha o cadastro correto para continuar.' };
  return { status: 'found', candidates, product, notice: 'EAN localizado nos produtos cadastrados neste perfil. Revise a categoria e os dados exigidos pelo Mercado Livre antes de publicar.' };
}

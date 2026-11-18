import sharp from 'sharp';
import {createHash} from 'node:crypto';
export {DEFAULT_KEYS,validateCompanyFiscalDefaults} from './fiscal-defaults-validation.mjs';
import {validateCompanyFiscalDefaults} from './fiscal-defaults-validation.mjs';
export const defaultsVersion=value=>createHash('sha256').update(JSON.stringify(Object.entries(value||{}).sort(([a],[b])=>a.localeCompare(b)))).digest('hex');
import {normalizeCompanyFiscalDefaults} from './fiscal-tax-options.mjs';
export function createCompanyFiscalDefaultsRepository(pool){
 const read=async companyId=>{const result=await pool.query('select regime_tributario,configuracao_fiscal,atualizado_em from public.cadastros_perfil where empresa_id=$1',[companyId]);const row=result.rows[0];if(!row)throw Error('NOT_FOUND');return row;};
 return {
  async load(companyId){const row=await read(companyId);const values=normalizeCompanyFiscalDefaults(row.configuracao_fiscal);if(!values.cfop_venda_interna||!values.cfop_venda_interestadual){const result=await pool.query("select matriz from public.vendas_fiscal_configuracoes where empresa_id=$1 and situacao='publicada'",[companyId]);const matrix=result.rows[0]?.matriz;if(matrix?.reviewedBy&&matrix?.reviewedAt){for(const [key,destination,prefix]of [['cfop_venda_interna','Dentro da UF','5'],['cfop_venda_interestadual','Fora da UF','6']]){const codes=[...new Set((matrix.rules||[]).filter(rule=>rule.active&&rule.reviewed&&rule.documentType==='nfe'&&rule.operation==='Venda'&&rule.destination===destination&&rule.cfopOverride?.startsWith(prefix)).map(rule=>rule.cfopOverride))];if(!values[key]&&codes.length===1)values[key]=codes[0];}}}return{values,regime:row.regime_tributario||'',updatedAt:row.atualizado_em||'',version:defaultsVersion(row.configuracao_fiscal)};},
  async save(companyId,values,expectedVersion){const error=validateCompanyFiscalDefaults(values);if(error)throw Error(error);const row=await read(companyId);if(defaultsVersion(row.configuracao_fiscal)!==expectedVersion)throw Error('CONFLICT');const result=await pool.query('update public.cadastros_perfil set configuracao_fiscal=coalesce(configuracao_fiscal,\'{}\'::jsonb)||$2::jsonb,atualizado_em=now() where empresa_id=$1 and configuracao_fiscal is not distinct from $3::jsonb returning configuracao_fiscal,regime_tributario,atualizado_em',[companyId,JSON.stringify(values),row.configuracao_fiscal==null?null:JSON.stringify(row.configuracao_fiscal)]);if(!result.rows[0])throw Error('CONFLICT');const saved=result.rows[0];return{values:normalizeCompanyFiscalDefaults(saved.configuracao_fiscal),regime:saved.regime_tributario||'',updatedAt:saved.atualizado_em,version:defaultsVersion(saved.configuracao_fiscal)};}
 };
}
/** Same authenticated profile writer as Gestão, without broadening the fiscal DB role. */
export async function saveCompanyFiscalDefaultsWithAdmin({client,companyId,values,version}){
 const validation=validateCompanyFiscalDefaults(values);if(validation)throw Error(validation);
 if(values.danfe_logo&&values.danfe_logo!=='__blank__'){const bytes=Buffer.from(values.danfe_logo.split(',')[1],'base64');if(bytes.length>250*1024)throw Error('Logo muito grande.');const image=await sharp(bytes,{limitInputPixels:16_000_000}).metadata();if(!['png','jpeg','webp'].includes(image.format))throw Error('Logo inválido.');}
 const {data:row,error}=await client.from('cadastros_perfil').select('configuracao_fiscal,regime_tributario,atualizado_em').eq('empresa_id',companyId).maybeSingle();
 if(error||!row)throw Error('NOT_FOUND');if(defaultsVersion(row.configuracao_fiscal)!==version)throw Error('CONFLICT');
 let update=client.from('cadastros_perfil').update({configuracao_fiscal:{...(row.configuracao_fiscal||{}),...values},atualizado_em:new Date().toISOString()}).eq('empresa_id',companyId);
 update=row.configuracao_fiscal==null?update.is('configuracao_fiscal',null):update.eq('configuracao_fiscal',JSON.stringify(row.configuracao_fiscal));
 const result=await update.select('configuracao_fiscal,regime_tributario,atualizado_em').maybeSingle();
 if(result.error)throw Error('STORAGE');if(!result.data)throw Error('CONFLICT');const saved=result.data;
 return {values:normalizeCompanyFiscalDefaults(saved.configuracao_fiscal),regime:saved.regime_tributario||'',updatedAt:saved.atualizado_em,version:defaultsVersion(saved.configuracao_fiscal)};
}

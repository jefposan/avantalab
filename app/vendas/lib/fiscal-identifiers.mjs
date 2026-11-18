import {sanitizarCnpj} from '../../../lib/consultas/validators/cnpj.ts';
// NT Conjunta DFe 2025.001: letras somente nas primeiras 12 posições do CNPJ.
export const NFE_ACCESS_KEY_PATTERN='[0-9]{6}[A-Z0-9]{12}[0-9]{26}';
export const NFE_ACCESS_KEY_RE=new RegExp(`^${NFE_ACCESS_KEY_PATTERN}$`);
export const CNPJ_FISCAL_RE=/^[A-Z0-9]{12}[0-9]{2}$/;
export const normalizeFiscalDocument=value=>sanitizarCnpj(String(value??''));
// Uma chave interna não é uma entrada mascarada. Não descartar nem converter caracteres.
export const normalizeNfeAccessKey=value=>String(value??'').trim();
export function isNfeAccessKey(value){return NFE_ACCESS_KEY_RE.test(String(value??''));}
export function nfeAccessKeyDigit(base){
 const normalized=String(base??'');
 if(!/^[0-9]{6}[A-Z0-9]{12}[0-9]{25}$/.test(normalized))throw Error('A base da chave deve possuir 43 posições válidas.');
 let sum=0,weight=2;
 for(let i=normalized.length-1;i>=0;i--){sum+=(normalized.charCodeAt(i)-48)*weight;weight=weight===9?2:weight+1;}
 const result=11-(sum%11);return result>=10?'0':String(result);
}
export function hasValidNfeAccessKeyDigit(value){return isNfeAccessKey(value)&&nfeAccessKeyDigit(value.slice(0,43))===value[43];}

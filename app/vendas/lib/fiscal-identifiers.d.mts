export const NFE_ACCESS_KEY_PATTERN:string;
export const NFE_ACCESS_KEY_RE:RegExp;
export const CNPJ_FISCAL_RE:RegExp;
export function normalizeFiscalDocument(value:unknown):string;
export function normalizeNfeAccessKey(value:unknown):string;
export function isNfeAccessKey(value:unknown):boolean;
export function nfeAccessKeyDigit(base:string):string;
export function hasValidNfeAccessKeyDigit(value:string):boolean;

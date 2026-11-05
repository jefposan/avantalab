import type {MarketplaceId} from './types';
export const MARKETPLACE_OPERATIONS=['listings','listingRead','listingEdit','pause','resume','close','delete','stockRead','stockWrite','orders','postSale','labels','fees'] as const;
export type MarketplaceOperation=typeof MARKETPLACE_OPERATIONS[number];
export type OperationSupport='api'|'portal'|'unavailable';
export type IntegrationCapabilities=Record<MarketplaceOperation,OperationSupport>;
const unavailable=Object.fromEntries(MARKETPLACE_OPERATIONS.map(key=>[key,'unavailable'])) as IntegrationCapabilities;
/** Mesmo contrato/permissão interna. O adaptador declara diferenças reais, nunca sucesso fictício. */
export function marketplaceCapabilities(provider:MarketplaceId|string):IntegrationCapabilities{
 if(provider==='mercado_livre')return{...unavailable,listings:'api',listingRead:'api',listingEdit:'api',pause:'api',resume:'api',close:'api',delete:'api',stockRead:'api',stockWrite:'api',orders:'api',postSale:'api',labels:'api',fees:'api'};
 if(provider==='magalu')return{...unavailable,listings:'api',listingRead:'api',listingEdit:'api',pause:'api',resume:'api',stockRead:'api',stockWrite:'api',orders:'api',postSale:'api',labels:'portal',fees:'unavailable'};
 return{...unavailable};
}
export const marketplaceIntegrated=(provider:string)=>['mercado_livre','magalu'].includes(provider);

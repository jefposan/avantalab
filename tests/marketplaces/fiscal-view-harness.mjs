import { registerHooks } from 'node:module';
import { pathToFileURL } from 'node:url';
import { dirname,resolve } from 'node:path';
import { existsSync,readFileSync } from 'node:fs';
import ts from 'typescript';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
const root=resolve(import.meta.dirname,'../..');
const hooks=registerHooks({resolve(specifier,context,next){
 if(specifier.endsWith('.module.css'))return{url:'data:text/javascript,export default new Proxy({}, {get:(_,key)=>key});',shortCircuit:true};
 if(specifier==='./Anunciados')return{url:'data:text/javascript,export async function marketplaceClientRequest(){throw Error("Somente prévia local");}',shortCircuit:true};
 const candidate=specifier.startsWith('@/')?resolve(root,specifier.slice(2)):specifier.startsWith('.')&&context.parentURL?.startsWith('file:')?resolve(dirname(new URL(context.parentURL).pathname),specifier):null;
 for(const ext of ['.tsx','.ts'])if(candidate&&existsSync(candidate+ext))return next(pathToFileURL(candidate+ext).href,context);
 return next(specifier,context);
},load(url,context,next){if(url.startsWith('file:')&&url.endsWith('.tsx'))return{format:'module',shortCircuit:true,source:ts.transpileModule(readFileSync(new URL(url),'utf8'),{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.ESNext}}).outputText};return next(url,context);}});
const {default:Documents}=await import('../../app/marketplaces/SaleFiscalDocuments.tsx');
hooks.deregister();
export function renderFiscal(sale={},canManage=true){return renderToStaticMarkup(React.createElement(Documents,{sale:{id:'sale',connectionId:'connection',orderId:'2000019139347426',status:'paid',shipmentStatus:'ready_to_ship',shipmentSubstatus:'invoice_pending',labelStatus:'unavailable',...sale},companyId:'company',canManage,dark:false,brand:'#cf0201',onSaleUpdated(){}}));}

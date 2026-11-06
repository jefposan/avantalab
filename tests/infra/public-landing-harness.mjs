import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {createRequire} from 'node:module';
import ts from 'typescript';
import React from 'react';
import * as downloads from '../../app/lib/avantavendas-download.ts';
const require=createRequire(import.meta.url);
export function loadPublicLanding(source,{shared}={}){
 const exports={};const defaultModule=defaultExport=>({__esModule:true,default:defaultExport});
 const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true,target:ts.ScriptTarget.ES2022}}).outputText;
 runInNewContext(code,{exports,require(name){
  if(name==='react/jsx-runtime')return require(name);
  if(name==='next/image')return defaultModule(({src,alt})=>React.createElement('img',{src,alt}));
  if(name==='next/link')return defaultModule(({href,children,className})=>React.createElement('a',{href,className},children));
  if(name.endsWith('avantavendas-download'))return downloads;
  if(name.endsWith('/AvantaLandingPage'))return {AvantaLandingPage:shared};
  if(name.endsWith('.module.css'))return defaultModule(new Proxy({},{get:(_,key)=>String(key)}));
  const id=name.split('/').at(-1);return defaultModule(({children})=>React.createElement('div',{'data-component':id},children));
 }});return exports;
}
export const readPublicSource=path=>readFileSync(new URL('../../'+path,import.meta.url),'utf8');

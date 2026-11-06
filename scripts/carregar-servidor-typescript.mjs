import {registerHooks,createRequire} from 'node:module';
import {readFileSync,existsSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {pathToFileURL} from 'node:url';
import ts from 'typescript';
const root=resolve(import.meta.dirname,'..'),requireModule=createRequire(import.meta.url);
const special=new Map(['next/server','next/headers','next/cache'].map(name=>[name,pathToFileURL(requireModule.resolve(name)).href]));
const serverMarker=pathToFileURL(requireModule.resolve('next/dist/compiled/server-only/empty.js')).href;
// Same server-only marker Next uses in the server build; no authentication module is mocked.
registerHooks({resolve(specifier,context,next){
 if(specifier==='server-only')return {url:serverMarker,shortCircuit:true};
 if(special.has(specifier))return {url:special.get(specifier),shortCircuit:true};
 let candidate;if(specifier.startsWith('@/'))candidate=resolve(root,specifier.slice(2));else if(specifier.startsWith('.')&&context.parentURL?.startsWith('file:'))candidate=resolve(dirname(new URL(context.parentURL).pathname),specifier);
 if(candidate&&!existsSync(candidate))for(const ext of ['.ts','.tsx'])if(existsSync(candidate+ext))return next(pathToFileURL(candidate+ext).href,context);
 return next(specifier,context);
},load(url,context,next){if(url.startsWith('file:')&&/\.tsx?$/.test(new URL(url).pathname))return {format:'module',shortCircuit:true,source:ts.transpileModule(readFileSync(new URL(url),'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}).outputText};return next(url,context);}});

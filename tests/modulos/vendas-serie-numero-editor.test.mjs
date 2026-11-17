import test from 'node:test';
import assert from 'node:assert/strict';
import {PGlite} from '@electric-sql/pglite';
import {syncFiscalNoteNumbering} from '../../app/vendas/lib/fiscal-note-editor.mjs';
import {createFiscalEditorSettingsRepository} from '../../app/vendas/lib/server/fiscal-editor-settings.mjs';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
import vm from 'node:vm';

test('configuração recebida após abrir preenche série/número sem sobrescrever série manual ou reserva',()=>{
 const blank={series:'',number:'',purpose:'1'};
 const config={series:'1',number:'45'};
 assert.deepEqual(syncFiscalNoteNumbering(blank,config),{...blank,series:'1',number:'45'});
 assert.deepEqual(syncFiscalNoteNumbering({series:'2',number:'45'},config,{seriesEdited:true}),{series:'2',number:''});
 assert.deepEqual(syncFiscalNoteNumbering({series:'001',number:''},config,{seriesEdited:true}),{series:'001',number:'45'});
 assert.deepEqual(syncFiscalNoteNumbering({series:'1',number:'12'},config,{reserved:true}),{series:'1',number:'12'});
 assert.deepEqual(syncFiscalNoteNumbering(blank,{series:'',number:''}),blank);
});

test('editor consulta sequência do perfil/estabelecimento/ambiente sem escrever ou reservar',async()=>{
 const db=new PGlite();const company='10000000-0000-4000-8000-000000000001',other='20000000-0000-4000-8000-000000000001';
 try{
 await db.exec(`create schema fiscal_private;
 create table fiscal_private.number_sequences(company_id uuid,establishment_id uuid,document_type text,environment text,series text,next_number int,active bool,updated_at timestamptz default now());
 create table fiscal_private.number_reservations(company_id uuid,establishment_id uuid,document_type text,environment text,series text,number int,status text);
 create table fiscal_private.number_voids(company_id uuid,establishment_id uuid,document_type text,environment text,series text,start_number int,end_number int,status text);`);
 await db.query(`insert into fiscal_private.number_sequences(company_id,establishment_id,document_type,environment,series,next_number,active) values($1,$1,'nfe','producao','001',45,true),($1,$1,'nfe','homologacao','2',900,true),($2,$2,'nfe','producao','3',800,true)`,[company,other]);
 await db.query(`insert into fiscal_private.number_reservations values($1,$1,'nfe','producao','001',20,'released'),($1,$1,'nfe','producao','001',21,'released')`,[company]);
 await db.query(`insert into fiscal_private.number_voids values($1,$1,'nfe','producao','001',20,20,'authorized')`,[company]);
 const statements=[];
 const pool={query:(sql,args)=>{statements.push(sql);return sql.includes('from fiscal_private.number_sequences')?db.query(sql,args):Promise.resolve({rows:[]});}};
 const repo=createFiscalEditorSettingsRepository({pool,issuerResolver:async()=>({establishmentId:company}),environment:'producao'});
 const result=await repo.load(company);assert.equal(result.series,'1');assert.equal(result.number,'21');
 assert.equal(statements.some(s=>/\b(insert|update|delete)\s/i.test(s)),false);
 assert.equal((await db.query('select count(*)::int n from fiscal_private.number_reservations')).rows[0].n,2);
 const demo=await createFiscalEditorSettingsRepository({pool,issuerResolver:async()=>({establishmentId:company})}).load(company);assert.equal(demo.series,'2');assert.equal(demo.number,'900');
 }finally{await db.close();}
});

test('campos reais conservam série editável e número somente leitura, sem autocomplete',()=>{
 const source=readFileSync('app/vendas/components/FiscalNoteBlocks.tsx','utf8');const ast=ts.createSourceFile('fields.tsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
 const fn=ast.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text==='NoteOperationFields').getText(ast);
 const jsx=(type,props)=>({type,props});const scope={exports:{},require:()=>({jsx,jsxs:jsx,Fragment:'fragment'}),Block:'Block',Field:'Field',Options:'Options',NOTE_PURPOSES:[]};
 vm.runInNewContext(ts.transpileModule(fn+'\nexports.render=NoteOperationFields;',{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS}}).outputText,scope);
 const tree=scope.exports.render({value:{series:'1',number:'45',purpose:'1'},onChange:()=>{},nature:'Venda',natures:['Venda'],onNature:()=>{}});
 const nodes=t=>!t||typeof t!=='object'?[]:Array.isArray(t)?t.flatMap(nodes):[t,...nodes(t.props?.children)];
 const series=nodes(tree).find(n=>n.props?.name==='series'),number=nodes(tree).find(n=>n.props?.name==='number');
 assert.equal(series.props.value,'1');assert.equal(typeof series.props.onChange,'function');assert.equal(series.props.autoComplete,'off');
 assert.equal(number.props.value,'45');assert.equal(number.props.readOnly,true);assert.equal(number.props.onChange,undefined);
});

test('retomada sem reserva mostra série 1 e próximo número 2; reserva real mantém o número atribuído',async()=>{
 const {newFiscalNoteFields,updateFiscalNoteFields}=await import('../../app/vendas/lib/fiscal-note-editor.mjs');
 const source=readFileSync('app/vendas/sistema/VendasServicosPrototype.tsx','utf8'),ast=ts.createSourceFile('view.tsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
 const fn=ast.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text==='NewOrderView');
 const reserved=fn.body.statements.find(n=>ts.isVariableStatement(n)&&n.declarationList.declarations.some(d=>d.name.getText(ast)==='noteNumberReserved'));
 const state=fn.body.statements.find(n=>ts.isVariableStatement(n)&&n.getText(ast).includes('[noteFields,setNoteFields]'));
 const effect=fn.body.statements.find(n=>ts.isExpressionStatement(n)&&n.getText(ast).startsWith('useEffect(')&&n.getText(ast).includes('syncFiscalNoteNumbering'));
 for(const [number,series,expected]of [[0,'','2'],[8,'1','8']]){
  let value,update;const scope={exports:{},Number,Boolean,String,newFiscalNoteFields,updateFiscalNoteFields,syncFiscalNoteNumbering,correction:{status:{series,number}},fiscalEditor:{series:'1',number:'2',clientPriceTables:{}},clientRecords:[],initialClient:'',initialRecord:{order:{fiscalForm:{series:'1',number:'1'}}},seriesEditedRef:{current:true},useState:fn=>{value=fn();return[value,next=>{value=next(value);}];},useEffect:fn=>update=fn};
  vm.runInNewContext(ts.transpileModule(reserved.getText(ast)+'\n'+state.getText(ast)+'\n'+effect.getText(ast),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,scope);
  assert.equal(value.series,'1');assert.equal(value.number,expected);
  scope.fiscalEditor.number='9';update();assert.equal(value.number,number?'8':'9');
 }
});

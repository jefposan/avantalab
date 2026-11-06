import ts from 'typescript';
const parse=source=>ts.createSourceFile('landing.tsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
const imported=(ast,path,name,isDefault=false)=>ast.statements.some(n=>ts.isImportDeclaration(n)&&n.moduleSpecifier.text===path&&(isDefault?n.importClause?.name?.text===name:n.importClause?.namedBindings&&ts.isNamedImports(n.importClause.namedBindings)&&n.importClause.namedBindings.elements.some(e=>e.name.text===name&&(!e.propertyName||e.propertyName.text===name))));
function returned(fn){
 if(!fn?.body||fn.body.statements.length!==1||!ts.isReturnStatement(fn.body.statements[0]))return null;
 let value=fn.body.statements[0].expression;while(value&&ts.isParenthesizedExpression(value))value=value.expression;return value;
}
function delegates(source,path){
 const ast=parse(source);if(ast.parseDiagnostics.length||!imported(ast,path,'AvantaLandingPage'))return false;
 const page=ast.statements.find(n=>ts.isFunctionDeclaration(n)&&n.modifiers?.some(m=>m.kind===ts.SyntaxKind.DefaultKeyword));const value=returned(page);
 return !!value&&ts.isJsxSelfClosingElement(value)&&value.tagName.getText(ast)==='AvantaLandingPage';
}
/** Confere os arquivos efetivamente usados pelas rotas. A proteção é irmã do
 * conteúdo, incondicional e anterior ao main; guardas ausentes também falham. */
export function publicLandingProtection({home,finance,component}){
 if(!delegates(home,'./components/AvantaLandingPage')||!delegates(finance,'../components/AvantaLandingPage'))return false;
 const ast=parse(component);if(ast.parseDiagnostics.length||!imported(ast,'./RedirecionamentoPosOAuth','RedirecionamentoPosOAuth',true))return false;
 const fn=ast.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text==='AvantaLandingPage'&&n.modifiers?.some(m=>m.kind===ts.SyntaxKind.ExportKeyword));const value=returned(fn);
 if(!value||!ts.isJsxFragment(value))return false;
 const nodes=value.children.filter(n=>!ts.isJsxText(n)||n.text.trim());
 return nodes.length===2&&ts.isJsxSelfClosingElement(nodes[0])&&nodes[0].tagName.getText(ast)==='RedirecionamentoPosOAuth'&&ts.isJsxElement(nodes[1])&&nodes[1].openingElement.tagName.getText(ast)==='main';
}

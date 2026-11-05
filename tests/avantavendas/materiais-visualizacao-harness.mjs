import { readFileSync } from 'node:fs';
import ts from 'typescript';
const fonte = readFileSync(new URL('../../app/avantavendas/sistema/app.js', import.meta.url), 'utf8');
const ast = ts.createSourceFile('app.js', fonte, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
const nomes = ['svgIcon', 'svgIconEstavel', 'conteudoVisualizadorMaterialDivulgacao', 'navegarMaterialDivulgacao', 'alternarMaterialExpandido', 'alternarPdfTelaCheia'];
const trechos = ast.statements.filter(s => (ts.isFunctionDeclaration(s) && nomes.includes(s.name?.text)) || (ts.isVariableStatement(s) && s.declarationList.declarations.some(d => d.name.getText(ast) === 'ICONES_SVG_ESTAVEIS')));
if (trechos.length !== nomes.length + 1) throw new Error('Função do visualizador não localizada.');
export const roteiroVisualizadorMateriais = `
var spriteIconesEstavelPronto = false;
var divulgacaoMaterialAtualId = 'imagem-2', ignorarCliqueMaterialDivulgacaoAte = 0;
var materiaisQa = ['imagem','imagem','video','pdf','imagem'].map((tipo,i)=>({id: ['imagem-1','imagem-2','video','pdf','imagem-3'][i],tipo,titulo:tipo==='pdf'?'Catálogo de teste':'arquivo-interno-'+i,arquivo_url:tipo==='video'?'/video.mp4':tipo==='pdf'?'/catalogo.pdf':'/poster.svg'}));
var chamadasQa = [];
function listarMateriaisVisiveisDivulgacao(){return materiaisQa;}
function escapeHtml(v){return String(v ?? '').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');}
var escapeAttr = escapeHtml;
function encerrarRenderizacaoPdfMaterial(){chamadasQa.push('encerrar-pdf');}
async function carregarPdfMaterialDivulgacao(){chamadasQa.push('carregar-pdf');}
async function prepararCompartilhamentoMaterialDivulgacao(id){chamadasQa.push('preparar:'+id);}
function reconstruirVisualizacaoPdfMaterial(container, pagina){chamadasQa.push('pagina:'+pagina);}
${trechos.map(s => s.getText(ast)).join('\n')}
`;

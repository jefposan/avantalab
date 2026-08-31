import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const raiz = new URL('../..', import.meta.url);

test('dashboard móvel usa uma única coluna que não cresce com o conteúdo', async () => {
  const mobile = await readFile(new URL('public/mobile-app.js', raiz), 'utf8');

  assert.match(
    mobile,
    /id="mobile-main-scroll"[\s\S]*?class="mx-auto grid w-full min-w-0 max-w-md grid-cols-1 gap-3 px-3 pt-11 sm:px-4"/,
    'a grade principal deve usar uma coluna com trilha limitada à largura disponível',
  );
  assert.match(
    mobile,
    /data-dashboard-card="'[\s\S]*?class="relative min-w-0 max-w-full pb-2 transition-\[transform,opacity,filter\] duration-200 ease-out"/,
    'cada card deve poder encolher sem criar rolagem horizontal',
  );
  const nomesEmDuasLinhas = mobile.match(/line-clamp-2 break-words text-sm font-bold leading-tight text-slate-800/g) || [];
  assert.equal(
    nomesEmDuasLinhas.length,
    2,
    'as listas de receitas e despesas devem permitir duas linhas para o nome',
  );
  assert.match(
    mobile,
    /<div class="min-w-0 flex-1"><p class="line-clamp-2 break-words text-sm font-bold leading-tight text-slate-800">[\s\S]*?<p class="line-clamp-2 break-words text-xs leading-tight text-slate-500">/,
    'nome e observação devem compartilhar a área flexível, sem disputar o valor',
  );
  assert.match(mobile, /<strong class="shrink-0 text-sm font-black text-emerald-600">/);
});

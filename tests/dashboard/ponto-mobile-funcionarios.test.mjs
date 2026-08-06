import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('Ver controle de ponto lista todos os funcionarios ativos', async () => {
  const mobile = await readFile(
    new URL('../../public/mobile-app.js', import.meta.url),
    'utf8',
  );

  const carga = mobile.match(
    /async function carregarResumoPontoMobile[\s\S]*?\n  function configurarRealtimePontoMobile/,
  )?.[0] || '';
  const relatorio = mobile.match(
    /function pontoRelatorioMobileHtml[\s\S]*?\n  function homeHtml/,
  )?.[0] || '';

  assert.match(carga, /var funcionariosAtivos =/);
  assert.match(carga, /state\.pontoFuncionarios = funcionariosAtivos\.map/);
  assert.match(carga, /status: resumoPorUsuario\[funcionario\.user_id\] \|\|/);
  assert.match(carga, /'em_dia' : 'sem_jornada'/);

  assert.match(relatorio, /var funcionarios = state\.pontoFuncionarios \|\| \[\]/);
  assert.match(relatorio, /funcionarios\.length \? funcionarios\.map/);
  assert.doesNotMatch(relatorio, /state\.pontoResumo\.length \? state\.pontoResumo\.map/);
  assert.match(relatorio, /em_dia: \['Em dia'/);
  assert.match(relatorio, /sem_jornada: \['Sem jornada hoje'/);
});

import { cpSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const origem = resolve('vendas_mobile/app');
const destino = resolve('public/vendas-mobile');

mkdirSync(destino, { recursive: true });
cpSync(origem, destino, { recursive: true, force: true });

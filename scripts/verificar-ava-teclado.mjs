import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const raiz = resolve(import.meta.dirname, '..');
const [chat, estilos] = await Promise.all([
  readFile(resolve(raiz, 'app/mobile/ava/AvaChatClient.tsx'), 'utf8'),
  readFile(resolve(raiz, 'app/mobile/ava/ava-chat.module.css'), 'utf8'),
]);

const falhas = [];
const exigir = (condicao, mensagem) => {
  if (!condicao) falhas.push(mensagem);
};

exigir(
  chat.includes('const syncNativeKeyboardInset = () => {')
    && chat.includes('if (!virtualKeyboard) {')
    && chat.includes("shell.style.setProperty('--ava-keyboard-inset', '0px')")
    && chat.includes('virtualKeyboard.boundingRect?.height || 0')
    && !chat.includes('window.visualViewport?.addEventListener')
    && !chat.includes('layoutHeight - visibleHeight'),
  'A Ava deve usar inset manual somente com VirtualKeyboard, sem duplicar a medição do viewport dinâmico.',
);

exigir(
  chat.includes('onFocus={(event) => {')
    && !chat.includes('onPointerDown={(event) => {')
    && !chat.includes('textarea.focus({ preventScroll: true })'),
  'O campo da Ava deve preservar o foco nativo do teclado, sem cancelar o toque no iOS.',
);

exigir(
  estilos.includes('height: 100dvh;')
    && estilos.includes('padding-bottom: var(--ava-keyboard-inset);'),
  'O chat da Ava deve manter viewport dinâmica para Safari, PWA e navegadores sem VirtualKeyboard.',
);

if (falhas.length) {
  throw new Error(`Teclado da Ava inválido:\n- ${falhas.join('\n- ')}`);
}

console.log('Teclado da Ava validado para viewport dinâmica e VirtualKeyboard.');

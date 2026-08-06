export const AVA_KEYBOARD_MINIMUM_INSET = 96;

export type AvaKeyboardViewportState = {
  baselineHeight: number;
  layoutWidth: number;
  keyboardInset: number;
};

export type AvaKeyboardViewportSample = {
  visualHeight: number;
  layoutHeight: number;
  layoutWidth: number;
  virtualKeyboardHeight: number;
  textareaFocused: boolean;
  touchCapable: boolean;
};

export const EMPTY_AVA_KEYBOARD_VIEWPORT_STATE: AvaKeyboardViewportState = {
  baselineHeight: 0,
  layoutWidth: 0,
  keyboardInset: 0,
};

function validDimension(value: number) {
  return Number.isFinite(value) && value > 0 ? value : 0;
}

function roundedDimension(value: number) {
  return Math.round(Math.max(0, validDimension(value)));
}

export function initializeAvaKeyboardViewport(
  sample: AvaKeyboardViewportSample,
): AvaKeyboardViewportState {
  const visualHeight = validDimension(sample.visualHeight)
    || validDimension(sample.layoutHeight);

  return {
    baselineHeight: roundedDimension(visualHeight),
    layoutWidth: roundedDimension(sample.layoutWidth),
    keyboardInset: 0,
  };
}

export function prepareAvaKeyboardViewportForFocus(
  state: AvaKeyboardViewportState,
  visualHeight: number,
  layoutWidth: number,
): AvaKeyboardViewportState {
  if (state.keyboardInset >= AVA_KEYBOARD_MINIMUM_INSET) return state;

  return {
    ...state,
    baselineHeight: roundedDimension(visualHeight) || state.baselineHeight,
    layoutWidth: roundedDimension(layoutWidth) || state.layoutWidth,
  };
}

export function synchronizeAvaKeyboardViewport(
  state: AvaKeyboardViewportState,
  sample: AvaKeyboardViewportSample,
): AvaKeyboardViewportState {
  const visualHeight = validDimension(sample.visualHeight)
    || validDimension(sample.layoutHeight);
  const layoutHeight = Math.max(
    visualHeight,
    validDimension(sample.layoutHeight),
  );
  const layoutWidth = validDimension(sample.layoutWidth) || state.layoutWidth;
  const orientationChanged = state.layoutWidth > 0
    && layoutWidth > 0
    && Math.abs(layoutWidth - state.layoutWidth) > 1;
  let baselineHeight = validDimension(state.baselineHeight) || visualHeight;

  if (orientationChanged) baselineHeight = layoutHeight;

  const virtualKeyboardHeight = roundedDimension(sample.virtualKeyboardHeight);
  const inferredInset = roundedDimension(baselineHeight - visualHeight);
  const keyboardWasOrIsActive = sample.textareaFocused
    || state.keyboardInset >= AVA_KEYBOARD_MINIMUM_INSET
    || virtualKeyboardHeight >= AVA_KEYBOARD_MINIMUM_INSET;
  const keyboardInset = virtualKeyboardHeight > 0
    ? virtualKeyboardHeight
    : sample.touchCapable
      && keyboardWasOrIsActive
      && inferredInset >= AVA_KEYBOARD_MINIMUM_INSET
      ? inferredInset
      : 0;

  // Fora da digitação, mudanças do navegador (barra de endereço, rotação ou
  // redimensionamento desktop) formam a próxima referência sem parecer teclado.
  if (!sample.textareaFocused && keyboardInset === 0) {
    baselineHeight = visualHeight;
  }

  return {
    baselineHeight: roundedDimension(baselineHeight),
    layoutWidth: roundedDimension(layoutWidth),
    keyboardInset,
  };
}

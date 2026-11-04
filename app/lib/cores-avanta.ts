/** Texto de maior contraste WCAG sobre uma cor hexadecimal opaca. */
export function corTextoSobreFundo(cor: string): '#000000' | '#ffffff' {
  let hex = cor.trim().replace(/^#/, '');
  if (/^[a-f\d]{3}$/i.test(hex)) hex = [...hex].map(c => c + c).join('');
  if (!/^[a-f\d]{6}$/i.test(hex)) hex = '003e73';
  const channels = [0, 2, 4].map(i => parseInt(hex.slice(i, i + 2), 16) / 255).map(n => n <= .04045 ? n / 12.92 : ((n + .055) / 1.055) ** 2.4);
  const luminance = channels[0] * .2126 + channels[1] * .7152 + channels[2] * .0722;
  return (luminance + .05) / .05 >= 1.05 / (luminance + .05) ? '#000000' : '#ffffff';
}

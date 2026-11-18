// Espelha apenas os bloqueios já existentes no gerador. Não escolhe tributos.
export function emitterTaxOptions(kind, options) {
  return options.map(option => {
    const supported=kind==='csosn'?option.value==='102':kind==='icms'?false:!['01','02','03'].includes(option.value);
    return supported?option:{...option,disabled:true,label:`${option.label} — ainda sem suporte no emissor`};
  });
}

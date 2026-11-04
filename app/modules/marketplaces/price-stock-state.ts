const units = new Intl.NumberFormat('pt-BR');

export function priceStockState(stock: { confirmed: boolean; quantity: number | null }) {
  const quantity = stock.quantity ?? 0;
  const available = quantity > 0;
  return {
    available,
    title: stock.quantity == null ? 'Estoque não informado' : available ? 'Já em estoque' : 'Sem estoque',
    detail: `${units.format(quantity)} unidade${quantity === 1 ? '' : 's'}`,
    action: available ? 'Editar' : 'Ajustar estoque',
    minimum: 0,
  };
}

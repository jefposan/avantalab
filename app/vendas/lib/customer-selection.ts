type ClienteBusca = { id: string; name: string; legalName: string; document: string; status?: string };

export function opcoesClientePedido(clientes: ClienteBusca[]) {
  return clientes.map(cliente => {
    const razaoSocial = String(cliente.legalName || '').trim() || cliente.name;
    return {
      value: cliente.id,
      label: `${razaoSocial} · ${cliente.document}${cliente.status === 'Inativo' ? ' · Inativo' : ''}`,
      selectedLabel: razaoSocial,
      searchText: `${razaoSocial} ${cliente.document}`,
      disabled: cliente.status === 'Inativo',
    };
  }).sort((a, b) => a.selectedLabel.localeCompare(b.selectedLabel, 'pt-BR'));
}

/** ID confirmado prevalece. Nome ambíguo nunca escolhe outro cadastro. */
export function clienteDoRegistro<T extends ClienteBusca>(clientes: T[], registro: { customerId?: string; persistence?: { customerId?: string }; client?: string }) {
  const id = registro.customerId || registro.persistence?.customerId;
  if (id) return clientes.find(cliente => cliente.id === id);
  const encontrados = clientes.filter(cliente => cliente.name === registro.client || cliente.legalName === registro.client);
  return encontrados.length === 1 ? encontrados[0] : undefined;
}

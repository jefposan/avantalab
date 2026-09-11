export type ServicoRegistroVozCampo = {
  id: string;
  companyId: string;
  subcompanyId: string | null;
  scheduledDate: string;
  status: string;
  serviceType: 'rotina' | 'interna' | 'revisao' | 'extra';
};

function normalizar(value: string) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export function resolverServicoRegistroVoz(input: {
  services: ServicoRegistroVozCampo[];
  companyId: string;
  subcompanyId: string | null;
  today: string;
  serviceType?: 'interna' | 'revisao' | 'extra' | null;
  transcription?: string;
  selectedId?: string | null;
}) {
  const available = input.services
    .filter((item) => item.companyId === input.companyId
      && item.subcompanyId === input.subcompanyId
      && item.scheduledDate <= input.today
      && ['pendente', 'atrasado'].includes(item.status))
    .sort((left, right) => left.scheduledDate.localeCompare(right.scheduledDate)
      || Number(left.serviceType !== 'rotina') - Number(right.serviceType !== 'rotina')
      || left.serviceType.localeCompare(right.serviceType));

  if (input.selectedId) {
    const selected = available.find((item) => item.id === input.selectedId) ?? null;
    if (selected) return { selected, candidates: available };
  }

  const transcription = normalizar(input.transcription || '');
  const requestedType = input.serviceType
    ?? (/\b(rotina|padrao)\b/.test(transcription) ? 'rotina' : null);
  const candidates = requestedType
    ? available.filter((item) => item.serviceType === requestedType)
    : available;
  return {
    selected: candidates.length === 1 ? candidates[0] : null,
    candidates,
  };
}

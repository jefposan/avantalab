'use client';
import { useId, useState, type FormEvent } from 'react';
import { validPricePercentages, validPriceSettings, type PriceSettings, type PriceTheme } from '@/app/modules/marketplaces/price-settings';
import { priceSettingsPath, type PriceSettingsRequest } from './usePriceSettings';
import styles from './marketplaces.module.css';
import BotaoAcaoCompacto from '@/app/components/BotaoAcaoCompacto';
export default function PriceCalculationSettings({ companyId, settings, request, onSaved, onReload }: { companyId: string; settings: PriceSettings; request: PriceSettingsRequest; onSaved: (settings: PriceSettings) => void; onReload?: () => void }) {
  const [values, setValues] = useState(Object.fromEntries(Object.entries(settings.percentages).map(([key, value]) => [key, String(value).replace('.', ',')])));
  const [theme, setTheme] = useState<PriceTheme>(settings.theme);
  const [financeRevenueEnabled, setFinanceRevenueEnabled] = useState(settings.financeRevenueEnabled ?? true);
  const revenueHelpId = useId();
  const [saving, setSaving] = useState(false), [error, setError] = useState('');
  const errorId = useId();
  const [invalidPercentages, setInvalidPercentages] = useState(false);
  async function save(event: FormEvent) {
    event.preventDefault(); if (saving || !settings.storageReady) return;
    const percentages = { minimum: Number(values.minimum.replace(',', '.')), medium: Number(values.medium.replace(',', '.')), ideal: Number(values.ideal.replace(',', '.')) };
    if (!validPricePercentages(percentages)) { setInvalidPercentages(true); setError('Informe percentuais de 0,01% a 1.000%, com até duas casas decimais, em ordem: mínimo ≤ médio ≤ ideal.'); event.currentTarget.querySelector<HTMLInputElement>('input')?.focus(); return; }
    setSaving(true); setError(''); setInvalidPercentages(false);
    try {
      const body = await request(priceSettingsPath, { method: 'PUT', body: JSON.stringify({ empresaId: companyId, percentages, theme, revision: settings.revision, ...(settings.financeRevenueEnabled === undefined ? {} : { financeRevenueEnabled }) }), signal: AbortSignal.timeout(20_000) });
      const saved = body && typeof body === 'object' && 'settings' in body ? body.settings : null;
      if (!validPriceSettings(saved)) throw new Error('A resposta das configurações é inválida. Recarregue para conferir os valores salvos.');
      onSaved(saved);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Não foi possível salvar as configurações.'); }
    finally { setSaving(false); }
  }
  return <form onSubmit={save} className={styles.priceSettingsForm} aria-label="Preços, aparência e faturamento">
    <div className={styles.priceSettingsSectors}>
    <fieldset className={styles.priceSettingsSector}><legend>Preços de venda</legend>
    <div className={styles.pricePercentages}>{(['minimum', 'medium', 'ideal'] as const).map((key, index) => <label key={key}>{['Mínimo (%)', 'Médio (%)', 'Ideal (%)'][index]}<input aria-label={['Percentual mínimo', 'Percentual médio', 'Percentual ideal'][index]} aria-invalid={invalidPercentages || undefined} aria-describedby={invalidPercentages ? errorId : undefined} inputMode="decimal" value={values[key]} onChange={event => setValues(current => ({ ...current, [key]: event.target.value }))} disabled={saving || !settings.storageReady} required maxLength={8} /></label>)}</div>
    </fieldset>
    <fieldset className={styles.priceSettingsSector}><legend>Aparência</legend><div className={styles.priceThemeChoices}>{([['profile', 'Padrão do perfil'], ['light', 'Claro'], ['dark', 'Noturno'], ['system', 'Automático']] as const).map(([mode, label]) => <BotaoAcaoCompacto key={mode} aria-pressed={theme === mode} disabled={saving || !settings.storageReady} onClick={() => setTheme(mode as PriceTheme)}>{label}</BotaoAcaoCompacto>)}</div><p className={styles.help}>Automático segue o tema do aparelho, sem horário fixo.</p></fieldset>
    </div>
    <fieldset className={styles.priceSettingsRevenue}>
      <legend>Faturamento</legend>
      <label><input type="checkbox" checked={financeRevenueEnabled}
        disabled={saving || settings.financeRevenueEnabled === undefined}
        aria-describedby={revenueHelpId}
        onChange={event => setFinanceRevenueEnabled(event.target.checked)} />
        Enviar faturamento para as receitas do mês
      </label>
      <p className={styles.help} id={revenueHelpId}>{settings.financeRevenueEnabled === undefined
        ? 'O envio estará disponível após a atualização do banco.'
        : 'O total bruto aparece na Gestão como “Vendas Mkt Places”. Desligar o envio preserva os valores já lançados.'}</p>
    </fieldset>
    {!settings.storageReady && <p role="alert">A instalação das configurações no banco está pendente. Os percentuais padrão 50%, 70% e 90% continuam ativos; salvar só será liberado após instalar a migração.</p>}
    {error && <div role="alert"><p id={errorId}>{error}</p>{onReload && <><BotaoAcaoCompacto disabled={saving} onClick={onReload}>Recarregar configurações</BotaoAcaoCompacto><p className={styles.help}>Recarregar descarta os campos não salvos e busca os valores atuais.</p></>}</div>}
    <div className={styles.priceSettingsFooter}><p className={styles.help}>Web e AvantaPreços · lotes salvos preservados.</p><BotaoAcaoCompacto variante="primario" type="submit" disabled={saving || !settings.storageReady}>{saving ? 'Salvando…' : 'Salvar configurações'}</BotaoAcaoCompacto></div>
  </form>;
}

'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { validPricePercentages, validPriceSettings, type FinanceRevenueBasis, type PriceSettings, type PriceTheme } from '@/app/modules/marketplaces/price-settings';
import BotaoAcaoCompacto from '@/app/components/BotaoAcaoCompacto';
import { priceSettingsPath, type PriceSettingsRequest } from './usePriceSettings';
import styles from './marketplaces.module.css';

export type SettingsSaveStatus = 'idle' | 'saving' | 'saved' | 'error';
const percentageFields = [['minimum', 'Mínimo (%)'], ['medium', 'Médio (%)'], ['ideal', 'Ideal (%)']] as const;
const themeChoices = [['profile', 'Padrão do perfil'], ['light', 'Claro'], ['dark', 'Noturno'], ['system', 'Automático']] as const;
const revenueChoices = [['gross', 'Bruto'], ['net', 'Líquido']] as const;

export default function PriceCalculationSettings({ companyId, settings, request, onSaved, onReload, onStatus }: {
  companyId: string;
  settings: PriceSettings;
  request: PriceSettingsRequest;
  onSaved: (settings: PriceSettings) => void;
  onReload: () => void;
  onStatus: (status: SettingsSaveStatus) => void;
}) {
  const [values, setValues] = useState(() => ({
    minimum: String(settings.percentages.minimum).replace('.', ','),
    medium: String(settings.percentages.medium).replace('.', ','),
    ideal: String(settings.percentages.ideal).replace('.', ','),
  }));
  const [theme, setTheme] = useState<PriceTheme>(settings.theme);
  const [financeRevenueEnabled, setRevenueEnabled] = useState(settings.financeRevenueEnabled);
  const [financeRevenueBasis, setRevenueBasis] = useState<FinanceRevenueBasis | undefined>(settings.financeRevenueBasis);
  const [error, setError] = useState<{ message: string; conflict: boolean } | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const mounted = useRef(false);
  const errorId = useId();
  const minimum = Number(values.minimum.replace(',', '.'));
  const medium = Number(values.medium.replace(',', '.'));
  const ideal = Number(values.ideal.replace(',', '.'));
  const invalid = !validPricePercentages({ minimum, medium, ideal });
  const { revision, storageReady, percentages } = settings;
  const changed = (!invalid && (minimum !== percentages.minimum || medium !== percentages.medium || ideal !== percentages.ideal))
    || theme !== settings.theme || financeRevenueEnabled !== settings.financeRevenueEnabled
    || financeRevenueBasis !== settings.financeRevenueBasis;

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  useEffect(() => {
    onStatus(error ? 'error' : (saving || changed) ? 'saving' : saved && !invalid ? 'saved' : 'idle');
  }, [changed, error, invalid, onStatus, saved, saving]);

  useEffect(() => {
    if (!changed || saving || error || !storageReady) return;
    const timer = window.setTimeout(async () => {
      setSaving(true);
      try {
        const body = await request(priceSettingsPath, {
          method: 'PUT',
          body: JSON.stringify({
            empresaId: companyId, revision, theme, financeRevenueEnabled, financeRevenueBasis,
            percentages: invalid ? percentages : { minimum, medium, ideal },
          }),
          signal: AbortSignal.timeout(20_000),
        });
        const next = (body as { settings?: unknown })?.settings;
        if (!validPriceSettings(next)) throw new Error('A resposta das configurações é inválida. Recarregue para conferir.');
        if (!mounted.current) return;
        onSaved(next);
        setSaved(true);
      } catch (reason) {
        if (mounted.current) setError({
          message: reason instanceof Error ? reason.message : 'Não foi possível salvar as configurações.',
          conflict: typeof reason === 'object' && reason !== null && 'status' in reason && reason.status === 409,
        });
      } finally {
        if (mounted.current) setSaving(false);
      }
    }, 450);
    return () => window.clearTimeout(timer);
  }, [changed, companyId, error, financeRevenueBasis, financeRevenueEnabled, ideal, invalid, medium, minimum, onSaved, percentages, request, revision, saving, storageReady, theme]);

  return <form onSubmit={event => event.preventDefault()} className={styles.priceSettingsForm} aria-label="Preços, aparência e faturamento">
    <div className={styles.priceSettingsSectors}>
      <fieldset className={styles.priceSettingsSector} disabled={!storageReady}>
        <legend>Preços de venda</legend>
        <div className={styles.pricePercentages}>
          {percentageFields.map(([key, label]) => <label key={key}>{label}
            <input aria-invalid={invalid || undefined} aria-describedby={invalid ? errorId : undefined}
              inputMode="decimal" value={values[key]} maxLength={8} onChange={event => {
                const value = event.target.value;
                setValues(current => ({ ...current, [key]: value }));
              }} />
          </label>)}
        </div>
        {invalid && <p id={errorId} className={styles.help}>Use de 0,01% a 1.000%, com até duas casas decimais, em ordem crescente.</p>}
      </fieldset>
      <fieldset className={styles.priceSettingsSector} disabled={!storageReady}>
        <legend>Aparência</legend>
        <div className={styles.priceThemeChoices}>
          {themeChoices.map(([mode, label]) => <BotaoAcaoCompacto key={mode} aria-pressed={theme === mode} onClick={() => setTheme(mode)}>{label}</BotaoAcaoCompacto>)}
        </div>
        <p className={styles.help}>Automático segue o tema do aparelho, sem horário fixo.</p>
      </fieldset>
    </div>
    <section className={styles.priceSettingsRevenue} aria-labelledby="marketplace-revenue-title">
      <h3 id="marketplace-revenue-title">Faturamento</h3>
      <label className={styles.priceRevenueSwitch}>
        <input type="checkbox" role="switch" checked={financeRevenueEnabled ?? true} disabled={financeRevenueEnabled === undefined}
          onChange={event => setRevenueEnabled(event.target.checked)} />
        <span aria-hidden="true" />
        Enviar para receitas
      </label>
      <div className={styles.priceRevenueChoices} role="group" aria-label="Valor enviado para as receitas">
        {revenueChoices.map(([basis, label]) => <BotaoAcaoCompacto key={basis}
          aria-pressed={(financeRevenueBasis ?? 'gross') === basis}
          disabled={!financeRevenueEnabled || financeRevenueBasis === undefined}
          onClick={() => setRevenueBasis(basis)}>{label}</BotaoAcaoCompacto>)}
      </div>
    </section>
    {!storageReady && <p role="alert">As configurações poderão ser salvas após a atualização do banco.</p>}
    {error && <div role="alert"><p>{error.message}</p>
      {error.conflict ? <BotaoAcaoCompacto onClick={onReload}>Recarregar configurações</BotaoAcaoCompacto>
        : <BotaoAcaoCompacto onClick={() => setError(null)}>Tentar novamente</BotaoAcaoCompacto>}
    </div>}
  </form>;
}

import MarketplaceSelect from './MarketplaceSelect';

export type AccountOption = { id: string; name: string; detail: string };

export default function MarketplaceAccountPicker({ label, value, options, placeholder, disabled = false, onChange }: { label: string; value: string; options: AccountOption[]; placeholder: string; disabled?: boolean; onChange: (id: string) => void }) {
  return <MarketplaceSelect label={label} value={value} options={options.map((option) => ({ value: option.id, label: option.name, detail: option.detail }))} placeholder={placeholder} disabled={disabled} onChange={onChange} />;
}

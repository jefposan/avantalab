export type AccountCleanupOptions = {
  clearNotices: boolean;
  removeListings: boolean;
  removeProducts: boolean;
  archiveAccount: boolean;
};
export const DEFAULT_ACCOUNT_CLEANUP: AccountCleanupOptions = {
  clearNotices: true, removeListings: true, removeProducts: true, archiveAccount: true,
};
export type AccountCleanupReview = {
  companyName: string;
  accountName: string;
  connectionId: string;
  status: string;
  options: AccountCleanupOptions;
  counts: { notices: number; links: number; listings: number; products: number; retainedProducts: number };
  retained: { id: string; name: string; reason: string }[];
  blockers: string[];
  reviewToken: string;
};
export type AccountCleanupResult = {
  counts: AccountCleanupReview['counts'];
  archived: boolean;
  replayed: boolean;
};
export function validAccountCleanupOptions(value: unknown): value is AccountCleanupOptions {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const options = value as AccountCleanupOptions;
  return Object.keys(options).length === 4
    && ['clearNotices', 'removeListings', 'removeProducts', 'archiveAccount'].every(key => typeof options[key as keyof AccountCleanupOptions] === 'boolean')
    && Object.values(options).some(Boolean) && (!options.removeProducts || options.removeListings)
    && (!options.archiveAccount || options.clearNotices);
}

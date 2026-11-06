export function fiscalCorrectionAction(key: string): {label: string; target: string; permission: string};
export function fiscalProductIssues(items: object[], key: string, destination?: string): Array<{target: string; name: string; fields: string[]}>;
export function fiscalItemsForReview<T extends object>(items: T[], catalog: object[], immutable?: boolean): T[];

export function fiscalCheckoutCorrection(result: {code?: string; field?: string}): string;

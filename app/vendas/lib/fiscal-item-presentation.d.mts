export function fiscalOperationCfop(item?: object, destination?: string): string;
export function fiscalItemDetails(item?: object, destination?: string): Array<{label: string; value: string}>;
export function fiscalIbsCbsRequired(input?: {documentType?: string; taxRegime?: string; issueDate?: string}): boolean;

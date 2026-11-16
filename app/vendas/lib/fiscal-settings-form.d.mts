export function validateFiscalSettingsForm(settings:Record<string,any>):{ready:boolean;errors:string[];warnings:string[]};
export function mergeSettingsNumbering<T extends {fiscal:{nfeSeries:string;nfceSeries:string;nfseSeries:string}}>(draft:T,settings:T):T;

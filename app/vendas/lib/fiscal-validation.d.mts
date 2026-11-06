export function fiscalValidationTarget(issue?:{field?:string;code?:string;message?:string}):string;
export function fiscalValidationIssue<T extends {field?:string;code?:string;message?:string}>(issue:T,form?:{issueDate?:string;exitDate?:string}):T;

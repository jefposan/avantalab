import type {newFiscalNoteFields} from '../fiscal-note-editor.mjs';
export function normalizeFiscalNoteFields(input:unknown):{valid:boolean;fields?:ReturnType<typeof newFiscalNoteFields>;errors:string[]};
export function fiscalFormForXml(fields:ReturnType<typeof newFiscalNoteFields>|undefined):Record<string,string>|undefined;

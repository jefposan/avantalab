export type NoteItemOverrides={name:string;unit:string;ncm:string;cfop:string;taxableUnit:string;originCode:string;icmsCode:string;pisCst:string;cofinsCst:string;ipiCst:string;ipiLegalCode:string};
export const IPI_NT_OPTIONS:Array<{value:string;label:string}>;
export const NOTE_ITEM_KEYS:string[];
export function validateNoteItem(input:unknown):string;
export function applyNoteItemFiscal(base:Record<string,any>,override?:Partial<NoteItemOverrides>):Record<string,any>;

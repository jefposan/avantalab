export const RECEIVABLE_READY_TYPE:string;
export const RECEIVABLE_SNAPSHOT_TYPE:string;
export const RECEIVABLE_MOVE_REQUEST_TYPE:string;
export const RECEIVABLE_MOVE_RESPONSE_TYPE:string;
export function parseReceivableSnapshot(data:unknown):any;
export function createReceivableMoveRequest(input?:Record<string,any>):Readonly<Record<string,any>>|null;
export function parseReceivableMoveResponse(data:unknown):any;

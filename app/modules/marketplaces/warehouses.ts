export type Warehouse = { id: string; name: string; is_online: boolean };
/** Paleta sóbria por identidade: estável ao recarregar, com contraste para texto escuro. */
export function warehousePillColor(id: string) {
  let hash = 2166136261;
  for (const char of id) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  const palette = ['#dce5ee', '#dce8e3', '#e5e2dc', '#e1e3eb', '#e4e7ea', '#dce8e9'];
  return palette[(hash >>> 0) % palette.length];
}
export type WarehouseBalance = Warehouse & { quantity: number | null; revision: number; confirmed_at: string | null };
export type WarehouseAllocation = { warehouseId: string; name: string; online: boolean; quantity: number | null };
export type WarehouseContext = { warehouses: WarehouseBalance[]; warehousesReady: boolean; warehouseError?: string };
export const WAREHOUSE_ACTIONS = ['create','rename','archive','online','add','set','transfer'] as const;

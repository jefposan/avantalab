/** Substatus que comprovam avanço do envio, mesmo quando o ML mantém ready_to_ship. */
export const SHIPMENT_IN_TRANSIT_SUBSTATUSES = [
  'picked_up', 'dropped_off', 'authorized_by_carrier', 'in_hub',
  'in_transit', 'out_for_delivery', 'soon_deliver', 'at_the_door',
] as const;

export function shipmentHasLeftSeller(sale: { shipmentStatus: string | null; shipmentSubstatus: string | null }) {
  return ['shipped', 'delivered', 'not_delivered'].includes(sale.shipmentStatus || '')
    || sale.shipmentStatus === 'ready_to_ship'
      && (SHIPMENT_IN_TRANSIT_SUBSTATUSES as readonly string[]).includes(sale.shipmentSubstatus || '');
}

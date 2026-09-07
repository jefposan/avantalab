export const COMMERCIAL_ORDER_WORKFLOW_REFERENCE: string;
export function createCommercialOrderWorkflow(options?: {
  customerRepository?: any;
  customerService?: any;
  operationService?: any;
  lifecycleService?: any;
  billingService?: any;
}): {
  advance(input?: Record<string, any>): Promise<Record<string, any>>;
};

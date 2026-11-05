'use client';

import {useCallback,useRef,useState,type Dispatch,type SetStateAction} from 'react';

export type MarketplacePanel='sales'|'announced'|'warehouses'|'products'|'results';
export type PanelExpansionState={companyId:string;active:MarketplacePanel|''};
export type PanelExpansionProps={panelExpanded?:boolean;onPanelExpandedChange?:(expanded:boolean)=>void};

export function nextPanelExpansion(current:PanelExpansionState,companyId:string,panel:MarketplacePanel,expanded:boolean):PanelExpansionState{
 const active=current.companyId===companyId?current.active:'';
 return {companyId,active:expanded?panel:active===panel?'':active};
}

/** Um único identificador controla os cinco blocos, inclusive aberturas por atalhos. */
export function useMarketplacePanelGroup(companyId:string){
 const [state,setState]=useState<PanelExpansionState>({companyId,active:''});
 const currentCompany=useRef(companyId);currentCompany.current=companyId;
 const changePanel=useCallback((panel:MarketplacePanel,expanded:boolean)=>{
  if(currentCompany.current!==companyId)return;
  setState(current=>nextPanelExpansion(current,companyId,panel,expanded));
 },[companyId]);
 return {activePanel:state.companyId===companyId?state.active:'',changePanel};
}

/** As prévias isoladas conservam estado local; a página real controla o grupo. */
export function usePanelExpansion({panelExpanded,onPanelExpandedChange}:PanelExpansionProps):[boolean,Dispatch<SetStateAction<boolean>>]{
 const [localExpanded,setLocalExpanded]=useState(false);
 const expanded=panelExpanded??localExpanded;
 const change=useCallback((next:SetStateAction<boolean>)=>{
  if(panelExpanded===undefined)setLocalExpanded(next);
  onPanelExpandedChange?.(typeof next==='function'?next(expanded):next);
 },[panelExpanded,onPanelExpandedChange,expanded]);
 return [expanded,change];
}

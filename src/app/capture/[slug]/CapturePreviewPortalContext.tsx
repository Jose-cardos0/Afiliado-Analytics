"use client";

import { createContext, useContext } from "react";

/**
 * Só usado no preview VIP do dashboard: o toast é portado para este elemento
 * (overlay sobre o “telefone”), em vez de `document.body`, para não cobrir o resto do app.
 */
export type CapturePreviewPortalContextValue = {
  root: HTMLElement | null;
};

export const CapturePreviewPortalContext = createContext<
  CapturePreviewPortalContextValue | undefined
>(undefined);

export function useCapturePreviewPortal(): CapturePreviewPortalContextValue | undefined {
  return useContext(CapturePreviewPortalContext);
}

"use client";

import { createContext, type ReactNode, useCallback, useContext, useMemo, useRef, useState } from "react";
import { Button } from "./button";
import { Modal } from "./modal";

interface ConfirmOptions {
  title?: string;
  message: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "primary";
}

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

export function useConfirm(): ConfirmFn {
  const fn = useContext(ConfirmContext);
  if (!fn) throw new Error("useConfirm must be used within ConfirmDialogProvider");
  return fn;
}

interface ConfirmState extends ConfirmOptions {
  resolve: (value: boolean) => void;
}

export function ConfirmDialogProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ConfirmState | null>(null);
  const resolveRef = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback<ConfirmFn>((options) => {
    return new Promise<boolean>((resolve) => {
      resolveRef.current = resolve;
      setState({ ...options, resolve });
    });
  }, []);

  const handleClose = useCallback(() => {
    resolveRef.current?.(false);
    resolveRef.current = null;
    setState(null);
  }, []);

  const handleConfirm = useCallback(() => {
    resolveRef.current?.(true);
    resolveRef.current = null;
    setState(null);
  }, []);

  const contextValue = useMemo(() => confirm, [confirm]);

  return (
    <ConfirmContext value={contextValue}>
      {children}
      {state && (
        <Modal
          isOpen={true}
          onClose={handleClose}
          onSubmit={handleConfirm}
          title={state.title || "확인"}
          size="sm"
          footer={
            <>
              <Button variant="secondary" onClick={handleClose} className="flex-1">
                {state.cancelLabel || "취소"}
              </Button>
              <Button
                variant={state.variant === "danger" ? "danger" : "primary"}
                onClick={handleConfirm}
                className="flex-1">
                {state.confirmLabel || "확인"}
              </Button>
            </>
          }>
          <div className="flex flex-col gap-spacing-200">
            <p className="whitespace-pre-line text-body text-content-standard-primary">{state.message}</p>
            {state.description && <p className="text-content-standard-tertiary text-footnote">{state.description}</p>}
          </div>
        </Modal>
      )}
    </ConfirmContext>
  );
}

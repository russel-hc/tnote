"use client";

import { useAtom } from "jotai";
import { atomWithStorage } from "jotai/utils";
import { X } from "lucide-react";
import { useEffect, useState } from "react";

export type ToastType = "success" | "error" | "info";

export interface ToastMessage {
  id: string;
  message: string;
  type: ToastType;
}

export const toastsAtom = atomWithStorage<ToastMessage[]>("toasts", []);

const toastStyles: Record<ToastType, string> = {
  success: "bg-core-status-positive",
  error: "bg-core-status-negative",
  info: "bg-core-accent",
};

export function ToastContainer() {
  const [toasts, setToasts] = useAtom(toastsAtom);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <div className="pointer-events-none fixed right-4 bottom-4 z-70 flex flex-col gap-spacing-300 md:right-8 md:bottom-8">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onRemove={removeToast} />
      ))}
    </div>
  );
}

interface ToastItemProps {
  toast: ToastMessage;
  onRemove: (id: string) => void;
}

function ToastItem({ toast, onRemove }: ToastItemProps) {
  const bgColor = toastStyles[toast.type];
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    const exitTimer = setTimeout(() => {
      setIsExiting(true);
    }, 3700);

    const removeTimer = setTimeout(() => {
      onRemove(toast.id);
    }, 4000);

    return () => {
      clearTimeout(exitTimer);
      clearTimeout(removeTimer);
    };
  }, [toast.id, onRemove]);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(() => onRemove(toast.id), 200);
  };

  return (
    <div
      className={`pointer-events-auto flex max-w-80 items-center gap-spacing-300 rounded-radius-400 px-spacing-500 py-spacing-400 shadow-lg ${bgColor} ${isExiting ? "animate-toast-out" : "animate-toast-in"}`}
      role="alert">
      <span className="font-medium text-body text-solid-white">{toast.message}</span>
      <button
        onClick={handleClose}
        className="ml-spacing-200 shrink-0 rounded-radius-200 p-spacing-100 text-solid-white/70 transition-all duration-150 hover:bg-solid-white/20 hover:text-solid-white">
        <X className="size-4" />
      </button>
    </div>
  );
}

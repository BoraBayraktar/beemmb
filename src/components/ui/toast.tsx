"use client";

import { useEffect } from "react";
import { AlertCircle, X } from "lucide-react";

import { cn } from "@/lib/utils";

type ErrorToastProps = {
  message: string;
  onDismiss: () => void;
  durationMs?: number;
  className?: string;
};

/**
 * Sabit konumlu (viewport'a göre fixed) hata bildirimi. Uzun formlarda,
 * kullanıcı aşağı kaydırmışken form içi banner'lar ekran dışında kalıp
 * görünmez olabiliyor — bu bileşen scroll konumundan bağımsız her zaman
 * görünür kalır ve belirli bir süre sonra kendiliğinden kapanır.
 */
export function ErrorToast({ message, onDismiss, durationMs = 6000, className }: ErrorToastProps) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, durationMs);
    return () => clearTimeout(timer);
  }, [message, onDismiss, durationMs]);

  return (
    <div
      role="alert"
      className={cn(
        "fixed right-4 top-4 z-[100] flex max-w-sm items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 shadow-2xl",
        className,
      )}
    >
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
      <p className="flex-1 font-medium">{message}</p>
      <button type="button" onClick={onDismiss} className="shrink-0 text-red-700/60 transition hover:text-red-700" aria-label="Kapat">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

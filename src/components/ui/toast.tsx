import * as React from "react";
import { cn } from "@/lib/cn";

interface Toast {
  id: number;
  title: string;
  description?: string;
  variant?: "default" | "success" | "destructive";
}

interface ToastContextValue {
  toast: (t: Omit<Toast, "id">) => void;
}

const ToastContext = React.createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<Toast[]>([]);
  const idRef = React.useRef(0);

  const toast = React.useCallback<ToastContextValue["toast"]>((t) => {
    idRef.current += 1;
    const id = idRef.current;
    setToasts((prev) => [...prev, { id, ...t }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((x) => x.id !== id));
    }, 4000);
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 top-4 z-[100] flex flex-col items-center gap-2 px-4">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cn(
              "pointer-events-auto w-full max-w-sm rounded-lg border bg-card p-3 shadow-lg",
              t.variant === "success" && "border-success/40",
              t.variant === "destructive" && "border-destructive/40",
            )}
            role="alert"
          >
            <div
              className={cn(
                "text-sm font-semibold",
                t.variant === "success" && "text-success",
                t.variant === "destructive" && "text-destructive",
              )}
            >
              {t.title}
            </div>
            {t.description && (
              <div className="text-xs text-muted-foreground mt-1">{t.description}</div>
            )}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = React.useContext(ToastContext);
  if (!ctx) throw new Error("useToast muss innerhalb von ToastProvider verwendet werden");
  return ctx;
}

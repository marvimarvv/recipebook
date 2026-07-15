"use client";

import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, XCircle, AlertTriangle, Info } from "lucide-react";
import { useStore } from "@/store/useStore";

export default function Toast() {
  const toasts = useStore((state) => state.toasts);
  const removeToast = useStore((state) => state.removeToast);

  useEffect(() => {
    toasts.forEach((toast) => {
      const timer = setTimeout(() => {
        removeToast(toast.id);
      }, 5000);
      return () => clearTimeout(timer);
    });
  }, [toasts, removeToast]);

  const toastIcons = {
    success: <CheckCircle className="h-5 w-5 text-green-500" />,
    error: <XCircle className="h-5 w-5 text-red-500" />,
    warning: <AlertTriangle className="h-5 w-5 text-amber-500" />,
    info: <Info className="h-5 w-5 text-blue-500" />,
  };

  const toastColors = {
    success: "bg-green-500",
    error: "bg-red-500",
    warning: "bg-amber-500",
    info: "bg-blue-500",
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, x: 100, transform: "translateX(100%)" }}
            animate={{ opacity: 1, x: 0, transform: "translateX(0)" }}
            exit={{ opacity: 0, x: 100, transform: "translateX(100%)" }}
            transition={{ type: "spring", damping: 10, stiffness: 100 }}
            className="flex min-w-[300px] items-center gap-3 rounded-lg border bg-white p-4 shadow-lg"
          >
            <div
              className={`h-8 w-2 flex-shrink-0 rounded-l ${toastColors[toast.type]}`}
            />
            <div className="flex-1">
              <div className="mb-1 flex items-center gap-2">
                {toastIcons[toast.type]}
                <h4 className="font-semibold">{toast.title}</h4>
              </div>
              {toast.description && (
                <p className="text-sm text-muted-foreground">
                  {toast.description}
                </p>
              )}
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              <span className="sr-only">Close</span>
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

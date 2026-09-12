"use client";

import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { Button } from "@/components/ui";

export type NotificationType = "success" | "error" | "warning" | "info";

type Notification = {
  id: number;
  type: NotificationType;
  message: string;
};

type ConfirmationRequest = {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  resolve: (confirmed: boolean) => void;
  trigger: HTMLElement | null;
};

type NotificationContextValue = {
  notify: (type: NotificationType, message: string) => void;
  requestConfirmation: (request: {
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
  }) => Promise<boolean>;
};

const NotificationContext = createContext<NotificationContextValue | null>(
  null,
);

const notificationStyles: Record<NotificationType, string> = {
  success: "border-emerald-200 bg-emerald-50 text-emerald-800",
  error: "border-red-200 bg-red-50 text-red-800",
  warning: "border-amber-200 bg-amber-50 text-amber-900",
  info: "border-zinc-200 bg-white text-zinc-800",
};

const notificationIcons: Record<NotificationType, string> = {
  success: "M20 6 9 17l-5-5",
  error: "M12 8v4m0 4h.01",
  warning: "M12 8v4m0 4h.01",
  info: "M12 16v-4m0-4h.01",
};

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [confirmation, setConfirmation] = useState<ConfirmationRequest | null>(
    null,
  );
  const confirmationRef = useRef<ConfirmationRequest | null>(null);
  const confirmationQueue = useRef<ConfirmationRequest[]>([]);
  const confirmationDialogRef = useRef<HTMLDivElement>(null);
  const nextId = useRef(0);

  const dismiss = useCallback((id: number) => {
    setNotifications((current) => current.filter((item) => item.id !== id));
  }, []);

  const notify = useCallback(
    (type: NotificationType, message: string) => {
      const id = nextId.current++;
      setNotifications((current) => [...current, { id, type, message }]);
      const duration = type === "error" ? 8000 : 4000;
      window.setTimeout(() => dismiss(id), duration);
    },
    [dismiss],
  );

  const requestConfirmation = useCallback(
    (request: Omit<ConfirmationRequest, "resolve" | "trigger">) =>
      new Promise<boolean>((resolve) => {
        const pending = {
          ...request,
          resolve,
          trigger:
            document.activeElement instanceof HTMLElement
              ? document.activeElement
              : null,
        };
        if (confirmationRef.current) {
          confirmationQueue.current.push(pending);
        } else {
          confirmationRef.current = pending;
          setConfirmation(pending);
        }
      }),
    [],
  );

  const finishConfirmation = useCallback((confirmed: boolean) => {
    const current = confirmationRef.current;
    if (!current) return;
    current.resolve(confirmed);
    if (current.trigger?.isConnected) current.trigger.focus();
    const next = confirmationQueue.current.shift() ?? null;
    confirmationRef.current = next;
    setConfirmation(next);
  }, []);

  useEffect(() => {
    if (!confirmation) return;
    const frame = window.requestAnimationFrame(() => {
      const firstControl =
        confirmationDialogRef.current?.querySelector<HTMLElement>(
          "button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled])",
        );
      (firstControl ?? confirmationDialogRef.current)?.focus();
    });

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        finishConfirmation(false);
        return;
      }
      if (event.key !== "Tab" || !confirmationDialogRef.current) return;
      const controls = Array.from(
        confirmationDialogRef.current.querySelectorAll<HTMLElement>(
          "button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled])",
        ),
      );
      if (controls.length === 0) {
        event.preventDefault();
        confirmationDialogRef.current.focus();
        return;
      }
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [confirmation, finishConfirmation]);

  return (
    <NotificationContext.Provider value={{ notify, requestConfirmation }}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-0 top-4 z-[100] flex flex-col items-end gap-2 px-4 sm:left-auto sm:w-full sm:max-w-md"
        aria-live="polite"
      >
        {notifications.map((notification) => (
          <div
            key={notification.id}
            className={`pointer-events-auto flex w-full items-start gap-3 rounded-md border px-3 py-2.5 text-sm shadow-overlay ${notificationStyles[notification.type]}`}
            role={notification.type === "error" ? "alert" : "status"}
          >
            <svg
              className="mt-0.5 shrink-0"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d={notificationIcons[notification.type]} />
              {notification.type === "error" ||
              notification.type === "warning" ? (
                <circle cx="12" cy="12" r="9" />
              ) : null}
            </svg>
            <span className="min-w-0 flex-1 break-words">
              {notification.message}
            </span>
            <button
              type="button"
              onClick={() => dismiss(notification.id)}
              className="focus-ring -mr-1 -mt-1 shrink-0 rounded p-1 text-current/70 hover:bg-black/5 hover:text-current"
              aria-label="Dismiss notification"
            >
              <span aria-hidden="true">×</span>
            </button>
          </div>
        ))}
      </div>

      {confirmation ? (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-zinc-900/40 p-4">
          <div
            ref={confirmationDialogRef}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-labelledby="maya-confirmation-title"
            className="w-full max-w-md rounded-lg border border-zinc-200 bg-white p-5 shadow-overlay"
          >
            <h2
              id="maya-confirmation-title"
              className="text-base font-semibold text-zinc-900"
            >
              {confirmation.title}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-zinc-600">
              {confirmation.message}
            </p>
            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <Button
                variant="secondary"
                onClick={() => finishConfirmation(false)}
              >
                {confirmation.cancelLabel ?? "Cancel"}
              </Button>
              <Button variant="danger" onClick={() => finishConfirmation(true)}>
                {confirmation.confirmLabel ?? "Delete"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </NotificationContext.Provider>
  );
}

export function useNotifications(): NotificationContextValue {
  const context = useContext(NotificationContext);
  if (!context)
    throw new Error(
      "useNotifications must be used inside NotificationProvider",
    );
  return context;
}

"use client";

import { useEffect, useState } from "react";

export function OfflineSupport() {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    const updateStatus = () => setOffline(!navigator.onLine);
    updateStatus();
    window.addEventListener("online", updateStatus);
    window.addEventListener("offline", updateStatus);

    if ("serviceWorker" in navigator) {
      void navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    }

    return () => {
      window.removeEventListener("online", updateStatus);
      window.removeEventListener("offline", updateStatus);
    };
  }, []);

  if (!offline) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t border-amber-200 bg-amber-50 px-4 py-2 text-center text-xs font-medium text-amber-900">
      Offline mode: showing your last saved data. Changes need an internet
      connection.
    </div>
  );
}

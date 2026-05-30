import { WifiOff } from "lucide-react";
import { useEffect, useState } from "react";

export function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  if (isOnline) return null;

  return (
    <div className="fixed top-0 left-0 z-50 w-full bg-amber-900/90 text-amber-100 flex items-center gap-2 px-4 py-2 text-sm font-medium">
      <WifiOff className="h-4 w-4 shrink-0" />
      <span>
        You are offline — messages will queue and send when you reconnect.
      </span>
    </div>
  );
}

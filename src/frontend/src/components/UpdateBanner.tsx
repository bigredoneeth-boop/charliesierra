import { Download } from "lucide-react";
import { useEffect, useState } from "react";

interface UpdateBannerProps {
  onUpdate: () => void;
}

export function UpdateBanner({ onUpdate }: UpdateBannerProps) {
  const [visible, setVisible] = useState(false);

  // Delay the mount so the slide-down animation is visible
  useEffect(() => {
    const id = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <output
      aria-live="polite"
      data-ocid="update.banner"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        paddingTop: "env(safe-area-inset-top)",
        transform: visible ? "translateY(0)" : "translateY(-100%)",
        transition: "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
        // Dark CharlieSierra theme
        backgroundColor: "#0f172a",
        borderBottom: "1px solid rgba(99,179,237,0.25)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "10px",
          padding: "8px 16px",
          minHeight: "40px",
        }}
      >
        {/* Icon */}
        <Download
          size={13}
          style={{ color: "#63b3ed", flexShrink: 0 }}
          aria-hidden
        />

        {/* Message */}
        <span
          style={{
            fontSize: "13px",
            lineHeight: 1.4,
            color: "#cbd5e1",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          A new version of CharlieSierra is available.
        </span>

        {/* Update Now button */}
        <button
          type="button"
          onClick={onUpdate}
          data-ocid="update.primary_button"
          style={{
            flexShrink: 0,
            fontSize: "12px",
            fontWeight: 600,
            padding: "4px 12px",
            borderRadius: "6px",
            border: "1px solid rgba(99,179,237,0.5)",
            backgroundColor: "rgba(99,179,237,0.12)",
            color: "#63b3ed",
            cursor: "pointer",
            transition: "background-color 0.15s, border-color 0.15s",
            letterSpacing: "0.01em",
            whiteSpace: "nowrap",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.backgroundColor =
              "rgba(99,179,237,0.22)";
            (e.currentTarget as HTMLButtonElement).style.borderColor =
              "rgba(99,179,237,0.75)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.backgroundColor =
              "rgba(99,179,237,0.12)";
            (e.currentTarget as HTMLButtonElement).style.borderColor =
              "rgba(99,179,237,0.5)";
          }}
        >
          Update Now
        </button>
      </div>
    </output>
  );
}

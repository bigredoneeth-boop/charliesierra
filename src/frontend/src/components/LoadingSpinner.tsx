interface LoadingSpinnerProps {
  size?: number;
  className?: string;
  label?: string;
  fullScreen?: boolean;
}

export function LoadingSpinner({
  size = 24,
  className = "",
  label = "Loading…",
  fullScreen = false,
}: LoadingSpinnerProps) {
  const spinner = (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`animate-spin text-primary ${className}`}
      aria-hidden="true"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="3"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );

  if (fullScreen) {
    return (
      <div className="flex items-center justify-center h-full w-full min-h-[200px]">
        <div className="flex flex-col items-center gap-3">
          {spinner}
          <p className="text-sm text-muted-foreground">{label}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center" aria-label={label}>
      {spinner}
    </div>
  );
}

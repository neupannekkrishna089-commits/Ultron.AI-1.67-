import type { ReactElement, ReactNode, SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function make(children: ReactNode, filled = false): (props: IconProps) => ReactElement {
  return function Icon({ size = 16, ...rest }: IconProps) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill={filled ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        {...rest}
      >
        {children}
      </svg>
    );
  };
}

export const IconPlus = make(<path d="M12 5v14M5 12h14" />);
export const IconX = make(<path d="M18 6 6 18M6 6l12 12" />);
export const IconCheck = make(<path d="M20 6 9 17l-5-5" />);
export const IconTrash = make(
  <>
    <path d="M3 6h18" />
    <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
    <path d="M10 11v6M14 11v6" />
  </>,
);
export const IconPaperclip = make(
  <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />,
);
export const IconMic = make(
  <>
    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
    <path d="M12 19v4" />
  </>,
);
export const IconSend = make(<path d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7z" />, true);
export const IconGear = make(
  <>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h.09a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h.09a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v.09a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </>,
);
export const IconKeyboard = make(
  <>
    <rect x="2" y="6" width="20" height="12" rx="2" />
    <path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M6 14h.01M18 14h.01M9 14h6" />
  </>,
);
export const IconSparkle = make(<path d="M12 3l2.1 5.9L20 11l-5.9 2.1L12 19l-2.1-5.9L4 11l5.9-2.1L12 3z" />, true);
export const IconMinus = make(<path d="M5 12h14" />);
export const IconMaximize = make(
  <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />,
);
export const IconClose = make(<path d="M18 6 6 18M6 6l12 12" />);
export const IconVolume2 = make(
  <>
    <path d="M11 5 6 9H2v6h4l5 4V5z" />
    <path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13" />
  </>,
);
export const IconVolumeX = make(
  <>
    <path d="M11 5 6 9H2v6h4l5 4V5z" />
    <path d="m17 9 6 6M23 9l-6 6" />
  </>,
);
export const IconPlay = make(<path d="M6 3.5v17l15-8.5-15-8.5z" />, true);
export const IconStopCircle = make(
  <>
    <circle cx="12" cy="12" r="10" />
    <rect x="9" y="9" width="6" height="6" rx="1" fill="currentColor" stroke="none" />
  </>,
);
export const IconWaveform = make(
  <path d="M2 12h2m3-5v10m3-8v6m3-9v12m3-8v4m3-6v8m3-4h2" />,
);
export const IconChevronDown = make(<path d="m6 9 6 6 6-6" />);
export const IconType = make(
  <>
    <path d="M4 7V5a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v2" />
    <path d="M12 4v16M9 20h6" />
  </>,
);

/**
 * ULTRON identity mark — a graphite badge with a hairline edge and an
 * abstract monogram: two converging strokes that meet at a single crimson
 * point. Deliberately quiet and geometric, not a literal "U" or a solid
 * red tile — reads as a precision instrument rather than a game emblem.
 */
export function ULTRONMark({ size = 22, className }: { size?: number; className?: string }) {
  const id = "um" + Math.round(size * 10);
  return (
    <span
      className={"relative inline-flex shrink-0 items-center justify-center rounded-[7px] " + (className ?? "")}
      style={{
        width: size,
        height: size,
        background: "linear-gradient(155deg, #26272d 0%, #1a1b1f 100%)",
        boxShadow:
          "inset 0 0 0 1px rgba(255,255,255,0.06), inset 0 -1px 1px rgba(0,0,0,0.4), 0 1px 2px rgba(0,0,0,0.35)",
      }}
      aria-hidden="true"
    >
      <svg
        width={Math.round(size * 0.6)}
        height={Math.round(size * 0.6)}
        viewBox="0 0 24 24"
        fill="none"
      >
        <defs>
          <linearGradient id={id} x1="3" y1="4" x2="21" y2="20" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#9aa0aa" />
            <stop offset="100%" stopColor="#dfe1e4" />
          </linearGradient>
        </defs>
        <path
          d="M4 4v8.2C4 16.5 7.6 20 12 20s8-3.5 8-7.8V4"
          stroke={`url(#${id})`}
          strokeWidth={2.1}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="12" cy="14.4" r="1.35" fill="var(--color-crimson)" />
      </svg>
    </span>
  );
}

type HourglassIconProps = {
  size?: number;
  color?: string;
};

export function HourglassIcon({ size = 26, color = "white" }: HourglassIconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" aria-hidden="true">
      <line x1="9" y1="5.5" x2="31" y2="5.5" stroke={color} strokeWidth="4.5" strokeLinecap="round" />
      <line x1="9" y1="34.5" x2="31" y2="34.5" stroke={color} strokeWidth="4.5" strokeLinecap="round" />
      <path
        d="M11 6 L29 6 L20.5 19 L20.5 21 L29 34 L11 34 L19.5 21 L19.5 19 Z"
        fill="none"
        stroke={color}
        strokeWidth="4"
        strokeLinejoin="round"
      />
    </svg>
  );
}

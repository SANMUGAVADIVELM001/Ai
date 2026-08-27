interface Props {
  size?: number;
  className?: string;
}

/** The PathAI mark: an open-book glyph, rendered directly in the brand red — no background tile. */
export default function Logo({ size = 28, className = '' }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="#EF233C"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`shrink-0 ${className}`}
      aria-hidden="true"
    >
      <path d="M12 6.5c-1.6-1.3-3.6-2-6-2v13c2.4 0 4.4.7 6 2 1.6-1.3 3.6-2 6-2v-13c-2.4 0-4.4.7-6 2Z" />
      <path d="M12 6.5v13" />
    </svg>
  );
}

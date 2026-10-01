/** Docket brand mark. Ink tile, white geometric D, gold marker underline. */
export function LogoMark({ size = 22 }: { size?: number }) {
  return (
    <span
      aria-hidden
      className="inline-flex shrink-0 items-center justify-center overflow-hidden rounded-[6px] bg-ink"
      style={{ width: size, height: size }}
    >
      <svg viewBox="0 0 512 512" width={size} height={size} role="img">
        <path
          d="M196 150 V362 M196 150 H282 C368 150 368 362 282 362 H196"
          fill="none"
          stroke="#fff"
          strokeWidth="46"
        />
        <rect x="173" y="392" width="166" height="22" rx="11" fill="#e7c066" />
      </svg>
    </span>
  );
}

const EYE = (
  <>
    <svg className="pw-eye" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
    <svg className="pw-eye-off" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 3l18 18" />
      <path d="M10.7 10.7A3 3 0 0 0 13.3 13.3" />
      <path d="M9.9 5.1A11 11 0 0 1 12 5c6.4 0 10 7 10 7a18.5 18.5 0 0 1-2.2 3.2" />
      <path d="M6.1 6.1C3.8 7.9 2 12 2 12s3.6 7 10 7a10.8 10.8 0 0 0 4.4-.9" />
    </svg>
  </>
);

export function PasswordToggle({ show, onToggle }: { show: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      className={show ? "pw-toggle on" : "pw-toggle"}
      aria-label={show ? "Hide password" : "Show password"}
      aria-pressed={show}
      onClick={onToggle}
    >
      {EYE}
    </button>
  );
}


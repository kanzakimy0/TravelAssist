export function AuthIcon({
  name,
}: {
  name: "mail" | "lock" | "shield" | "google" | "apple";
}) {
  if (name === "google")
    return (
      <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M20 6.5A9 9 0 0 0 5.5 5.8"
          fill="none"
          stroke="#ea4335"
          strokeWidth="4"
        />
        <path
          d="M5.5 5.8a9 9 0 0 0-1.8 9"
          fill="none"
          stroke="#fbbc05"
          strokeWidth="4"
        />
        <path
          d="M3.7 14.8A9 9 0 0 0 18 19"
          fill="none"
          stroke="#34a853"
          strokeWidth="4"
        />
        <path
          d="M18 19a9 9 0 0 0 3-7h-9"
          fill="none"
          stroke="#4285f4"
          strokeWidth="4"
        />
      </svg>
    );
  if (name === "apple")
    return (
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="currentColor"
        aria-hidden="true"
      >
        <path d="M16.3 1.5c.2 2-1.1 4.1-3.5 4.5-.3-2 1.3-4.1 3.5-4.5ZM12 6.7c1.9 0 2.4-1.2 4.5-.9 1.6.1 3.1.9 4 2.2-3.6 2.2-3.1 6.8.8 8.4-.7 2-2.6 5.7-4.7 5.7-1.5 0-2-1-4-1s-2.6 1-4 1C6 22 2.9 16.6 2.9 12.8c0-4.6 3.2-7.3 6-6.9 1.2.1 2.2.8 3.1.8Z" />
      </svg>
    );
  return (
    <svg
      width="23"
      height="23"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {name === "mail" ? (
        <>
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <path d="m3 6 9 7 9-7" />
        </>
      ) : name === "lock" ? (
        <>
          <rect x="5" y="10" width="14" height="11" rx="2" />
          <path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3" />
        </>
      ) : (
        <>
          <path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6l8-3Z" />
          <path d="m9 12 2 2 4-4" />
        </>
      )}
    </svg>
  );
}

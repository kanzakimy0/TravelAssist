"use client";

export function HomeSkipLink() {
  return (
    <a
      href="#home-content"
      className="main-skip-link"
      onClick={(event) => {
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
          return;
        const content = document.getElementById("home-content");
        if (!content) return;
        // Focus the existing landmark without inserting a hash-only history entry.
        // Native fragment navigation remains available before hydration.
        event.preventDefault();
        content.focus({ preventScroll: true });
      }}
    >
      跳到主要内容
    </a>
  );
}

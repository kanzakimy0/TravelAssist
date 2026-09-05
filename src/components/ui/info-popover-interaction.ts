import { INFO_CLOSE_DELAY, INFO_OPEN_DELAY } from "./info-popover-position";

/** Shared pointer/keyboard state, independently testable without a browser. */
export function createInfoInteraction(callbacks: {
  onOpen: () => void;
  onClose: () => void;
}) {
  let open = false;
  let hovered = false;
  let keyboardFocused = false;
  let pointerType: string | null = null;
  let openTimer: ReturnType<typeof setTimeout> | null = null;
  let closeTimer: ReturnType<typeof setTimeout> | null = null;

  function clearTimers() {
    if (openTimer !== null) clearTimeout(openTimer);
    if (closeTimer !== null) clearTimeout(closeTimer);
    openTimer = closeTimer = null;
  }
  function show() {
    clearTimers();
    open = true;
    callbacks.onOpen();
  }
  function dismiss() {
    clearTimers();
    open = false;
    hovered = false;
    keyboardFocused = false;
    callbacks.onClose();
  }
  function scheduleOpen() {
    clearTimers();
    if (!open) openTimer = setTimeout(show, INFO_OPEN_DELAY);
  }
  function scheduleClose() {
    clearTimers();
    if (!hovered && !keyboardFocused)
      closeTimer = setTimeout(dismiss, INFO_CLOSE_DELAY);
  }
  return {
    dismiss,
    dispose: clearTimers,
    isActive: () => open || openTimer !== null,
    pointerDown(type: string) {
      pointerType = type;
      keyboardFocused = false;
    },
    pointerEnter(type: string) {
      if (type === "touch") return;
      hovered = true;
      scheduleOpen();
    },
    pointerLeave(type: string) {
      if (type === "touch") return;
      hovered = false;
      scheduleClose();
    },
    focus() {
      if (pointerType) return;
      keyboardFocused = true;
      scheduleOpen();
    },
    blur() {
      pointerType = null;
      keyboardFocused = false;
      scheduleClose();
    },
    activate() {
      if (pointerType === "touch") {
        if (open) dismiss();
        else show();
      } else scheduleOpen();
    },
    surfaceEnter() {
      hovered = true;
      clearTimers();
    },
    surfaceLeave() {
      hovered = false;
      scheduleClose();
    },
  };
}

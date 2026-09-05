export const INFO_OPEN_DELAY = 200;
export const INFO_CLOSE_DELAY = 125;

interface InfoPositionInput {
  anchor: { left: number; right: number; top: number; bottom: number };
  width: number;
  height: number;
  viewportWidth: number;
  viewportHeight: number;
}

/** Prefer the space above the label; keep the entire help surface on screen. */
export function positionInfoPopover({
  anchor,
  width,
  height,
  viewportWidth,
  viewportHeight,
}: InfoPositionInput) {
  const inset = 12;
  const gap = 8;
  const above = anchor.top - height - gap;
  const top = above >= inset ? above : anchor.bottom + gap;
  return {
    left: Math.max(
      inset,
      Math.min(
        (anchor.left + anchor.right - width) / 2,
        viewportWidth - width - inset,
      ),
    ),
    top: Math.max(inset, Math.min(top, viewportHeight - height - inset)),
  };
}

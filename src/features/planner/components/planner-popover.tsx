import { useLayoutEffect, useRef } from "react";
import type { ReactNode, RefObject } from "react";
import styles from "../planner.module.css";
import { PlannerIcon } from "./planner-icon";
const openPopovers: HTMLElement[] = [];

export function PlannerPopover({
  id,
  title,
  trigger,
  onClose,
  children,
  compact = false,
  className,
  placement = "anchor",
  autoFocus = true,
  dismissOutside = true,
  headerless = false,
  maxHeight = 360,
}: {
  id: string;
  title: string;
  trigger: RefObject<HTMLButtonElement | null>;
  onClose: () => void;
  children: ReactNode;
  compact?: boolean;
  className?: string;
  placement?:
    "anchor" | "side" | "above" | "tab" | "card" | "review" | "section";
  autoFocus?: boolean;
  dismissOutside?: boolean;
  headerless?: boolean;
  maxHeight?: number;
}) {
  const surface = useRef<HTMLDivElement>(null);
  const close = useRef(onClose);
  useLayoutEffect(() => {
    close.current = onClose;
  }, [onClose]);
  useLayoutEffect(() => {
    const element = surface.current;
    const button = trigger.current;
    if (!element || !button) return;
    // The top layer keeps viewport coordinates independent of animated,
    // filtered or scroll-clipped ancestors, including nested detail menus.
    const parentDialog = element.closest("dialog");
    let sideOrigin: { top: number; anchorTop: number } | null = null;
    function position() {
      if (!element || !button) return;
      const rect = button.getBoundingClientRect();
      if (placement === "section") {
        const section = button.closest("section")?.getBoundingClientRect();
        if (!section) return;
        // Extend the selected sidebar section as a top-layer surface. The
        // underlying grid never changes height or moves adjacent sections.
        const below = window.innerHeight - rect.bottom - 16;
        const useBelow = below >= 180 || below >= rect.top - 16;
        element.style.width = `${Math.min(section.width, window.innerWidth - 24)}px`;
        element.style.maxHeight = `${Math.max(80, Math.min(420, useBelow ? below : rect.top - 16))}px`;
        element.style.left = `${Math.max(12, Math.min(section.left, window.innerWidth - element.offsetWidth - 12))}px`;
        element.style.top = `${useBelow ? rect.bottom + 6 : Math.max(8, rect.top - element.offsetHeight - 6)}px`;
        return;
      }
      if (placement === "card") {
        const card = button
          .closest("[data-detail-column]")
          ?.querySelector("[data-detail-item]")
          ?.getBoundingClientRect();
        if (!card) return;
        // Expand only this card upward; its trigger and every neighbouring card
        // retain their original layout coordinates.
        element.style.width = `${card.width}px`;
        element.style.height = `${card.height}px`;
        element.style.maxHeight = `${card.height}px`;
        element.style.left = `${Math.max(8, Math.min(card.left, window.innerWidth - card.width - 8))}px`;
        element.style.top = `${Math.max(8, rect.top - card.height - 3)}px`;
        return;
      }
      if (placement === "tab") {
        const strip = button
          .closest('[role="tablist"]')
          ?.getBoundingClientRect();
        element.style.visibility =
          strip && (rect.left < strip.left - 1 || rect.right > strip.right + 1)
            ? "hidden"
            : "visible";
        element.style.width = `${rect.width}px`;
        // Reuse the expanded tab's label space; keep its fold control exposed.
        const contentBottom = rect.bottom - 28;
        const reclaimedHeight = Math.max(0, contentBottom - rect.top);
        element.style.maxHeight = `${Math.max(60, Math.min(280 + reclaimedHeight, contentBottom - 8))}px`;
        element.style.left = `${rect.left}px`;
        element.style.top = `${contentBottom - element.offsetHeight + 1}px`;
        return;
      }
      if (compact) element.style.width = `${rect.width}px`;
      const width = element.offsetWidth;
      if (placement === "review") {
        const rail = button
          .closest("[data-detail-sidebar]")
          ?.getBoundingClientRect();
        if (rail && rail.left >= width + 24) {
          element.style.maxHeight = `${Math.min(520, window.innerHeight - 24)}px`;
          element.style.left = `${rail.left - width - 12}px`;
          element.style.top = `${Math.max(12, Math.min(rect.top, window.innerHeight - element.offsetHeight - 12))}px`;
        } else {
          const above = rect.top > window.innerHeight - rect.bottom;
          element.style.maxHeight = `${Math.max(80, (above ? rect.top : window.innerHeight - rect.bottom) - 20)}px`;
          element.style.left = `${Math.max(12, Math.min(rect.right - width, window.innerWidth - width - 12))}px`;
          element.style.top = `${above ? Math.max(12, rect.top - element.offsetHeight - 8) : rect.bottom + 8}px`;
        }
        return;
      }
      if (placement === "above") {
        const above = rect.top >= 180;
        element.style.maxHeight = `${Math.max(80, Math.min(maxHeight, above ? rect.top - 20 : window.innerHeight - rect.bottom - 20))}px`;
        element.style.left = `${Math.max(12, Math.min(rect.left, window.innerWidth - width - 12))}px`;
        element.style.top = `${above ? Math.max(12, rect.top - element.offsetHeight - 8) : rect.bottom + 8}px`;
        return;
      }
      if (placement === "side") {
        if (!sideOrigin) {
          element.style.maxHeight = `${Math.min(680, window.innerHeight - 24)}px`;
          sideOrigin = {
            top: Math.max(
              12,
              Math.min(
                rect.top,
                window.innerHeight - element.offsetHeight - 12,
              ),
            ),
            anchorTop: rect.top,
          };
        }
        // Content changes must not re-anchor the menu or move its section buttons.
        // Real ancestor scrolling still follows the trigger; resizing starts fresh.
        const top = Math.max(
          12,
          Math.min(
            sideOrigin.top + rect.top - sideOrigin.anchorTop,
            window.innerHeight - 92,
          ),
        );
        element.style.maxHeight = `${Math.min(680, window.innerHeight - top - 12)}px`;
        const rail = button
          .closest("[data-right-panel]")
          ?.getBoundingClientRect();
        const left =
          window.innerWidth >= 768 && rail
            ? rail.left - width - 12
            : rect.right - width;
        element.style.left = `${Math.max(12, Math.min(left, window.innerWidth - width - 12))}px`;
        element.style.top = `${top}px`;
        return;
      }
      const below = window.innerHeight - rect.bottom - 20;
      const above = Math.min(window.innerHeight - 24, rect.top - 20);
      const placeBelow =
        below >= Math.min(element.scrollHeight, 420) || below >= above;
      element.style.maxHeight = `${Math.min(window.innerHeight - 24, Math.max(80, placeBelow ? below : above))}px`;
      const height = element.offsetHeight;
      element.style.left = `${Math.max(12, Math.min(rect.right - width, window.innerWidth - width - 12))}px`;
      element.style.top = `${Math.max(12, Math.min(window.innerHeight - height - 12, placeBelow ? rect.bottom + 8 : rect.top - height - 8))}px`;
    }
    function reveal() {
      if (!element || (parentDialog && !parentDialog.open)) return;
      if (!element.matches(":popover-open")) {
        element.showPopover();
        openPopovers.push(element);
      }
      position();
      if (autoFocus)
        (
          element.querySelector<HTMLElement>("[data-popover-autofocus]") ??
          element.querySelector<HTMLElement>("button, input")
        )?.focus({ preventScroll: true });
    }
    // A mobile sheet opens in the parent's effect, after this child's layout
    // effect. Reveal only after its dialog, otherwise the sheet covers the popup.
    const parentObserver = new MutationObserver(reveal);
    if (parentDialog)
      parentObserver.observe(parentDialog, {
        attributes: true,
        attributeFilter: ["open"],
      });
    reveal();
    function resize() {
      sideOrigin = null;
      position();
    }
    function outside(event: PointerEvent) {
      if (!dismissOutside) return;
      const modal = Array.from(document.querySelectorAll("dialog:modal")).at(
        -1,
      );
      if (modal && !modal.contains(element)) return;
      if (openPopovers.at(-1) !== element) return;
      if (
        event.target instanceof Node &&
        !element?.contains(event.target) &&
        !button?.contains(event.target)
      )
        close.current();
    }
    function escape(event: KeyboardEvent) {
      const modal = Array.from(document.querySelectorAll("dialog:modal")).at(
        -1,
      );
      if (modal && !modal.contains(element)) return;
      if (openPopovers.at(-1) !== element) return;
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        close.current();
      }
    }
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape, true);
    window.addEventListener("resize", resize);
    document.addEventListener("scroll", position, true);
    const observer = new ResizeObserver(position);
    observer.observe(element);
    if (placement === "card") {
      const card = button
        .closest("[data-detail-column]")
        ?.querySelector("[data-detail-item]");
      if (card) observer.observe(card);
    }
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape, true);
      window.removeEventListener("resize", resize);
      document.removeEventListener("scroll", position, true);
      observer.disconnect();
      parentObserver.disconnect();
      const index = openPopovers.indexOf(element);
      if (index >= 0) openPopovers.splice(index, 1);
      if (element.matches(":popover-open")) element.hidePopover();
      if (autoFocus) button.focus({ preventScroll: true });
    };
  }, [trigger, compact, placement, autoFocus, dismissOutside, maxHeight]);
  return (
    <div
      id={id}
      ref={surface}
      popover="manual"
      data-planner-popover
      data-compact={compact || undefined}
      role="dialog"
      aria-label={title}
      className={`${styles.popover} ${className ?? ""}`}
    >
      {!compact && !headerless && (
        <header className={styles.popoverHeader}>
          <h2>{title}</h2>
          <button type="button" onClick={onClose} aria-label={`关闭${title}`}>
            <PlannerIcon name="close" />
          </button>
        </header>
      )}
      {children}
    </div>
  );
}

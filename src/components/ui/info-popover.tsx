"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { createPortal } from "react-dom";

import { positionInfoPopover } from "./info-popover-position";
import { createInfoInteraction } from "./info-popover-interaction";
import styles from "./info-popover.module.css";

const OPEN_EVENT = "travelassist:info-popover-open";

interface InfoPopoverProps {
  children?: ReactNode;
  label?: string;
  text?: ReactNode;
}

/** Non-interactive help only. Selection and input controls belong in a dialog. */
export function InfoPopover({
  children,
  label = "查看说明",
  text,
}: InfoPopoverProps) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const surfaceRef = useRef<HTMLDivElement>(null);
  const [interaction] = useState(() =>
    createInfoInteraction({
      onOpen() {
        document.dispatchEvent(new CustomEvent(OPEN_EVENT, { detail: id }));
        setOpen(true);
      },
      onClose() {
        setOpen(false);
      },
    }),
  );

  useEffect(() => {
    function anotherOpened(event: Event) {
      if (event instanceof CustomEvent && event.detail !== id)
        interaction.dismiss();
    }
    document.addEventListener(OPEN_EVENT, anotherOpened);
    return () => {
      document.removeEventListener(OPEN_EVENT, anotherOpened);
      interaction.dispose();
    };
  }, [interaction, id]);

  useLayoutEffect(() => {
    if (!open) return;
    function position() {
      const trigger = triggerRef.current;
      const surface = surfaceRef.current;
      if (!trigger || !surface) return;
      const { left, top } = positionInfoPopover({
        anchor: trigger.getBoundingClientRect(),
        width: surface.offsetWidth,
        height: surface.offsetHeight,
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
      });
      surface.style.left = `${left}px`;
      surface.style.top = `${top}px`;
    }
    position();
    window.addEventListener("resize", position);
    window.addEventListener("scroll", position, true);
    return () => {
      window.removeEventListener("resize", position);
      window.removeEventListener("scroll", position, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function outside(event: PointerEvent) {
      if (
        event.target instanceof Node &&
        !triggerRef.current?.contains(event.target) &&
        !surfaceRef.current?.contains(event.target)
      )
        interaction.dismiss();
    }
    function escape(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      // Dismiss help first, without also closing an enclosing modal or menu.
      event.preventDefault();
      event.stopPropagation();
      interaction.dismiss();
    }
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape, true);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape, true);
    };
  }, [interaction, open]);

  return (
    <>
      <button
        aria-label={label}
        aria-describedby={open ? id : undefined}
        className={styles.trigger}
        data-info-trigger
        ref={triggerRef}
        type="button"
        onPointerDown={(event) => {
          interaction.pointerDown(event.pointerType);
        }}
        onPointerEnter={(event) => {
          interaction.pointerEnter(event.pointerType);
        }}
        onPointerLeave={(event) => {
          interaction.pointerLeave(event.pointerType);
        }}
        onFocus={interaction.focus}
        onBlur={interaction.blur}
        onClick={interaction.activate}
        onKeyDown={(event) => {
          if (event.key === "Escape" && interaction.isActive()) {
            event.preventDefault();
            event.stopPropagation();
            interaction.dismiss();
          }
        }}
      >
        ?
      </button>
      {open
        ? createPortal(
            <div
              className={styles.surface}
              id={id}
              ref={surfaceRef}
              role="tooltip"
              onPointerEnter={interaction.surfaceEnter}
              onPointerLeave={interaction.surfaceLeave}
            >
              {text ?? children}
            </div>,
            document.body,
          )
        : null}
    </>
  );
}

import Link from "next/link";
import { forwardRef } from "react";
import type { ButtonHTMLAttributes, ComponentProps } from "react";

import styles from "./button.module.css";

type ButtonVariant = "primary" | "secondary" | "ghost";
type ButtonSize = "small" | "medium" | "large";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export type ButtonLinkProps = ComponentProps<typeof Link> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
};

function getButtonClassName(
  variant: ButtonVariant,
  size: ButtonSize,
  className?: string,
) {
  return [styles.button, styles[variant], styles[size], className]
    .filter(Boolean)
    .join(" ");
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    {
      className,
      type = "button",
      variant = "primary",
      size = "medium",
      ...props
    },
    ref,
  ) {
    return (
      <button
        className={getButtonClassName(variant, size, className)}
        ref={ref}
        type={type}
        {...props}
      />
    );
  },
);

export function ButtonLink({
  className,
  size = "medium",
  variant = "primary",
  ...props
}: ButtonLinkProps) {
  return (
    <Link className={getButtonClassName(variant, size, className)} {...props} />
  );
}

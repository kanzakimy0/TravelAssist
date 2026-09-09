import Image from "next/image";
import type { ComponentProps } from "react";

/** The accepted Personal Center wordmark; hosts retain their Link/GuardedLink. */
export function BrandLogo(
  props: Omit<ComponentProps<typeof Image>, "src" | "alt">,
) {
  return (
    <Image
      {...props}
      src="/media/personal-center/travelassist-logo-torii.png"
      alt=""
    />
  );
}

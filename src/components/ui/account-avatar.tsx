"use client";
import { useState } from "react";
import Image from "next/image";
import styles from "./account-avatar.module.css";

/** Visual only: the caller supplies a validated image; missing/broken images stay neutral. */
export function AccountAvatar({
  src,
  unoptimized = false,
}: {
  src?: string;
  unoptimized?: boolean;
}) {
  const [failedSrc, setFailedSrc] = useState<string>();
  return (
    <span className={styles.avatar} aria-hidden="true" data-account-avatar>
      {src && src !== failedSrc ? (
        <Image
          unoptimized={unoptimized}
          src={src}
          onError={() => setFailedSrc(src)}
          alt=""
          fill
          sizes="38px"
          className={styles.photo}
        />
      ) : (
        "旅"
      )}
    </span>
  );
}

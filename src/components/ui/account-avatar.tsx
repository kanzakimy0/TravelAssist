import Image from "next/image";
import styles from "./account-avatar.module.css";

/** Visual only: guests retain a neutral initial; B supplies its existing demo image. */
export function AccountAvatar({ src }: { src?: string }) {
  return (
    <span className={styles.avatar} aria-hidden="true" data-account-avatar>
      {src ? (
        <Image src={src} alt="" fill sizes="38px" className={styles.photo} />
      ) : (
        "旅"
      )}
    </span>
  );
}

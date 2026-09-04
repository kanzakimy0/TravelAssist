import styles from "./dynamic-background-layer.module.css";

export function DynamicBackgroundLayer() {
  return (
    <div aria-hidden="true" className={styles.scene}>
      <div className={styles.glow} />
      <div className={styles.sun} />
      <svg
        className={styles.landscape}
        focusable="false"
        preserveAspectRatio="xMidYMid slice"
        viewBox="0 0 1600 900"
      >
        <path
          className={styles.mountainFar}
          d="M-80 706 C150 548 316 662 510 565 C720 460 865 535 1058 575 C1270 619 1412 510 1680 590 V980 H-80Z"
        />
        <path
          className={styles.mountainNear}
          d="M-80 770 C168 630 370 755 604 660 C830 570 1008 650 1218 710 C1392 760 1536 672 1680 690 V980 H-80Z"
        />
        <path
          className={styles.horizonLine}
          d="M-30 721 C245 590 390 730 646 632 C890 538 1054 625 1260 684 C1425 731 1530 664 1640 650"
        />
      </svg>
      <svg
        className={styles.route}
        focusable="false"
        preserveAspectRatio="xMidYMid meet"
        viewBox="0 0 1600 900"
      >
        <path d="M232 770 C405 625 520 548 688 431 C842 324 995 292 1174 344" />
        <circle cx="416" cy="625" r="10" />
        <circle cx="686" cy="433" r="10" />
        <circle cx="1015" cy="310" r="10" />
      </svg>
      <div className={styles.scrim} />
    </div>
  );
}

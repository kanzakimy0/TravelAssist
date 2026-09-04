import { existsSync } from "node:fs";
import { join } from "node:path";

import Image from "next/image";

import styles from "./immersive-background.module.css";

const POSTER_PATH = "/media/home/home-hero-poster.webp";
const WEBM_PATH = "/media/home/home-hero.webm";
const MP4_PATH = "/media/home/home-hero.mp4";

interface VideoBackgroundProps {
  hasMp4: boolean;
  hasWebm: boolean;
}

export function PosterFallback() {
  return (
    <Image
      alt=""
      className={styles.poster}
      fill
      preload
      sizes="100vw"
      src={POSTER_PATH}
    />
  );
}

export function VideoBackground({ hasMp4, hasWebm }: VideoBackgroundProps) {
  if (!hasWebm && !hasMp4) {
    return null;
  }

  return (
    <video
      autoPlay
      className={styles.video}
      loop
      muted
      playsInline
      poster={POSTER_PATH}
      preload="metadata"
    >
      {hasWebm ? <source src={WEBM_PATH} type="video/webm" /> : null}
      {hasMp4 ? <source src={MP4_PATH} type="video/mp4" /> : null}
    </video>
  );
}

export function ReadabilityOverlay() {
  return (
    <>
      <div className={styles.warmOverlay} />
      <div className={styles.readabilityOverlay} />
    </>
  );
}

export function ImmersiveBackground() {
  const mediaDirectory = join(process.cwd(), "public", "media", "home");
  const hasWebm = existsSync(join(mediaDirectory, "home-hero.webm"));
  const hasMp4 = existsSync(join(mediaDirectory, "home-hero.mp4"));

  return (
    <div aria-hidden="true" className={styles.background}>
      <PosterFallback />
      <VideoBackground hasMp4={hasMp4} hasWebm={hasWebm} />
      <ReadabilityOverlay />
    </div>
  );
}

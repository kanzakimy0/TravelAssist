export interface HomeViewer {
  name: string;
  avatar?: string;
}

/** Only call with user metadata returned by auth.getUser(), never cookie claims. */
export function homeViewerFromVerifiedUser(user: {
  user_metadata?: Record<string, unknown>;
}): HomeViewer {
  const metadata = user.user_metadata ?? {};
  const name = [metadata.display_name, metadata.full_name, metadata.name].find(
    (value): value is string =>
      typeof value === "string" && value.trim().length > 0,
  );
  const candidate = metadata.avatar_url;
  let avatar: string | undefined;
  if (typeof candidate === "string") {
    try {
      const url = new URL(candidate);
      if (url.protocol === "https:" && !url.username && !url.password)
        avatar = url.href;
    } catch {
      /* Invalid profile images use the shared neutral avatar. */
    }
  }
  return { name: name?.trim().slice(0, 60) || "个人中心", avatar };
}

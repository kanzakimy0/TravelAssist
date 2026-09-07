export const personalNavigation = [
  // Keep the accepted desktop destination pair together for the navigation freeze test.
  // prettier-ignore
  { href: "/personal-center", label: "我的首页", mobileLabel: "首页", icon: "home" },
  {
    href: "/personal-center/trips",
    label: "我的旅行",
    mobileLabel: "旅行",
    icon: "trips",
  },
  {
    href: "/personal-center/preferences",
    label: "旅行偏好",
    mobileLabel: "偏好",
    icon: "heart",
  },
  {
    href: "/personal-center/companions",
    label: "同行人",
    mobileLabel: "同行人",
    icon: "people",
  },
  {
    href: "/personal-center/account",
    label: "账户",
    mobileLabel: "账户",
    icon: "account",
  },
] as const;

// Presentation-only identity: never treat this as an authenticated session.
export const mockPersonalUser = {
  name: "Yuki",
  initial: "Y",
  label: "Mock 用户",
  avatar: "/media/personal-center/avatar-yuki.webp",
};

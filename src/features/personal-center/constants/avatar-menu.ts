import { personalNavigation } from "./personal-navigation";

// Public B-owned targets; reuse the Shell routes without creating another IA.
export const avatarMenuItems = personalNavigation.map((item) => ({
  ...item,
  label:
    item.icon === "home"
      ? "查看个人中心"
      : item.icon === "account"
        ? "账户设置"
        : item.label,
}));

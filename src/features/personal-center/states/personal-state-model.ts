export const personalResponsiveModes = {
  wideDesktop: { min: 1280 },
  compactDesktop: { min: 1024, max: 1279 },
  tabletPortrait: { min: 768, max: 1023 },
  mobile: { max: 767 },
} as const;

export const personalPageStateKinds = [
  "loading",
  "ready",
  "empty",
  "error",
  "offline",
  "authExpired",
  "permissionUnavailable",
] as const;

export const personalModuleStateKinds = [
  "loading",
  "partialError",
  "empty",
  "stale",
  "permissionUnavailable",
  "authExpired",
] as const;

export const personalActionStateKinds = [
  "idle",
  "submitting",
  "success",
  "error",
  "disabled",
] as const;

export type PersonalModuleStateKind = (typeof personalModuleStateKinds)[number];

export const personalStateCopy = {
  pageError: {
    title: "暂时无法加载这个页面",
    description: "您的数据没有丢失。",
    retry: "重新加载",
    returnHome: "返回个人中心",
  },
  partialError: {
    title: "部分内容暂时不可用",
    description: "其他页面内容不受影响。",
    action: "重试",
  },
  offline: {
    title: "当前处于离线状态",
    description: "部分信息可能不是最新内容。",
  },
  authExpired: {
    title: "登录状态已过期",
    description: "为了保护您的账户，请重新登录。",
    action: "重新登录",
  },
  permissionUnavailable: {
    title: "权限暂时不可用",
    description: "其他页面内容不受影响。",
    action: "重试",
  },
} as const;

import type { RouteError } from "../../../shared/contracts/routes";

/** Safe UI copy only. Never forward a Provider or transport message to the page. */
export function routeErrorPresentation(error: RouteError | null) {
  if (error?.metadata.reason === "unauthorized")
    return {
      title: "请重新登录",
      description: "登录后再继续此操作；当前行程保持不变。",
      retryable: false,
    };
  if (error?.metadata.reason === "provider_not_configured")
    return {
      title: "路线查询尚未开放",
      description: "当前仅展示已有估算，不能据此确认真实班次或票价。",
      retryable: false,
    };
  if (error?.code === "unsupported_mode" || error?.code === "invalid_request")
    return {
      title: "暂时无法查询此路线",
      description: "请检查已支持的站点、时间和出行方式；当前行程保持不变。",
      retryable: false,
    };
  return {
    title: "暂时无法查询路线",
    description: error?.retryable
      ? "行程安排保持不变；您可以稍后重试此段查询。"
      : "行程安排保持不变；请返回可用内容。",
    retryable: error?.retryable === true,
  };
}

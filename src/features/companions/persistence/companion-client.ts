import {
  CompanionApiError,
  companionErrorStatuses,
  type CompanionErrorCode,
  type CompanionResource,
  type CompanionGroupResource,
} from "./companion-resource";
type Resource = CompanionResource | CompanionGroupResource;
async function request<T>(
  path: string,
  method = "GET",
  body?: unknown,
  revision?: number,
): Promise<T> {
  const response = await fetch(path, {
    method,
    credentials: "same-origin",
    cache: "no-store",
    headers: {
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
      ...(revision === undefined ? {} : { "If-Match": '"' + revision + '"' }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (response.status === 204) return undefined as T;
  const result = await response.json();
  if (!response.ok || !result.ok) {
    const code = result.error?.code;
    throw new CompanionApiError(
      typeof code === "string" && Object.hasOwn(companionErrorStatuses, code)
        ? (code as CompanionErrorCode)
        : "COMPANION_UNAVAILABLE",
    );
  }
  return result.data as T;
}
export const companionClient = {
  async load() {
    const [companions, groups] = await Promise.all([
      request<{ companions: CompanionResource[] }>("/api/companions"),
      request<{ groups: CompanionGroupResource[] }>("/api/companion-groups"),
    ]);
    return { companions: companions.companions, groups: groups.groups };
  },
  save<T extends Resource>(group: boolean, body: unknown, current?: T) {
    const path = group ? "/api/companion-groups" : "/api/companions";
    return request<T>(
      path + (current ? "/" + current.id : ""),
      current ? "PUT" : "POST",
      body,
      current?.revision,
    );
  },
  remove(group: boolean, current: Resource) {
    return request<void>(
      (group ? "/api/companion-groups/" : "/api/companions/") + current.id,
      "DELETE",
      undefined,
      current.revision,
    );
  },
};
export function companionErrorMessage(error: unknown) {
  if (error instanceof CompanionApiError) {
    if (error.code.startsWith("STALE_"))
      return "资料已在其他设备更新。本地编辑仍保留，请重新读取服务器版本后再确认保存。";
    if (error.code === "AUTH_REQUIRED")
      return "登录已失效，请重新登录；本次编辑仍保留。";
    if (error.code.includes("LIMIT_REACHED"))
      return "已达到可保存数量上限，请删除不再使用的资料后重试。";
    if (error.code === "COMPANION_GROUP_MEMBER_INVALID")
      return "部分成员已不可用，请重新读取服务器资料。";
    if (error.code.includes("NOT_FOUND"))
      return "资料已被删除或不可用，本次编辑仍保留。";
    if (error.code.startsWith("INVALID_"))
      return "资料格式无效，请检查姓名、出生日期和选项。";
  }
  return "读取或保存失败，本次编辑仍保留，请重试。";
}

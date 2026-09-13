import {
  ProfileApiError,
  profileErrorStatuses,
  type ProfileErrorCode,
  parseProfileAccountViewV1,
  parseEmergencyContactViewV1,
  parseEmergencyContactId,
  parseUpdateProfileAccountV1,
  parseCreateEmergencyContactV1,
  parseUpdateEmergencyContactV1,
} from "../domain/profile-account-v1";

export function profileClient(transport: typeof fetch = fetch) {
  async function request(
    path: string,
    method = "GET",
    body?: unknown,
    signal?: AbortSignal,
  ) {
    const response = await transport(path, {
      method,
      signal,
      credentials: "same-origin",
      cache: "no-store",
      headers: body === undefined ? {} : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    if (method === "DELETE" && response.status === 204) return;
    const result = await response.json().catch(() => null);
    if (!response.ok || result?.ok !== true) {
      const code = result?.error?.code;
      throw new ProfileApiError(
        typeof code === "string" && Object.hasOwn(profileErrorStatuses, code)
          ? (code as ProfileErrorCode)
          : "PROFILE_UNAVAILABLE",
      );
    }
    if (
      response.status !== (method === "POST" ? 201 : 200) ||
      method === "DELETE"
    )
      throw new ProfileApiError("PROFILE_UNAVAILABLE");
    return result.data;
  }
  function validated<T>(parse: (input: unknown) => T, input: unknown): T {
    try {
      return parse(input);
    } catch {
      throw new ProfileApiError("PROFILE_UNAVAILABLE");
    }
  }
  return {
    async read(signal?: AbortSignal) {
      return validated(
        parseProfileAccountViewV1,
        await request("/api/profile", "GET", undefined, signal),
      );
    },
    async patch(input: unknown) {
      const body = parseUpdateProfileAccountV1(
        input,
        new Date().toISOString().slice(0, 10),
      );
      return validated(
        parseProfileAccountViewV1,
        await request("/api/profile", "PATCH", body),
      );
    },
    async saveContact(input: unknown, id?: string) {
      const path =
        "/api/emergency-contacts" +
        (id ? "/" + parseEmergencyContactId(id) : "");
      const body = id
        ? parseUpdateEmergencyContactV1(input)
        : parseCreateEmergencyContactV1(input);
      return validated(
        parseEmergencyContactViewV1,
        await request(path, id ? "PATCH" : "POST", body),
      );
    },
    async deleteContact(id: string) {
      await request(
        "/api/emergency-contacts/" + parseEmergencyContactId(id),
        "DELETE",
      );
    },
  };
}
export function profileErrorMessage(error: unknown) {
  if (error instanceof ProfileApiError) {
    if (error.code === "AUTH_REQUIRED") return "登录已失效，请重新登录。";
    if (error.code === "INVALID_REQUEST")
      return "资料格式无效，请检查日期、国家代码、邮箱及国际电话号码；编辑仍保留。";
    if (error.code === "EMERGENCY_CONTACT_NOT_FOUND")
      return "联系人已不可用，请重新读取资料。";
  }
  return "读取或保存失败，尚未确认保存成功；请重试。";
}

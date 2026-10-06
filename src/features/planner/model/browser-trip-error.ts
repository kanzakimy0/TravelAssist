// These exact, bounded messages originate in the existing local persistence code.
// Everything else (including Error.message from Storage/SDKs) uses safe copy.
const knownMessages = new Set([
  "行程数据未通过检查，未覆盖已保存版本。",
  "另一页面已更新本地行程，请先打开已保存版本再编辑；您的修改仍保留在当前页。",
  "另一页面已更新本地行程，请先打开已保存版本。未切换方案。",
  "草稿记录无法读取，未覆盖原始数据。",
  "草稿记录未通过校验，未覆盖原始数据。",
  "草稿已达50份，请先备份清理；当前方案未切换。",
  "当前草稿未通过检查，未切换方案。",
  "其他页面已修改草稿，请重新操作。",
]);
export function browserTripErrorMessage(cause: unknown) {
  return cause instanceof Error && knownMessages.has(cause.message)
    ? cause.message
    : "暂时无法保存到此浏览器。当前修改仍在；刷新或离开后，未保存内容可能无法恢复。";
}

/** Display compatibility for saved plans carrying the previous brand route paint. */
export function displayRouteColor(color: string): string {
  return ["#b95849", "#a74739", "#b66c5d", "#ab674b"].includes(
    color.toLowerCase(),
  )
    ? "#e95b4b"
    : color;
}

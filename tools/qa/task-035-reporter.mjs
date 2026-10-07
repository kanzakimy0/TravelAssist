// Only runner events, never child stdout/TAP, contribute to counts.
export default async function* reporter(source) {
  for await (const event of source) {
    if (event.type === "test:summary")
      yield JSON.stringify({ type: event.type, ...event.data }) + "\n";
  }
}

import { readHomeViewer } from "@/lib/auth/home-viewer.server";
import { StartPage } from "@/features/start-flow/start-page";
import { parseStartEntry } from "@/features/navigation/main-flow-navigation";

interface StartRouteProps {
  searchParams: Promise<{ entry?: string | string[] }>;
}

export default async function Page({ searchParams }: StartRouteProps) {
  const { entry } = await searchParams;
  return (
    <StartPage entry={parseStartEntry(entry)} viewer={await readHomeViewer()} />
  );
}

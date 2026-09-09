import { notFound } from "next/navigation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  if (process.env.TASK_024_FAULT_INJECTION !== "1") notFound();
  throw new Error("Task024ControlledServerError");
}

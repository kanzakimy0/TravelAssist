import "server-only";

import type { PersonalAiHistoryReader } from "./reader";

/** No WBS 8.7/8.8 durable source exists. Never substitute fixture history. */
export const productionAiHistoryReader: PersonalAiHistoryReader = {
  async listHistory() {
    return { status: "unavailable" };
  },
  async readHistoryDetail() {
    return { status: "unavailable" };
  },
};

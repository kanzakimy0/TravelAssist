import { buildData } from "./core-generation-common.mjs";
import { publishResolution } from "./japan-destination-resolution.mjs";
await publishResolution(buildData().destinations);

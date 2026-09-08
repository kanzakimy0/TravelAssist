import {
  parseTripDraftFacts,
  parseWizardProgress,
  type TripDraftFactsV1,
  type WizardProgressV1,
} from "../trips";
import {
  invalid,
  integer,
  object,
  oneOf,
  parse,
  type Parser,
  type Parsed,
} from "../trips/validation";
import { preferenceEnvelope, preferencePatch, uuid } from "./index";

const facts: Parser<TripDraftFactsV1> = (input, path) => {
  const result = parseTripDraftFacts(input);
  if (!result.ok) invalid(path, result.issue.code);
  return result.value;
};
const progress: Parser<WizardProgressV1> = (input, path) => {
  const result = parseWizardProgress(input);
  if (!result.ok) invalid(path, result.issue.code);
  return result.value;
};
export const draftContent = object({ facts, progress });
export type DraftContent = Parsed<typeof draftContent>;
export const createDraftInput = object({
  creationKey: uuid,
  ...{ content: draftContent },
});
export const updateDraftInput = object({
  id: uuid,
  revision: integer(1, 2147483646),
  content: draftContent,
});
export const updatePreferenceInput = object({
  revision: integer(0, 2147483646),
  patch: preferencePatch,
});
export const updateOverrideInput = object({
  id: uuid,
  revision: integer(1, 2147483646),
  patch: preferencePatch,
});
export const draftResponse = object({
  id: uuid,
  creationKey: uuid,
  status: oneOf(["active", "archived"]),
  revision: integer(1),
  content: draftContent,
  snapshot: preferenceEnvelope,
  sourcePreferenceRevision: integer(0),
  overrides: preferenceEnvelope,
  overrideRevision: integer(1),
  effective: preferenceEnvelope,
});
export type DraftResponse = Parsed<typeof draftResponse>;
export const parseDraftResponse = (input: unknown) =>
  parse(draftResponse, input);

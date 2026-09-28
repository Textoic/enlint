import type { LintError } from "../src/types/index.js";

export const caseFrom = (problem: LintError | undefined) =>
  problem?.case == null ? {} : { case: problem.case };

// PLACEHOLDER written by the scaffold; the extras agent replaces this file.
import { el } from "../../dom";
import { heading, type StepView } from "../context";

export const extrasStep: StepView = (_ctx, panel) => {
  panel.append(heading("Coming soon", "Extras"), el("p", null, "This step is being built."));
};

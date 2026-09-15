// PLACEHOLDER written by the scaffold; the phone agent replaces this file.
import { el } from "../../dom";
import { heading, type StepView } from "../context";

export const phoneStep: StepView = (_ctx, panel) => {
  panel.append(heading("Coming soon", "The phone"), el("p", null, "This step is being built."));
};

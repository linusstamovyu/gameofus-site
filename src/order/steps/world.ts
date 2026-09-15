// PLACEHOLDER written by the scaffold; the world agent replaces this file.
import { el } from "../../dom";
import { heading, type StepView } from "../context";

export const worldStep: StepView = (_ctx, panel) => {
  panel.append(heading("Coming soon", "Your world"), el("p", null, "This step is being built."));
};

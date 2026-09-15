// PLACEHOLDER written by the scaffold; the keepsakes agent replaces this file.
import { el } from "../../dom";
import { heading, type StepView } from "../context";

export const keepsakesStep: StepView = (_ctx, panel) => {
  panel.append(heading("Coming soon", "Keepsakes"), el("p", null, "This step is being built."));
};

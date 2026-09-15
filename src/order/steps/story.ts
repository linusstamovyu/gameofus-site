// PLACEHOLDER written by the scaffold; the story agent replaces this file.
import { el } from "../../dom";
import { heading, type StepView } from "../context";

export const storyStep: StepView = (_ctx, panel) => {
  panel.append(heading("Coming soon", "Your story"), el("p", null, "This step is being built."));
};

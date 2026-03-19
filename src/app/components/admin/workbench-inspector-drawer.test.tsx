import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { WorkbenchInspectorDrawer } from "./WorkbenchInspectorDrawer";

const context = {
  title: "Image Base Inspector",
  description: "Inspect workspace context",
  stats: [
    { label: "Selection", value: "None" },
    { label: "Surface", value: "Image Base" },
  ],
  actions: [{ id: "inspect.selection", label: "Inspect Selection" }],
};

describe("WorkbenchInspectorDrawer", () => {
  it("does not render when closed", () => {
    render(
      <WorkbenchInspectorDrawer
        isOpen={false}
        onClose={() => {}}
        context={context}
      />,
    );
    expect(screen.queryByTitle("Close inspector (Esc)")).toBeNull();
  });

  it("renders when open", () => {
    render(
      <WorkbenchInspectorDrawer
        isOpen={true}
        onClose={() => {}}
        context={context}
      />,
    );
    expect(screen.getByTitle("Close inspector (Esc)")).toBeTruthy();
  });
});

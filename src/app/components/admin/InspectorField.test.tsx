/** @vitest-environment jsdom */
import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { InspectorField } from "./InspectorField";

describe("InspectorField", () => {
  it("renders select fields and emits selected value", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <InspectorField
        field={{ key: "dyeing.compatibility", label: "Compatibility", type: "select", options: ["good", "fair"] }}
        value=""
        onChange={onChange}
      />
    );

    await user.selectOptions(screen.getByRole("combobox"), "good");
    expect(onChange).toHaveBeenCalledWith("good");
  });

  it("renders toggle fields and emits boolean values", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <InspectorField
        field={{ key: "sustainability.biodegradable", label: "Biodegradable", type: "toggle" }}
        value={false}
        onChange={onChange}
      />
    );

    await user.click(screen.getByRole("button", { name: "Biodegradable" }));
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it("renders chips fields and emits token array", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <InspectorField
        field={{ key: "sourcing.primaryRegions", label: "Regions", type: "chips" }}
        value={["India"]}
        onChange={onChange}
      />
    );

    const input = screen.getByRole("textbox");
    await user.type(input, "EU{enter}");
    expect(onChange).toHaveBeenLastCalledWith(["India", "EU"]);
  });
});

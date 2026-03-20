export type AdminView =
  | "list"
  | "edit"
  | "changes"
  | "batch"
  | "health"
  | "staging"
  | "diff"
  | "changesets"
  | "sequence"
  | "knowledge";

export type AdminWorkflowPhase = "discover" | "inspect" | "edit" | "validate" | "commit";

export function mapAdminViewToWorkflowPhase(view: AdminView): AdminWorkflowPhase {
  switch (view) {
    case "list":
      return "discover";
    case "knowledge":
    case "sequence":
      return "inspect";
    case "edit":
    case "batch":
      return "edit";
    case "health":
    case "staging":
    case "diff":
      return "validate";
    case "changes":
    case "changesets":
      return "commit";
    default:
      return "discover";
  }
}

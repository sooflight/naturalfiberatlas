export interface AdminCommandContext {
  selectionId: string | null;
  navigate: (to: string) => void;
}

export interface AdminCommand {
  id: string;
  label: string;
  requiresSelection?: boolean;
  run: (ctx: AdminCommandContext) => void | Promise<void>;
}

export function createAdminCommands(): AdminCommand[] {
  return [
    {
      id: "workspace.open",
      label: "Open Admin Workspace",
      run: ({ navigate }) => navigate("/admin"),
    },
    {
      id: "images.open",
      label: "Open Image Workspace",
      run: ({ navigate, selectionId }) => {
        if (selectionId) {
          navigate(`/admin/images?fiber=${encodeURIComponent(selectionId)}`);
          return;
        }
        navigate("/admin/images");
      },
    },
    {
      id: "editor.open",
      label: "Open Selected Editor",
      requiresSelection: true,
      run: ({ navigate, selectionId }) => {
        if (!selectionId) return;
        navigate(`/admin/${encodeURIComponent(selectionId)}`);
      },
    },
  ];
}


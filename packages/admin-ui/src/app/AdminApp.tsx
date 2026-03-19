import type { ComponentType } from "react";
import { createBrowserRouter, RouterProvider } from "react-router";
import { createAdminRoutes } from "./AdminRoutes";

interface AdminAppProps {
  AdminScreen: ComponentType;
}

export function AdminApp({ AdminScreen }: AdminAppProps) {
  const router = createBrowserRouter(createAdminRoutes(AdminScreen));
  return <RouterProvider router={router} />;
}

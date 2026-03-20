import { RouterProvider } from "react-router";
import { router } from "./routes";

export default function App() {
  return <RouterProvider router={router} fallbackElement={<div className="min-h-dvh bg-[#111111]" />} />;
}

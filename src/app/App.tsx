import { RouterProvider } from "react-router";
import { SpeedInsights } from "@vercel/speed-insights/react";
import { router } from "./routes";

export default function App() {
  return (
    <>
      <RouterProvider router={router} fallbackElement={<div className="min-h-atlas-vvh bg-[#111111]" />} />
      <SpeedInsights />
    </>
  );
}

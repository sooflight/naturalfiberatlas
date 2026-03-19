/**
 * root-layout.tsx — Shared layout that wraps all pages.
 *
 * Provides AtlasDataProvider, ImagePipelineProvider, and the admin
 * overlay layer (drawer + toolbar) that persists across route changes.
 */

import { Outlet } from "react-router";
import { useEffect, useRef } from "react";
import { AtlasDataProvider } from "../context/atlas-data-context";
import { ImagePipelineProvider } from "../context/image-pipeline";
import { cloudinaryPipeline } from "../pipelines/cloudinary";
import { Toaster } from "sonner";
import { useLocation } from "react-router";
import { trackAdminRouteTransition } from "../components/admin/runtime/admin-metrics";
import {
  AdminSettingsProvider,
  useAdminSettings,
} from "../components/admin/runtime/admin-settings-context";

function RootLayoutContent() {
  const location = useLocation();
  const previousPathRef = useRef(location.pathname);
  const { hasUnsavedChanges, guardrailCopy } = useAdminSettings();

  useEffect(() => {
    const previousPath = previousPathRef.current;
    const nextPath = location.pathname;
    if (previousPath !== nextPath && (previousPath.startsWith("/admin") || nextPath.startsWith("/admin"))) {
      trackAdminRouteTransition(previousPath, nextPath);
    }
    previousPathRef.current = nextPath;
  }, [location.pathname]);

  useEffect(() => {
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!hasUnsavedChanges) return;
      event.preventDefault();
      event.returnValue = guardrailCopy.unsavedNavigationPrompt;
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [guardrailCopy.unsavedNavigationPrompt, hasUnsavedChanges]);

  return (
    <ImagePipelineProvider pipeline={cloudinaryPipeline}>
      <Outlet />
      <Toaster
        position="bottom-left"
        theme="dark"
        toastOptions={{
          style: {
            background: "rgba(13,13,13,0.92)",
            border: "1px solid rgba(255,255,255,0.06)",
            backdropFilter: "blur(24px)",
            color: "rgba(255,255,255,0.7)",
            fontSize: "11px",
          },
        }}
      />
    </ImagePipelineProvider>
  );
}

export function RootLayout() {
  return (
    <AtlasDataProvider>
      <AdminSettingsProvider>
        <RootLayoutContent />
      </AdminSettingsProvider>
    </AtlasDataProvider>
  );
}
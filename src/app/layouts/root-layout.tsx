/**
 * root-layout.tsx — Shared layout that wraps all pages.
 *
 * Provides AtlasDataProvider, ImagePipelineProvider, and the admin
 * overlay layer (drawer + toolbar) that persists across route changes.
 */

import { Outlet, useLocation } from "react-router";
import { useEffect, useRef } from "react";
import { AtlasDataProvider } from "../context/atlas-data-context";
import { ImagePipelineProvider } from "../context/image-pipeline";
import { cloudinaryPipeline } from "../pipelines/cloudinary";
import { Toaster } from "sonner";
import { trackAdminRouteTransition } from "../components/admin/runtime/admin-metrics";
import { SeoManager } from "../components/seo/SeoManager";
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

  const isAdminSurface =
    location.pathname.startsWith("/admin")
    || location.pathname.startsWith("/workbench")
    || location.pathname.startsWith("/db")
    || location.pathname.startsWith("/canvas");

  return (
    <ImagePipelineProvider pipeline={cloudinaryPipeline}>
      {!isAdminSurface ? <SeoManager /> : null}
      <Outlet />
      <Toaster
        position="top-center"
        offset={{ top: "max(12px, env(safe-area-inset-top, 0px))" }}
        theme="dark"
        toastOptions={{
          style: {
            background: "rgba(13,13,13,0.92)",
            border: "1px solid rgba(255,255,255,0.06)",
            backdropFilter: "blur(24px)",
            color: "rgba(255,255,255,0.78)",
            fontSize: "12px",
            lineHeight: 1.45,
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
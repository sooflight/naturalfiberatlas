import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { inject } from "@vercel/analytics";
import App from "./app/App";
import "./styles/index.css";
import { isAdminEnabled } from "./app/config/admin-access";
import { syncAtlasStorageFromFrontendSource } from "./app/utils/admin/dev-storage-sync";
import { installAtlasVisualViewportHeightSync } from "./app/utils/atlas-visual-viewport-height";

async function bootstrap() {
  installAtlasVisualViewportHeightSync();

  if (isAdminEnabled()) {
    await syncAtlasStorageFromFrontendSource();
  }
  
  // Initialize Vercel Analytics
  inject();
  
  const rootElement = document.getElementById("root");
  if (!rootElement) {
    throw new Error('Root container "#root" not found');
  }
  createRoot(rootElement).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}

void bootstrap();
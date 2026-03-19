import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./app/App";
import "./styles/index.css";
import { isAdminEnabled } from "./app/config/admin-access";
import { syncAtlasStorageFromFrontendSource } from "./app/utils/admin/dev-storage-sync";

async function bootstrap() {
  if (isAdminEnabled()) {
    await syncAtlasStorageFromFrontendSource();
  }
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
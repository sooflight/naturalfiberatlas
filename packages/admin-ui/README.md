# @natural-fiber-atlas/admin-ui

Admin UI package scaffold for host React applications.

## Install

```bash
npm install @natural-fiber-atlas/admin-ui react react-dom react-router
```

## Styles

Import the default host-safe stylesheet in the host app entrypoint:

`import "@natural-fiber-atlas/admin-ui/styles.css";`

## Minimal Host Setup

```tsx
import { AdminHostProvider } from "@natural-fiber-atlas/admin-ui";
import "@natural-fiber-atlas/admin-ui/styles.css";

const hostConfig = {
  auth: { getAccessToken: () => null },
  runtime: { apiBaseUrl: "/api/admin" },
};

export function AdminMount({ children }: { children: React.ReactNode }) {
  return <AdminHostProvider config={hostConfig}>{children}</AdminHostProvider>;
}
```

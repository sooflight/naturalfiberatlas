import { Link, isRouteErrorResponse, useRouteError } from "react-router";

function getErrorMessage(error: unknown): string {
  if (isRouteErrorResponse(error)) {
    return `${error.status} ${error.statusText}`;
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return "Unexpected navigation error.";
}

export function RouteErrorPage() {
  const error = useRouteError();
  const message = getErrorMessage(error);

  return (
    <div className="min-h-dvh bg-[#111111] text-white flex items-center justify-center p-6">
      <div className="max-w-md text-center space-y-4">
        <p className="text-white/20 tracking-[0.2em] uppercase text-xs">Navigation error</p>
        <p className="text-white/70 text-sm">{message}</p>
        <p className="text-white/30 text-xs">
          Refresh or return to Atlas to continue browsing fibers.
        </p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-white/60 hover:text-white/85 hover:border-white/20 transition-colors text-xs"
        >
          Return to Atlas
        </Link>
      </div>
    </div>
  );
}

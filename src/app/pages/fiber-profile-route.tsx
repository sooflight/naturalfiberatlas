import { Navigate, useParams } from "react-router";
import { resolveCanonicalFiberId } from "../data/fiber-id-redirects";
import { dataSource } from "../data/data-provider";
import { NotFoundPage } from "./not-found";

/**
 * Renders inside `<Outlet />` below the atlas shell when URL is `/fiber/:fiberId`.
 * Invalid ids show a full-viewport not-found layer so the grid shell stays mounted.
 */
export function FiberRouteOutlet() {
  const { fiberId } = useParams<{ fiberId: string }>();
  const decoded = fiberId ? decodeURIComponent(fiberId) : "";
  const canonical = decoded ? resolveCanonicalFiberId(decoded) : "";
  if (decoded && canonical !== decoded) {
    return <Navigate to={`/fiber/${encodeURIComponent(canonical)}`} replace />;
  }
  if (!decoded || !dataSource.getFiberById(decoded)) {
    return (
      <div className="atlas-fixed-fill-screen z-[120] bg-[#111111] overflow-auto">
        <NotFoundPage />
      </div>
    );
  }
  return null;
}

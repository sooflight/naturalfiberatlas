import { useParams } from "react-router";
import { dataSource } from "../data/data-provider";
import { NotFoundPage } from "./not-found";
import { HomePage } from "./home";

/**
 * Validates :fiberId against the atlas, then renders the main grid shell.
 */
export function FiberProfileRoute() {
  const { fiberId } = useParams<{ fiberId: string }>();
  const decoded = fiberId ? decodeURIComponent(fiberId) : "";
  if (!decoded || !dataSource.getFiberById(decoded)) {
    return <NotFoundPage />;
  }
  return <HomePage />;
}

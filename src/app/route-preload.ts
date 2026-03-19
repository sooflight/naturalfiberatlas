export function createRetryablePreloader<T>(loader: () => Promise<T>): () => Promise<T> {
  let promise: Promise<T> | null = null;
  return () => {
    if (!promise) {
      promise = loader().catch((error) => {
        // Allow retry after transient chunk/network failures.
        promise = null;
        throw error;
      });
    }
    return promise;
  };
}

const preloadHome = createRetryablePreloader(() => import("./pages/home"));
const preloadAbout = createRetryablePreloader(() => import("./pages/about"));

export function preloadHomeRoute(): Promise<typeof import("./pages/home")> {
  return preloadHome();
}

export function preloadAboutRoute(): Promise<typeof import("./pages/about")> {
  return preloadAbout();
}

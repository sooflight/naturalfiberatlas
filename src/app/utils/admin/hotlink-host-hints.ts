/**
 * Hosts that often return 403 or HTML for <img src> even when the URL looks like a file.
 * Fetch-by-URL (e.g. Cloudinary) may still succeed from the server side.
 */
export function hotlinkProneImageUrlHint(url: string): string | null {
  try {
    const host = new URL(url).hostname.toLowerCase();
    if (host.endsWith("researchgate.net")) {
      return "ResearchGate blocks embedding in the page (broken preview). Use \"Upload & Add\" to pull the image through Cloudinary, or download the file and drop it here.";
    }
    return null;
  } catch {
    return null;
  }
}

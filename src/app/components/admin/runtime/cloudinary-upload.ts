export interface CloudinaryConfig {
  cloudName: string;
  uploadPreset: string;
}

interface StoredAdminSettings {
  cloudinary?: { cloudName?: string; uploadPreset?: string };
  cloudinaryCloudName?: string;
  cloudinaryUploadPreset?: string;
  cloudName?: string;
  uploadPreset?: string;
}

function parseCloudinaryConfigFromStorage(raw: string | null): CloudinaryConfig | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as StoredAdminSettings;
    const cloudName =
      parsed.cloudinary?.cloudName ?? parsed.cloudinaryCloudName ?? parsed.cloudName ?? "";
    const uploadPreset =
      parsed.cloudinary?.uploadPreset ??
      parsed.cloudinaryUploadPreset ??
      parsed.uploadPreset ??
      "";
    if (!cloudName || !uploadPreset) return null;
    return { cloudName, uploadPreset };
  } catch {
    return null;
  }
}

export interface UploadedCloudinaryImage {
  fileName: string;
  secureUrl: string;
}

export function getCloudinaryConfig(
  storageKey = "atlas:admin-settings",
): CloudinaryConfig | null {
  const fallbackCloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME ?? "";
  const fallbackUploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET ?? "";
  const envFallback =
    fallbackCloudName && fallbackUploadPreset
      ? { cloudName: fallbackCloudName, uploadPreset: fallbackUploadPreset }
      : null;

  try {
    // Keep compatibility with both current app settings and admin-package keys.
    const candidates: Array<string | null> = [
      localStorage.getItem(storageKey),
      localStorage.getItem("atlas-admin-settings"),
      localStorage.getItem("atlas-cloudinary-config"),
    ];
    for (const raw of candidates) {
      const parsed = parseCloudinaryConfigFromStorage(raw);
      if (parsed) return parsed;
    }
    return envFallback;
  } catch {
    return envFallback;
  }
}

export async function uploadImageFilesToCloudinary(
  files: File[],
  config: CloudinaryConfig,
): Promise<UploadedCloudinaryImage[]> {
  return Promise.all(
    files.map(async (file) => {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("upload_preset", config.uploadPreset);
      formData.append("folder", "atlas");

      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${config.cloudName}/image/upload`,
        { method: "POST", body: formData },
      );
      if (!response.ok) {
        throw new Error(`Cloudinary upload failed for ${file.name}`);
      }
      const payload = (await response.json()) as { secure_url?: string };
      if (!payload.secure_url) {
        throw new Error(`Cloudinary response missing secure_url for ${file.name}`);
      }
      return { fileName: file.name, secureUrl: payload.secure_url };
    }),
  );
}

export async function uploadImageUrlsToCloudinary(
  urls: string[],
  config: CloudinaryConfig,
): Promise<UploadedCloudinaryImage[]> {
  return Promise.all(
    urls.map(async (url) => {
      const formData = new FormData();
      formData.append("file", url);
      formData.append("upload_preset", config.uploadPreset);
      formData.append("folder", "atlas");

      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${config.cloudName}/image/upload`,
        { method: "POST", body: formData },
      );
      if (!response.ok) {
        throw new Error(`Cloudinary upload failed for ${url}`);
      }
      const payload = (await response.json()) as { secure_url?: string };
      if (!payload.secure_url) {
        throw new Error(`Cloudinary response missing secure_url for ${url}`);
      }
      let fileName = "dropped-image";
      try {
        const parsed = new URL(url);
        const last = parsed.pathname.split("/").pop();
        if (last) fileName = decodeURIComponent(last);
      } catch {
        // keep fallback name
      }
      return { fileName, secureUrl: payload.secure_url };
    }),
  );
}


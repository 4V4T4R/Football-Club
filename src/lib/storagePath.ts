export function storagePathFromPublicUrl(url: string | null | undefined, bucket: string) {
  if (!url) return null;

  try {
    const parsed = new URL(url);
    const marker = `/storage/v1/object/public/${bucket}/`;
    const index = parsed.pathname.indexOf(marker);

    if (index === -1) return null;

    const path = parsed.pathname.slice(index + marker.length);
    return path ? decodeURIComponent(path) : null;
  } catch {
    const marker = `${bucket}/`;
    const index = url.indexOf(marker);

    if (index === -1) return null;

    const path = url.slice(index + marker.length).split("?")[0];
    return path ? decodeURIComponent(path) : null;
  }
}

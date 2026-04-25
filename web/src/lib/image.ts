const isHttpUrl = (value: string): boolean => /^https?:\/\//i.test(value);

const normalizeGoogleImageSearchUrl = (value: string): string => {
  try {
    const parsed = new URL(value);
    if (parsed.hostname.includes("google.") && parsed.pathname === "/imgres") {
      const directImage = parsed.searchParams.get("imgurl");
      if (directImage) {
        if (isHttpUrl(directImage)) {
          return directImage;
        }
        const decodedOnce = decodeURIComponent(directImage);
        if (isHttpUrl(decodedOnce)) {
          return decodedOnce;
        }
        const decodedTwice = decodeURIComponent(decodedOnce);
        if (isHttpUrl(decodedTwice)) {
          return decodedTwice;
        }
      }
    }
  } catch {
    return value;
  }
  return value;
};

export const getGiftImageSrc = (imageUrl: string | null | undefined): string | null => {
  if (!imageUrl) {
    return null;
  }
  const trimmed = normalizeGoogleImageSearchUrl(imageUrl.trim());
  if (!trimmed) {
    return null;
  }
  if (isHttpUrl(trimmed)) {
    return `/api/assets/image?url=${encodeURIComponent(trimmed)}`;
  }
  return trimmed;
};

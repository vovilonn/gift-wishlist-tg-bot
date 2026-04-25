import { useMemo, useState } from "react";

import { getGiftImageSrc } from "../lib/image";

type SafeImageProps = {
  imageUrl?: string | null;
  alt: string;
  className?: string;
  fallbackClassName?: string;
};

export const SafeImage = ({ imageUrl, alt, className, fallbackClassName }: SafeImageProps) => {
  const [isBroken, setIsBroken] = useState(false);
  const src = useMemo(() => (isBroken ? null : getGiftImageSrc(imageUrl)), [imageUrl, isBroken]);

  if (!src) {
    return <div className={fallbackClassName ?? className}>Нет изображения</div>;
  }

  return <img src={src} alt={alt} className={className} loading="lazy" onError={() => setIsBroken(true)} />;
};

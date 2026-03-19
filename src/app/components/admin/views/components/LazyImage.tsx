import { useState } from 'react';

interface LazyImageProps {
  src: string;
  alt: string;
  className?: string;
}

export function LazyImage({ src, alt, className }: LazyImageProps) {
  const [loaded, setLoaded] = useState(false);
  return (
    <img
      src={src}
      alt={alt}
      className={className}
      loading="lazy"
      onLoad={() => setLoaded(true)}
      style={{ opacity: loaded ? 1 : 0.6, transition: 'opacity 200ms ease' }}
    />
  );
}

import { useState } from 'react';

export function OfficialAsset({ src, alt, className }: { src: string; alt: string; className?: string }) {
  const [failed, setFailed] = useState(false);
  return failed ? <span className={`${className ?? ''} vision-asset-fallback`} role="img" aria-label={`${alt} — asset non disponibile`}>{alt}<small>ASSET NON DISPONIBILE</small></span> : <img src={src} alt={alt} className={className} onError={() => setFailed(true)} />;
}
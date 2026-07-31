import { useState } from "react";
import "./ProductImage.css";

interface ProductImageProps {
  src?: string | null;
  alt: string;
  className?: string;
}

/** Product image with a graceful placeholder when the src is missing or fails
 *  to load, instead of pointing at a `/no-image.png` file that doesn't exist. */
export default function ProductImage({ src, alt, className }: ProductImageProps) {
  const [failed, setFailed] = useState(false);
  const showPlaceholder = !src || failed;

  return (
    <div className={`productImage ${className || ""}`}>
      {showPlaceholder ? (
        <div className="productImage__placeholder">
          <svg viewBox="0 0 24 24" width="28" height="28" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.6" />
            <circle cx="8.5" cy="8.5" r="1.5" stroke="currentColor" strokeWidth="1.6" />
            <path d="m21 15-5-5L5 21" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      ) : (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          onError={() => setFailed(true)}
        />
      )}
    </div>
  );
}

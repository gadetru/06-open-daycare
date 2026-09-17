"use client";

import { useEffect, useRef, useState } from "react";
import type { SVGProps } from "react";

type PhotoPlaceholderProps = {
  src: string;
  alt: string;
};

export default function PhotoPlaceholder({ src, alt }: PhotoPlaceholderProps) {
  const [hasFailed, setHasFailed] = useState(false);
  const imageRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const image = imageRef.current;
    if (image && image.complete && image.naturalWidth === 0) {
      setHasFailed(true);
    }
  }, []);

  if (hasFailed) {
    return (
      <div className="mt-[14px] flex h-[200px] flex-col items-center justify-center gap-2 rounded-[16px] border-[1.5px] border-dashed border-[#DBCDBA] bg-surface-soft text-[#B0A290]">
        <ImageIcon />
        <span className="text-[13.5px]">{alt}</span>
      </div>
    );
  }

  return (
    <img
      ref={imageRef}
      src={src}
      alt={alt}
      onError={() => setHasFailed(true)}
      className="mt-[14px] h-[200px] w-full rounded-[16px] object-cover"
    />
  );
}

function ImageIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      width="30"
      height="30"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="9" cy="9" r="2" />
      <path d="m21 15-3.6-3.6a2 2 0 0 0-2.8 0L6 21" />
    </svg>
  );
}
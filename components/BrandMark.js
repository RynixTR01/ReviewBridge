import Image from "next/image";

export default function BrandMark({ size = 32, className = "" }) {
  return (
    <span
      aria-hidden="true"
      className={`inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-primary/10 bg-white shadow-sm ${className}`}
      style={{ width: size, height: size }}
    >
      <Image
        src="/brand/reviewbridge-mark.png"
        alt=""
        width={size}
        height={size}
        preload={size >= 32}
        className="h-full w-full object-contain"
      />
    </span>
  );
}

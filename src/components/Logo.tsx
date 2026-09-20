import logoMark from "@/assets/logo-mark.png";

/** A-Level Ace brand mark. */
export function Logo({ className = "size-8" }: { className?: string }) {
  return (
    <img
      src={logoMark}
      alt="A-Level Ace logo"
      width={1024}
      height={1024}
      loading="lazy"
      className={`${className} object-contain`}
    />
  );
}

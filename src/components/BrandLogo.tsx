import Image from "next/image";
import { APP_NAME } from "@/lib/supabase/config";

export function BrandLogo({ compact = false, className = "" }: { compact?: boolean; className?: string }) {
  return (
    <Image
      src="/logo.png"
      alt={APP_NAME}
      width={723}
      height={320}
      priority={compact}
      className={`${compact ? "h-10 max-w-[230px]" : "h-14 max-w-[300px]"} w-auto object-contain ${className}`}
    />
  );
}

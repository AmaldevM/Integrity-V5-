import React, { useState } from "react";
// https://i.postimg.cc/jjL93wwS/black-logo.png
// https://i.postimg.cc/cJrjkggC/red-logo.png
// https://i.postimg.cc/3wd6f4yq/white-logo.png


const logoFallback = "../assets/white-logo.png";

interface LogoProps {
  className?: string;
  variant?: "light" | "dark";
  showText?: boolean;
}

export const Logo: React.FC<LogoProps> = ({
  className = "h-10",
  variant = "dark",
  showText = true,
}) => {
  const [imgError, setImgError] = useState(false);

  // Heuristic for larger text sizes to scale fonts dynamically
  const isLarge =
    className.includes("h-18") ||
    className.includes("h-20") ||
    className.includes("h-24") ||
    className.includes("text-4xl");

  // RENDER: Fallback View (Icon + Text) if main images fail
  if (imgError) {
    return (
      <div className={`flex items-center gap-5 ${className} select-none`}>
        <img
          src={logoFallback}
          alt="Tertius Icon"
          className="h-48 w-auto aspect-square object-contain"
        />
      </div>
    );
  }

  // RENDER: Main Image with Fallback Chain
  return (
    <img
      src="/logo.png"
      alt="Tertius Life Sciences"
      className={`${className} object-contain`}
      onError={(e) => {
        const target = e.target as HTMLImageElement;
        // Logic: Try logo.png -> then logo-white.png -> then tertius_logo.jpg -> finally show Component View
        if (target.src.includes("logo.png")) {
          target.src = "/logo-white.png";
        } else if (target.src.includes("logo-white.png")) {
          target.src = "/tertius_logo.jpg";
        } else {
          setImgError(true);
        }
      }}
    />
  );
};
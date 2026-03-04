import { useEffect, useState } from "react";
import { breakpoints } from "../design-tokens";

function getWindowWidth() {
  if (typeof window === "undefined") {
    return breakpoints.desktop;
  }
  return window.innerWidth;
}

export function useViewport() {
  const [width, setWidth] = useState(getWindowWidth);

  useEffect(() => {
    function handleResize() {
      setWidth(window.innerWidth);
    }

    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return {
    width,
    isMobile: width < breakpoints.tablet,
    isCompactNav: width < breakpoints.laptop,
    isTablet: width >= breakpoints.tablet && width < breakpoints.laptop,
  };
}

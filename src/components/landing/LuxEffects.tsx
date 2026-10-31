"use client";

import { useEffect } from "react";

// Wires up the two page-wide effects of the marketing pages:
// - `.reveal` elements fade/slide in once they enter the viewport
// - `.lux-spot` cards get a gold spotlight that follows the cursor
export default function LuxEffects() {
  useEffect(() => {
    const targets = document.querySelectorAll<HTMLElement>(".reveal");
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-in");
            observer.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" },
    );
    targets.forEach((el) => observer.observe(el));

    function onMove(e: PointerEvent) {
      const card = (e.target as HTMLElement | null)?.closest<HTMLElement>(".lux-spot");
      if (!card) return;
      const rect = card.getBoundingClientRect();
      card.style.setProperty("--mx", `${e.clientX - rect.left}px`);
      card.style.setProperty("--my", `${e.clientY - rect.top}px`);
    }
    window.addEventListener("pointermove", onMove, { passive: true });

    return () => {
      observer.disconnect();
      window.removeEventListener("pointermove", onMove);
    };
  }, []);

  return null;
}

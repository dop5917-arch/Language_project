"use client";

import { useEffect, useMemo, useState } from "react";

type OnboardingStep = {
  selector: string;
  title: string;
  description: string;
};

type Props = {
  storageKey: string;
  steps: OnboardingStep[];
  enabled?: boolean;
};

type SpotlightRect = {
  top: number;
  left: number;
  width: number;
  height: number;
};

const PADDING = 8;

export default function GuidedOnboarding({ storageKey, steps, enabled = true }: Props) {
  const [ready, setReady] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [availableSteps, setAvailableSteps] = useState<OnboardingStep[]>([]);
  const [rect, setRect] = useState<SpotlightRect | null>(null);

  useEffect(() => {
    if (!enabled) return;
    try {
      if (window.localStorage.getItem(storageKey) === "done") return;
    } catch {
      return;
    }

    const timer = window.setTimeout(() => {
      const nextSteps = steps.filter((step) => document.querySelector(step.selector));
      if (nextSteps.length === 0) return;
      setAvailableSteps(nextSteps);
      setReady(true);
    }, 80);

    return () => window.clearTimeout(timer);
  }, [enabled, steps, storageKey]);

  useEffect(() => {
    if (!ready || availableSteps.length === 0) return;

    function updateRect() {
      const step = availableSteps[activeIndex];
      if (!step) return;
      const node = document.querySelector(step.selector);
      if (!(node instanceof HTMLElement)) return;
      const bounds = node.getBoundingClientRect();
      setRect({
        top: Math.max(0, bounds.top - PADDING),
        left: Math.max(0, bounds.left - PADDING),
        width: bounds.width + PADDING * 2,
        height: bounds.height + PADDING * 2
      });
    }

    updateRect();
    window.addEventListener("resize", updateRect);
    window.addEventListener("scroll", updateRect, true);
    return () => {
      window.removeEventListener("resize", updateRect);
      window.removeEventListener("scroll", updateRect, true);
    };
  }, [activeIndex, availableSteps, ready]);

  const currentStep = availableSteps[activeIndex] ?? null;

  const tooltipStyle = useMemo(() => {
    if (!rect || typeof window === "undefined") return { top: 0, left: 0 };
    const tooltipWidth = Math.min(320, window.innerWidth - 24);
    const centeredLeft = rect.left + rect.width / 2 - tooltipWidth / 2;
    const left = Math.min(Math.max(12, centeredLeft), window.innerWidth - tooltipWidth - 12);
    const belowTop = rect.top + rect.height + 14;
    const top = belowTop + 180 < window.innerHeight ? belowTop : Math.max(12, rect.top - 150);
    return { top, left, width: tooltipWidth };
  }, [rect]);

  function complete() {
    try {
      window.localStorage.setItem(storageKey, "done");
    } catch {
      // ignore persistence errors
    }
    setReady(false);
    setAvailableSteps([]);
    setRect(null);
  }

  function next() {
    if (activeIndex >= availableSteps.length - 1) {
      complete();
      return;
    }
    setActiveIndex((value) => value + 1);
  }

  if (!enabled || !ready || !currentStep || !rect) return null;

  return (
    <>
      <div className="fixed inset-0 z-[900] pointer-events-none">
        <div className="absolute left-0 top-0 bg-black/45" style={{ width: "100%", height: rect.top }} />
        <div className="absolute left-0 bg-black/45" style={{ top: rect.top, width: rect.left, height: rect.height }} />
        <div
          className="absolute bg-black/45"
          style={{ top: rect.top, left: rect.left + rect.width, right: 0, height: rect.height }}
        />
        <div
          className="absolute left-0 bg-black/45"
          style={{ top: rect.top + rect.height, width: "100%", bottom: 0 }}
        />
        <div
          className="absolute rounded-2xl border-2 border-[#34D399] shadow-[0_0_0_9999px_rgba(0,0,0,0.0)]"
          style={{
            top: rect.top,
            left: rect.left,
            width: rect.width,
            height: rect.height
          }}
        />
      </div>

      <div
        className="fixed z-[910] rounded-2xl bg-white p-4 shadow-[0_16px_40px_rgba(0,0,0,0.22)] ring-1 ring-[#E5E7EB]"
        style={tooltipStyle}
      >
        <div className="space-y-2">
          <div className="text-sm font-semibold text-[#111111]">{currentStep.title}</div>
          <p className="text-sm leading-6 text-[#475569]">{currentStep.description}</p>
        </div>
        <div className="mt-4 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={complete}
            className="rounded-lg border border-[#E5E7EB] bg-white px-3 py-2 text-sm font-medium text-[#111111] hover:bg-[#F5F5F5]"
          >
            Пропустить
          </button>
          <div className="flex items-center gap-3">
            <span className="text-xs text-[#94A3B8]">
              {activeIndex + 1} / {availableSteps.length}
            </span>
            <button
              type="button"
              onClick={next}
              className="rounded-lg bg-[#059669] px-4 py-2 text-sm font-semibold text-white hover:bg-[#047857]"
            >
              {activeIndex >= availableSteps.length - 1 ? "Понятно" : "Далее"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

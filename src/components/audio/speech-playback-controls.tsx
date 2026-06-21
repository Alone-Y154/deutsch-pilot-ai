"use client";

import { Pause, Play, RotateCcw, Square } from "lucide-react";

import type { SpeechPlaybackController } from "@/hooks/use-speech-playback";
import { cn } from "@/lib/utils";

export function SpeechPlaybackControls({
  controller,
  id,
  text,
  rate,
  playLabel = "Play",
  compact = false,
  className,
  onBeforePlay,
}: {
  controller: SpeechPlaybackController;
  id: string;
  text: string;
  rate?: number;
  playLabel?: string;
  compact?: boolean;
  className?: string;
  onBeforePlay?: () => void;
}) {
  const active = controller.activeId === id;
  const playing = active && controller.status === "playing";
  const paused = active && controller.status === "paused";
  const buttonClass = compact
    ? "flex items-center gap-1.5 rounded-md border border-neutral-300 bg-white px-2.5 py-1.5 text-xs font-semibold hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50"
    : "flex items-center gap-2 rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm font-semibold hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50";

  if (!active) {
    return (
      <button
        type="button"
        onClick={() => {
          onBeforePlay?.();
          controller.play(id, text, rate);
        }}
        disabled={!text.trim() || !controller.isSupported}
        className={cn(buttonClass, className)}
      >
        <Play className="h-4 w-4" />
        {playLabel}
      </button>
    );
  }

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <button
        type="button"
        onClick={playing ? controller.pause : controller.resume}
        className={buttonClass}
      >
        {playing ? (
          <>
            <Pause className="h-4 w-4" />
            Pause
          </>
        ) : (
          <>
            <Play className="h-4 w-4" />
            Resume
          </>
        )}
      </button>
      <button
        type="button"
        onClick={() => {
          onBeforePlay?.();
          controller.restart();
        }}
        className={buttonClass}
      >
        <RotateCcw className="h-4 w-4" />
        Restart
      </button>
      <button type="button" onClick={controller.stop} className={buttonClass}>
        <Square className="h-4 w-4" />
        Stop
      </button>
      {paused ? (
        <span className="text-xs font-medium text-amber-700">Paused</span>
      ) : null}
    </div>
  );
}

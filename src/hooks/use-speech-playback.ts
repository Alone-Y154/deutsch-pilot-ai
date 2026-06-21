"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";

export type SpeechPlaybackStatus = "idle" | "playing" | "paused";

export type SpeechPlaybackController = {
  activeId: string | null;
  isSupported: boolean;
  pause: () => void;
  play: (id: string, text: string, rate?: number) => void;
  restart: () => void;
  resume: () => void;
  status: SpeechPlaybackStatus;
  stop: () => void;
};

type ActiveSpeech = {
  id: string;
  text: string;
  rate: number;
};

export function useSpeechPlayback({
  lang = "de-DE",
  rate = 0.9,
  onStart,
}: {
  lang?: string;
  rate?: number;
  onStart?: () => void;
} = {}): SpeechPlaybackController {
  const [status, setStatus] = useState<SpeechPlaybackStatus>("idle");
  const [activeId, setActiveId] = useState<string | null>(null);
  const activeRef = useRef<ActiveSpeech | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const onStartRef = useRef(onStart);
  const isSupported = useSyncExternalStore(
    subscribeToSpeechSupport,
    getSpeechSupportSnapshot,
    getServerSpeechSupportSnapshot,
  );

  useEffect(() => {
    onStartRef.current = onStart;
  }, [onStart]);

  useEffect(() => {
    return () => {
      if (utteranceRef.current && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
      utteranceRef.current = null;
      activeRef.current = null;
    };
  }, []);

  function speak(active: ActiveSpeech) {
    if (!("speechSynthesis" in window) || !active.text.trim()) {
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(active.text);
    utterance.lang = lang;
    utterance.rate = active.rate;
    utterance.onstart = () => {
      if (utteranceRef.current !== utterance) return;
      setStatus("playing");
      setActiveId(active.id);
      onStartRef.current?.();
    };
    utterance.onpause = () => {
      if (utteranceRef.current === utterance) setStatus("paused");
    };
    utterance.onresume = () => {
      if (utteranceRef.current === utterance) setStatus("playing");
    };
    utterance.onend = () => finish(utterance);
    utterance.onerror = () => finish(utterance);

    activeRef.current = active;
    utteranceRef.current = utterance;
    setActiveId(active.id);
    setStatus("playing");
    window.speechSynthesis.speak(utterance);
  }

  function finish(utterance: SpeechSynthesisUtterance) {
    if (utteranceRef.current !== utterance) return;
    utteranceRef.current = null;
    activeRef.current = null;
    setStatus("idle");
    setActiveId(null);
  }

  function play(id: string, text: string, nextRate = rate) {
    speak({ id, text, rate: nextRate });
  }

  function pause() {
    if (
      status === "playing" &&
      "speechSynthesis" in window &&
      window.speechSynthesis.speaking
    ) {
      window.speechSynthesis.pause();
      setStatus("paused");
    }
  }

  function resume() {
    if (status === "paused" && "speechSynthesis" in window) {
      window.speechSynthesis.resume();
      setStatus("playing");
    }
  }

  function restart() {
    if (activeRef.current) {
      speak(activeRef.current);
    }
  }

  function stop() {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    utteranceRef.current = null;
    activeRef.current = null;
    setStatus("idle");
    setActiveId(null);
  }

  return {
    activeId,
    isSupported,
    pause,
    play,
    restart,
    resume,
    status,
    stop,
  };
}

function subscribeToSpeechSupport() {
  return () => undefined;
}

function getSpeechSupportSnapshot() {
  return "speechSynthesis" in window;
}

function getServerSpeechSupportSnapshot() {
  return false;
}

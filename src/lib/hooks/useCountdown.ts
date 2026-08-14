"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Options = {
  onExpire?: () => void;
  /** Fires once per whole second remaining, for ticks and beeps. */
  onTick?: (secondsLeft: number) => void;
};

/**
 * A countdown driven off wall-clock deadlines rather than accumulated
 * intervals, so it stays accurate when the browser throttles timers in a
 * background tab. Animates on rAF so a progress ring can move smoothly.
 */
export function useCountdown(totalSeconds: number, options: Options = {}) {
  const [msLeft, setMsLeft] = useState(totalSeconds * 1000);
  const [running, setRunning] = useState(false);

  const deadlineRef = useRef(0);
  const frameRef = useRef(0);
  const lastWholeSecondRef = useRef(Math.ceil(totalSeconds));
  // Mirrors `msLeft` so `resume` can read it without a state updater.
  const msLeftRef = useRef(totalSeconds * 1000);

  // Keep callbacks in refs so a caller passing inline arrow functions
  // doesn't restart the timer on every render.
  const onExpireRef = useRef(options.onExpire);
  const onTickRef = useRef(options.onTick);

  // Assigned in an effect, not during render: the rAF loop only reads these
  // after the component has committed.
  useEffect(() => {
    onExpireRef.current = options.onExpire;
    onTickRef.current = options.onTick;
  });

  const stopLoop = useCallback(() => {
    if (frameRef.current) cancelAnimationFrame(frameRef.current);
    frameRef.current = 0;
  }, []);

  // The loop schedules itself, so it goes through a ref rather than closing
  // over its own binding.
  const loopRef = useRef<(() => void) | null>(null);

  const loop = useCallback(() => {
    const remaining = Math.max(0, deadlineRef.current - Date.now());
    msLeftRef.current = remaining;
    setMsLeft(remaining);

    const whole = Math.ceil(remaining / 1000);
    if (whole !== lastWholeSecondRef.current) {
      lastWholeSecondRef.current = whole;
      onTickRef.current?.(whole);
    }

    if (remaining <= 0) {
      setRunning(false);
      stopLoop();
      onExpireRef.current?.();
      return;
    }
    frameRef.current = requestAnimationFrame(() => loopRef.current?.());
  }, [stopLoop]);

  useEffect(() => {
    loopRef.current = loop;
  });

  const start = useCallback(
    (seconds: number = totalSeconds) => {
      stopLoop();
      deadlineRef.current = Date.now() + seconds * 1000;
      lastWholeSecondRef.current = Math.ceil(seconds);
      msLeftRef.current = seconds * 1000;
      setMsLeft(seconds * 1000);
      setRunning(true);
      frameRef.current = requestAnimationFrame(loop);
    },
    [loop, stopLoop, totalSeconds],
  );

  const pause = useCallback(() => {
    stopLoop();
    setRunning(false);
    const remaining = Math.max(0, deadlineRef.current - Date.now());
    msLeftRef.current = remaining;
    setMsLeft(remaining);
  }, [stopLoop]);

  const resume = useCallback(() => {
    const remaining = msLeftRef.current;
    if (remaining <= 0) return;
    stopLoop();
    deadlineRef.current = Date.now() + remaining;
    setRunning(true);
    frameRef.current = requestAnimationFrame(loop);
  }, [loop, stopLoop]);

  const reset = useCallback(
    (seconds: number = totalSeconds) => {
      stopLoop();
      setRunning(false);
      msLeftRef.current = seconds * 1000;
      setMsLeft(seconds * 1000);
      lastWholeSecondRef.current = Math.ceil(seconds);
    },
    [stopLoop, totalSeconds],
  );

  useEffect(() => stopLoop, [stopLoop]);

  return {
    msLeft,
    secondsLeft: Math.ceil(msLeft / 1000),
    /** 1 at the start, 0 at the buzzer — drives progress rings. */
    fraction: totalSeconds > 0 ? msLeft / (totalSeconds * 1000) : 0,
    running,
    start,
    pause,
    resume,
    reset,
  };
}

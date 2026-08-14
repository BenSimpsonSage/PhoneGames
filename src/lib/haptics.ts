/**
 * Vibration feedback. Android honours this; iOS Safari has never shipped
 * `navigator.vibrate`, so on iPhones every call is a silent no-op by design.
 */
function vibrate(pattern: number | number[]) {
  if (typeof navigator === "undefined") return;
  if (typeof navigator.vibrate !== "function") return;
  try {
    navigator.vibrate(pattern);
  } catch {
    // Some browsers throw if the document isn't focused. Never worth crashing over.
  }
}

export const haptics = {
  tap: () => vibrate(10),
  correct: () => vibrate([0, 35]),
  skip: () => vibrate([0, 18, 60, 18]),
  reveal: () => vibrate([0, 22, 40, 22, 40, 45]),
  timeUp: () => vibrate([0, 180, 90, 180, 90, 300]),
  off: () => vibrate(0),
};

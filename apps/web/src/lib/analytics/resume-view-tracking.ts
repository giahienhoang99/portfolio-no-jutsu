/** Starts and stops once-per-mount visibility tracking for the resume viewer. */
export interface ResumeVisibilityEntry {
  isIntersecting: boolean;
  target: Element;
}

export interface ResumeVisibilityObserver {
  observe(target: Element): void;
  disconnect(): void;
}

export type ResumeVisibilityObserverFactory = (
  callback: (entries: readonly ResumeVisibilityEntry[]) => void,
) => ResumeVisibilityObserver;

export interface ResumeViewTrackingOptions {
  enabled: boolean;
  target: Element;
  onVisible: () => void;
  createObserver?: ResumeVisibilityObserverFactory;
}

function browserObserverFactory(
  callback: (entries: readonly ResumeVisibilityEntry[]) => void,
): ResumeVisibilityObserver {
  return new IntersectionObserver((entries) => callback(entries), { threshold: 0.25 });
}

/**
 * Reports the first visible intersection and disconnects until the viewer mounts again.
 *
 * @returns A cleanup function suitable for a React effect.
 */
export function startResumeViewTracking(options: ResumeViewTrackingOptions): () => void {
  if (!options.enabled) return () => undefined;

  let reported = false;
  let observer: ResumeVisibilityObserver | undefined;
  try {
    observer = (options.createObserver ?? browserObserverFactory)((entries) => {
      if (reported || !entries.some((entry) => entry.target === options.target && entry.isIntersecting)) return;
      reported = true;
      observer?.disconnect();
      options.onVisible();
    });
    observer.observe(options.target);
  } catch {
    observer?.disconnect();
    return () => undefined;
  }

  return () => observer?.disconnect();
}

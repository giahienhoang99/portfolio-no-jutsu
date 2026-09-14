/** Exercises resume visibility reporting independently from React and the browser. */
import { describe, expect, it, vi } from "vitest";

import {
  startResumeViewTracking,
  type ResumeVisibilityEntry,
  type ResumeVisibilityObserverFactory,
} from "./resume-view-tracking";

function visibilityHarness() {
  let callback: ((entries: readonly ResumeVisibilityEntry[]) => void) | undefined;
  let disconnected = false;
  const observe = vi.fn();
  const disconnect = vi.fn(() => { disconnected = true; });
  const createObserver = vi.fn<ResumeVisibilityObserverFactory>((nextCallback) => {
    callback = nextCallback;
    return { observe, disconnect };
  });

  return {
    createObserver,
    disconnect,
    observe,
    trigger(entries: readonly ResumeVisibilityEntry[]) {
      if (!disconnected) callback?.(entries);
    },
  };
}

describe("startResumeViewTracking", () => {
  it("waits for the viewer to become visible and reports only once", () => {
    const target = {} as Element;
    const otherTarget = {} as Element;
    const onVisible = vi.fn();
    const observer = visibilityHarness();

    startResumeViewTracking({ enabled: true, target, onVisible, createObserver: observer.createObserver });
    observer.trigger([{ target, isIntersecting: false }, { target: otherTarget, isIntersecting: true }]);
    expect(onVisible).not.toHaveBeenCalled();

    observer.trigger([{ target, isIntersecting: true }]);
    observer.trigger([{ target, isIntersecting: true }]);

    expect(onVisible).toHaveBeenCalledOnce();
    expect(observer.observe).toHaveBeenCalledWith(target);
    expect(observer.disconnect).toHaveBeenCalledOnce();
  });

  it("does not create an observer when resume analytics is disabled", () => {
    const observer = visibilityHarness();

    startResumeViewTracking({
      enabled: false,
      target: {} as Element,
      onVisible: vi.fn(),
      createObserver: observer.createObserver,
    });

    expect(observer.createObserver).not.toHaveBeenCalled();
  });

  it("contains unavailable browser observation without reporting", () => {
    const onVisible = vi.fn();
    const cleanup = startResumeViewTracking({
      enabled: true,
      target: {} as Element,
      onVisible,
      createObserver: () => { throw new Error("observer unavailable"); },
    });

    expect(cleanup()).toBeUndefined();
    expect(onVisible).not.toHaveBeenCalled();
  });

  it("disconnects on unmount and reports again after a new mount", () => {
    const target = {} as Element;
    const onVisible = vi.fn();
    const firstMount = visibilityHarness();
    const cleanup = startResumeViewTracking({ enabled: true, target, onVisible, createObserver: firstMount.createObserver });

    cleanup();
    firstMount.trigger([{ target, isIntersecting: true }]);
    expect(onVisible).not.toHaveBeenCalled();

    const secondMount = visibilityHarness();
    startResumeViewTracking({ enabled: true, target, onVisible, createObserver: secondMount.createObserver });
    secondMount.trigger([{ target, isIntersecting: true }]);

    expect(onVisible).toHaveBeenCalledOnce();
  });
});

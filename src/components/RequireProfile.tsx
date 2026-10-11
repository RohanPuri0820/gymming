"use client";

import { useSyncExternalStore, type ComponentType } from "react";
import { useData } from "@/lib/store";
import { Spinner } from "./ui";

const noop = () => () => {};

/**
 * Pages are prerendered by Next even though AppShell gates them, so every page is
 * wrapped in this: it renders nothing until we're in the browser with a profile.
 */
export function requireProfile(Page: ComponentType) {
  return function Guarded() {
    const browser = useSyncExternalStore(noop, () => true, () => false);
    const profile = useData((s) => s.profile);
    if (!browser || !profile) return <Spinner />;
    return <Page />;
  };
}

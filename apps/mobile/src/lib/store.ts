import { createAppStore, hydrateStore, type AppState } from '@catalysis/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useStore } from 'zustand';
import { useShallow } from 'zustand/react/shallow';

export const store = createAppStore(AsyncStorage);

/** Reads persisted state once; the root layout holds the splash screen until it resolves. */
export function hydrate(): Promise<void> {
  return hydrateStore(store);
}

/** Subscribe to a slice of app state. The selector must return a stable value. */
export function useApp<T>(selector: (state: AppState) => T): T {
  return useStore(store, selector);
}

/**
 * For selectors that derive a new array or object on every call
 * (`feedPosts`, `commentsFor`, …): compares the result shallowly.
 */
export function useAppShallow<T>(selector: (state: AppState) => T): T {
  return useStore(store, useShallow(selector));
}

/** Actions never change, so they can be read without subscribing. */
export const actions = (): AppState => store.getState();

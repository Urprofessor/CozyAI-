'use client';

import { createContext, useContext } from 'react';

export const CozyCloseContext = createContext<() => void>(() => {});

/** Whether Cozie is on screen. The overlay stays mounted while closed, so
 *  anything that should only run while it's seen (the intro video) checks
 *  this. The standalone /cozy route is always visible. */
export const CozyVisibleContext = createContext(true);

/** Close Cozie: shrink the overlay back into its launcher, or — on the
 *  standalone /cozy route — go back to the tab it was opened from. */
export const useCozyClose = () => useContext(CozyCloseContext);

export const useCozyVisible = () => useContext(CozyVisibleContext);

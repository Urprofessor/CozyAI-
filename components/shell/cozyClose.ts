'use client';

import { createContext, useContext } from 'react';

export const CozyCloseContext = createContext<() => void>(() => {});

/** Close Cozie: shrink the overlay back into its launcher, or — on the
 *  standalone /cozy route — go back to the tab it was opened from. */
export const useCozyClose = () => useContext(CozyCloseContext);

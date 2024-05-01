import React, { createContext, useContext } from 'react';
import { useSelector } from 'react-redux';

import { StoreParams } from '../../models/store';

export type DevContextType = {
  isDev: boolean;
};

export const DevContext = createContext<DevContextType>({
  isDev: false,
});

export const useDevContext = () => useContext(DevContext);

const AppWithContext = ({ children }: { children: React.ReactNode }) => {
  const isDev = useSelector((state: StoreParams) => state.user.allowDevFeatures || false);

  return <DevContext.Provider value={{ isDev }}>{children}</DevContext.Provider>;
};

export default AppWithContext;

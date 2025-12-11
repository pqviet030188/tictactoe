import React, { type PropsWithChildren } from "react";
import { render } from "@testing-library/react";
import type { RenderOptions } from "@testing-library/react";
import { Provider } from "react-redux";

import type { AppStore, RootState } from "../store";
import { setupStore } from "../store";

interface ExtendedRenderOptions extends Omit<RenderOptions, "queries"> {
  store?: AppStore;
   preloadedState?: Partial<RootState>
}

export const renderWithProviders = (
  ui: React.ReactElement,
  extendedRenderOptions: ExtendedRenderOptions = {}
) => {

  const {
    preloadedState = undefined,
    store = setupStore(preloadedState),
    ...renderOptions
  } = extendedRenderOptions;

  const Wrapper = ({ children }: PropsWithChildren) => (
    <Provider store={store}>{children}</Provider>
  );


  return {
    store,
    ...render(ui, { wrapper: Wrapper, ...renderOptions }),
  };
}

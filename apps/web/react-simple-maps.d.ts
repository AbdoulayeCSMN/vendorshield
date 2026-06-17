// react-simple-maps ne fournit pas de types. Déclaration minimale permissive.
declare module 'react-simple-maps' {
  import type { ComponentType } from 'react';

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export const ComposableMap: ComponentType<any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export const Geographies: ComponentType<any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export const Geography: ComponentType<any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export const Marker: ComponentType<any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export const ZoomableGroup: ComponentType<any>;
}

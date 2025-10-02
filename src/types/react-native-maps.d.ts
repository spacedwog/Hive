declare module 'react-native-maps' {
  import { ComponentType } from 'react';
  const MapView: ComponentType<any>;
  const Marker: ComponentType<any>;
  const Callout: ComponentType<any>;
  export { Callout, MapView, Marker };
  export default MapView;
}
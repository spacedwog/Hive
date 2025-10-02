declare module 'react-native-reanimated' {
  import { ComponentType } from 'react';
  const Animated: ComponentType<any>;
  export const View: ComponentType<any>;
  export const ScrollView: ComponentType<any>;
  export default Animated;
}
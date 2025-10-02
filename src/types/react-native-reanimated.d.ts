declare module 'react-native-reanimated' {
  import { ComponentType } from 'react';
  const Animated: ComponentType<any>;
  export const View: ComponentType<any>;
  export const ScrollView: ComponentType<any>;

  export function useAnimatedStyle(cb: () => any, deps?: any[]): any;
  export function useSharedValue<T = any>(value: T): { value: T };
  export function withTiming(value: any, config?: any, callback?: () => void): any;
  export function withRepeat(animation: any, times?: number, reverse?: boolean): any;
  export function withSequence(...animations: any[]): any;
  export function interpolate(value: number, inputRange: number[], outputRange: number[]): number;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  export function useAnimatedRef<T>(): any;

  export default Animated;
}
import type { PropsWithChildren, ReactElement } from 'react';
import { NativeScrollEvent, NativeSyntheticEvent, ScrollView, StyleSheet } from 'react-native';
import {
  ScrollView as AnimatedScrollView,
  View as AnimatedView,
  interpolate,
  useAnimatedRef,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';

import { useColorScheme } from '../hooks/useColorScheme.ts';
import { ThemedView } from './ThemedView.tsx';
import { useBottomTabOverflow } from './ui/TabBarBackground.ios.tsx';

const HEADER_HEIGHT = 250;

type Props = PropsWithChildren<{
  headerImage: ReactElement;
  headerBackgroundColor: { dark: string; light: string };
}>;

export default function ParallaxScrollView({
  children,
  headerImage,
  headerBackgroundColor,
}: Props) {
  const colorScheme = useColorScheme() ?? 'light';
  const scrollRef = useAnimatedRef<ScrollView>();
  const scrollOffset = useSharedValue(0);
  const bottom = useBottomTabOverflow();

  // Atualiza scrollOffset manualmente
  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    scrollOffset.value = event.nativeEvent.contentOffset.y;
  };

  const headerAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateY: interpolate(
          scrollOffset.value,
          [-HEADER_HEIGHT, 0, HEADER_HEIGHT],
          [-HEADER_HEIGHT / 2, 0, HEADER_HEIGHT * 0.75]
        ),
      },
      {
        scale: interpolate(
          scrollOffset.value,
          [-HEADER_HEIGHT, 0, HEADER_HEIGHT],
          [2, 1, 1]
        ),
      },
    ],
  }));

  return (
    <AnimatedScrollView
      ref={scrollRef}
      onScroll={handleScroll}
      scrollEventThrottle={16}
      scrollIndicatorInsets={{ bottom }}
      contentContainerStyle={{ paddingBottom: bottom }}
      style={styles.container}
    >
      <AnimatedView
        style={[
          styles.header,
          { backgroundColor: headerBackgroundColor[colorScheme] },
          headerAnimatedStyle,
        ]}
      >
        {headerImage}
      </AnimatedView>

      <ThemedView style={styles.content}>{children}</ThemedView>
    </AnimatedScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { height: HEADER_HEIGHT, overflow: 'hidden' },
  content: { flex: 1, padding: 32, gap: 16 },
});
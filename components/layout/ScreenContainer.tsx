import { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '@/constants/colors';

type ScreenContainerProps = {
  children: ReactNode;
  withPadding?: boolean;
};

export function ScreenContainer({ children, withPadding = true }: ScreenContainerProps) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={[styles.container, withPadding ? styles.padded : null]}>{children}</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  padded: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
});

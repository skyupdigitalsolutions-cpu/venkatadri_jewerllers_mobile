import { Pressable, Text, StyleSheet, ViewStyle } from 'react-native';
import { Colors } from '@/constants/colors';

type ButtonProps = {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'ghost';
  style?: ViewStyle;
};

export function Button({ title, onPress, disabled, variant = 'primary', style }: ButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        variant === 'secondary' && styles.secondary,
        variant === 'ghost' && styles.ghost,
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
        style,
      ]}
    >
      <Text style={[styles.text, variant === 'secondary' && styles.textSecondary, variant === 'ghost' && styles.textGhost, disabled && styles.disabledText]}>
        {title}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondary: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  pressed: {
    opacity: 0.85,
  },
  text: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '700',
  },
  textSecondary: {
    color: Colors.primary,
  },
  textGhost: {
    color: Colors.text,
  },
  disabled: {
    opacity: 0.55,
  },
  disabledText: {
    color: Colors.textSecondary,
  },
});

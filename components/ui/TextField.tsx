import { TextInput, Text, View, StyleSheet, TextInputProps } from 'react-native';
import { Colors } from '@/constants/colors';

type TextFieldProps = TextInputProps & {
  label?: string;
  error?: string;
};

export function TextField({ label, error, style, ...rest }: TextFieldProps) {
  return (
    <View style={styles.wrapper}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TextInput
        style={[styles.input, error ? styles.inputError : null, style]}
        placeholderTextColor={Colors.textSecondary}
        {...rest}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    marginBottom: 8,
    color: Colors.textSecondary,
  },
  input: {
    minHeight: 50,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.white,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: Colors.text,
    fontSize: 16,
  },
  inputError: {
    borderColor: Colors.error,
  },
  error: {
    marginTop: 6,
    color: Colors.error,
    fontSize: 12,
  },
});

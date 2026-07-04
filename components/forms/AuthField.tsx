import { TextField } from '@/components/ui/TextField';
import { KeyboardTypeOptions, TextInputProps } from 'react-native';

type AuthFieldProps = {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  keyboardType?: KeyboardTypeOptions;
  secureTextEntry?: boolean;
  error?: string;
};

export function AuthField({ label, value, onChangeText, placeholder, keyboardType, secureTextEntry, error }: AuthFieldProps) {
  return (
    <TextField
      label={label}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      keyboardType={keyboardType}
      secureTextEntry={secureTextEntry}
      error={error}
    />
  );
}

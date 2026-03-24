import { Switch } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';

interface ThemedSwitchProps {
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
}

export function ThemedSwitch({ value, onValueChange, disabled }: ThemedSwitchProps) {
  const theme = useTheme();
  return (
    <Switch
      value={value}
      onValueChange={onValueChange}
      disabled={disabled}
      thumbColor={theme.textInverse}
      trackColor={{ false: theme.borderMedium, true: theme.accent }}
      ios_backgroundColor={theme.borderMedium}
    />
  );
}

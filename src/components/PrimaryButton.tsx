import { Pressable, Text, StyleSheet } from 'react-native';
import { colors, radius, type } from '../theme';

export function PrimaryButton({
  title,
  onPress,
  disabled,
  variant = 'primary',
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'secondary';
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.base,
        variant === 'secondary' ? styles.secondary : styles.primary,
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
      ]}
    >
      <Text style={variant === 'secondary' ? styles.secondaryText : styles.primaryText}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.md,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 12,
    marginVertical: 6,
  },
  primary: { backgroundColor: colors.primary },
  secondary: { backgroundColor: colors.chip, borderWidth: 1, borderColor: colors.border },
  disabled: { opacity: 0.5 },
  pressed: { opacity: 0.85 },
  primaryText: { color: colors.primaryText, fontSize: type.body, fontWeight: '700' },
  secondaryText: { color: colors.ink, fontSize: type.body, fontWeight: '600' },
});

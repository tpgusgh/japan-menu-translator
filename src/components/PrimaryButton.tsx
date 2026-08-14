import { Pressable, Text, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, radius, type, gradients, glowShadow } from '../theme';

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
  if (variant === 'secondary') {
    return (
      <Pressable
        onPress={onPress}
        disabled={disabled}
        style={({ pressed }) => [
          styles.base,
          styles.secondary,
          disabled && styles.disabled,
          pressed && !disabled && styles.pressed,
        ]}
      >
        <Text style={styles.secondaryText}>{title}</Text>
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [styles.wrapper, disabled && styles.disabled, pressed && !disabled && styles.pressed]}
    >
      <LinearGradient
        colors={gradients.brand}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.base, styles.primary]}
      >
        <View style={styles.sheen} pointerEvents="none" />
        <Text style={styles.primaryText}>{title}</Text>
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: radius.md,
    marginHorizontal: 12,
    marginVertical: 6,
    ...glowShadow,
  },
  base: {
    borderRadius: radius.md,
    paddingVertical: 15,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  primary: {},
  sheen: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '55%',
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderTopLeftRadius: radius.md,
    borderTopRightRadius: radius.md,
  },
  secondary: {
    backgroundColor: colors.chip,
    borderWidth: 1,
    borderColor: colors.border,
    marginHorizontal: 12,
    marginVertical: 6,
    paddingVertical: 15,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: { opacity: 0.5 },
  pressed: { opacity: 0.88 },
  primaryText: { color: colors.primaryText, fontSize: type.body, fontWeight: '700', letterSpacing: 0.2 },
  secondaryText: { color: colors.indigo, fontSize: type.body, fontWeight: '700' },
});

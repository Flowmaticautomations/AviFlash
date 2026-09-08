import { ReactNode } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
} from 'react-native';
import { useThemeColors } from '../hooks/useThemeColors';

export function ScreenContainer({ children }: { children: ReactNode }) {
  const colors = useThemeColors();
  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

export function ScreenTitle({ children }: { children: ReactNode }) {
  const colors = useThemeColors();
  return <Text style={[styles.title, { color: colors.text }]}>{children}</Text>;
}

export function ScreenSubtitle({ children }: { children: ReactNode }) {
  const colors = useThemeColors();
  return <Text style={[styles.subtitle, { color: colors.muted }]}>{children}</Text>;
}

export function FormField({
  label,
  error,
  ...inputProps
}: { label: string; error?: string | null } & TextInputProps) {
  const colors = useThemeColors();
  return (
    <View style={styles.fieldWrap}>
      <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
      <TextInput
        placeholderTextColor={colors.muted}
        style={[
          styles.input,
          { color: colors.text, borderColor: error ? colors.accent : colors.border, backgroundColor: colors.card },
        ]}
        {...inputProps}
      />
      {error ? <Text style={[styles.fieldError, { color: colors.accent }]}>{error}</Text> : null}
    </View>
  );
}

export function PrimaryButton({
  title,
  onPress,
  loading,
  disabled,
}: {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
}) {
  const colors = useThemeColors();
  const isDisabled = disabled || loading;
  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={[styles.primaryButton, { backgroundColor: colors.accent, opacity: isDisabled ? 0.6 : 1 }]}
    >
      {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.primaryButtonText}>{title}</Text>}
    </Pressable>
  );
}

export function SecondaryButton({
  title,
  onPress,
  disabled,
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  const colors = useThemeColors();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[styles.secondaryButton, { borderColor: colors.border, opacity: disabled ? 0.5 : 1 }]}
    >
      <Text style={[styles.secondaryButtonText, { color: colors.text }]}>{title}</Text>
    </Pressable>
  );
}

export function LinkText({ children, onPress }: { children: ReactNode; onPress: () => void }) {
  const colors = useThemeColors();
  return (
    <Pressable onPress={onPress}>
      <Text style={[styles.link, { color: colors.tint }]}>{children}</Text>
    </Pressable>
  );
}

export function Banner({ kind, children }: { kind: 'error' | 'success' | 'info'; children: ReactNode }) {
  const colors = useThemeColors();
  const color = kind === 'error' ? colors.accent : kind === 'success' ? colors.tint : colors.muted;
  return (
    <View style={[styles.banner, { borderColor: color, backgroundColor: colors.card }]}>
      <Text style={{ color }}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
    padding: 24,
    gap: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    marginBottom: 12,
    lineHeight: 20,
  },
  fieldWrap: {
    marginBottom: 4,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  fieldError: {
    fontSize: 12,
    marginTop: 4,
  },
  primaryButton: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
    width: '100%',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 16,
  },
  secondaryButton: {
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
    width: '100%',
  },
  secondaryButtonText: {
    fontWeight: '600',
    fontSize: 15,
  },
  link: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 8,
  },
  banner: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginVertical: 8,
  },
});

import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { PrimaryButton, ScreenContainer } from './ui';
import { useThemeColors } from '../hooks/useThemeColors';

// Text/icon placeholders, not real screenshots -- swap `icon`/`body` for
// actual app photos once Peet/Christian supply them. The step content and
// the optional, skippable, shown-once mechanics are the real deliverable.
const STEPS = [
  {
    icon: '📚',
    title: 'Create a Subject',
    body: 'Start by creating a Subject, like Mathematics or History.',
  },
  {
    icon: '🗂️',
    title: 'Add cards',
    body: 'Use New Card to add questions and answers, with optional photos.',
  },
  {
    icon: '🔁',
    title: 'Review to learn',
    body: 'Use Review to test yourself. AviFlash shuffles your cards each time using spaced repetition.',
  },
];

export function Tutorial({ onDone }: { onDone: () => void }) {
  const colors = useThemeColors();
  const [stepIndex, setStepIndex] = useState(0);
  const step = STEPS[stepIndex];
  const isLastStep = stepIndex === STEPS.length - 1;

  return (
    <ScreenContainer>
      <View style={styles.container}>
        <Pressable onPress={onDone} style={styles.skip}>
          <Text style={{ color: colors.muted, fontWeight: '600' }}>Skip</Text>
        </Pressable>

        <Text style={styles.icon}>{step.icon}</Text>
        <Text style={[styles.title, { color: colors.text }]}>{step.title}</Text>
        <Text style={[styles.body, { color: colors.muted }]}>{step.body}</Text>

        <View style={styles.dots}>
          {STEPS.map((_, i) => (
            <View
              key={i}
              style={[styles.dot, { backgroundColor: i === stepIndex ? colors.tint : colors.border }]}
            />
          ))}
        </View>

        <PrimaryButton
          title={isLastStep ? 'Get started' : 'Next'}
          onPress={() => (isLastStep ? onDone() : setStepIndex((i) => i + 1))}
        />
        {stepIndex > 0 ? (
          <Pressable onPress={() => setStepIndex((i) => i - 1)} style={{ marginTop: 8 }}>
            <Text style={{ color: colors.tint, textAlign: 'center', fontWeight: '600' }}>Back</Text>
          </Pressable>
        ) : null}
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 24,
  },
  skip: {
    position: 'absolute',
    top: 0,
    right: 0,
    padding: 8,
  },
  icon: {
    fontSize: 64,
    marginBottom: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
  },
  body: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 21,
    paddingHorizontal: 12,
  },
  dots: {
    flexDirection: 'row',
    gap: 8,
    marginVertical: 12,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});

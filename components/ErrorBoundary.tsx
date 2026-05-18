import { Component, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { reportToSentry } from '../lib/sentry';
import { colors } from '../theme/tokens';

interface ErrorBoundaryProps {
  children: ReactNode;
  onReset?: () => void;
}

interface ErrorBoundaryState {
  error: Error | null;
  errorInfo: { componentStack?: string | null } | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null, errorInfo: null };

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { error };
  }

  componentDidCatch(error: Error, errorInfo: { componentStack?: string | null }) {
    this.setState({ errorInfo });
    reportToSentry(error, { componentStack: errorInfo.componentStack ?? null });
  }

  handleReset = () => {
    this.setState({ error: null, errorInfo: null });
    this.props.onReset?.();
  };

  render() {
    if (!this.state.error) return this.props.children;

    const { error, errorInfo } = this.state;
    return (
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <Text style={styles.title}>Something went wrong</Text>
          <Text style={styles.subtitle}>
            The app hit an unexpected error. The details below have been sent to
            our team so we can fix it.
          </Text>

          <View style={styles.errorBox}>
            <Text style={styles.errorLabel}>Error</Text>
            <Text style={styles.errorText}>{error.name}: {error.message}</Text>
          </View>

          {error.stack ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorLabel}>Stack</Text>
              <Text style={styles.stackText}>{error.stack}</Text>
            </View>
          ) : null}

          {errorInfo?.componentStack ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorLabel}>Component stack</Text>
              <Text style={styles.stackText}>{errorInfo.componentStack}</Text>
            </View>
          ) : null}
        </ScrollView>

        <Pressable style={styles.button} onPress={this.handleReset}>
          <Text style={styles.buttonText}>Try again</Text>
        </Pressable>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgCream,
    paddingTop: 64,
  },
  scroll: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.textMain,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.textMuted,
    marginBottom: 20,
  },
  errorBox: {
    backgroundColor: colors.cardWhiteSolid,
    borderWidth: 1,
    borderColor: colors.lineWarm,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  errorLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: colors.brandCoral,
    marginBottom: 6,
  },
  errorText: {
    fontSize: 13,
    color: colors.textMain,
    fontFamily: 'Courier',
  },
  stackText: {
    fontSize: 11,
    color: colors.textBrown,
    fontFamily: 'Courier',
    lineHeight: 16,
  },
  button: {
    margin: 24,
    backgroundColor: colors.brandCoral,
    paddingVertical: 14,
    borderRadius: 999,
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 16,
  },
});

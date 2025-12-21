// church-library-app/app/borrow/index.tsx
import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { useRouter } from "expo-router";
import Icon from 'react-native-vector-icons/Feather';
import { theme } from "../../styles/theme"; // Import the theme

export default function BorrowStart() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      {/* Header with Back Button */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Icon name="arrow-left" size={24} color={theme.colors.navy} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Borrow Books</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.illustrationContainer}>
          <Icon name="book-open" size={80} color={theme.colors.teal} />
          <Text style={styles.title}>Start Borrow Process</Text>
          <Text style={styles.subtitle}>
            Scan a book QR code to begin borrowing process
          </Text>
        </View>

        <TouchableOpacity
          onPress={() => router.push("/borrow/scan-book")}
          style={styles.primaryButton}
        >
          <Text style={styles.primaryButtonText}>Start Scanning</Text>
          <Icon name="chevron-right" size={20} color={theme.colors.white} />
        </TouchableOpacity>

        <View style={styles.stepsContainer}>
          <Text style={styles.stepsTitle}>Process Steps:</Text>
          {['Scan Book QR Code', 'Scan User ID', 'Confirm Details'].map((step, index) => (
            <View key={index} style={styles.stepRow}>
              <View style={styles.stepIndicator}>
                <Text style={styles.stepNumber}>{index + 1}</Text>
              </View>
              <Text style={styles.stepText}>{step}</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.cream,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.lg + 20,
    paddingBottom: theme.spacing.md,
    backgroundColor: theme.colors.white,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  backButton: {
    padding: theme.spacing.sm,
    marginRight: theme.spacing.sm,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.navy,
  },
  content: {
    flex: 1,
    padding: theme.spacing.lg,
    justifyContent: 'center',
  },
  illustrationContainer: {
    alignItems: 'center',
    marginBottom: theme.spacing.xl,
  },
  title: {
    ...theme.typography.h1,
    color: theme.colors.navy,
    textAlign: 'center',
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.sm,
  },
  subtitle: {
    ...theme.typography.body,
    color: theme.colors.textLight,
    textAlign: 'center',
    maxWidth: '80%',
  },
  primaryButton: {
    backgroundColor: theme.colors.navy,
    borderRadius: theme.radius.md,
    paddingVertical: theme.spacing.lg,
    paddingHorizontal: theme.spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.xl,
    shadowColor: theme.colors.navy,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  primaryButtonText: {
    color: theme.colors.white,
    fontSize: 18,
    fontWeight: '600',
    marginRight: theme.spacing.sm,
  },
  stepsContainer: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.radius.md,
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  stepsTitle: {
    ...theme.typography.h3,
    color: theme.colors.navy,
    marginBottom: theme.spacing.md,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  stepIndicator: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: theme.colors.teal,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.md,
  },
  stepNumber: {
    color: theme.colors.white,
    fontSize: 14,
    fontWeight: '600',
  },
  stepText: {
    ...theme.typography.body,
    color: theme.colors.textDark,
  },
});
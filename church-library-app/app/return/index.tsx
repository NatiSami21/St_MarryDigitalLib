// church-library-app/app/return/index.tsx

import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { useRouter } from "expo-router";
import Icon from 'react-native-vector-icons/Feather';

import { Theme } from "../../styles/theme";

export default function ReturnStart() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      {/* Header with Back Button */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Icon name="arrow-left" size={24} color={Theme.colors.navy} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Return Books</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.illustrationContainer}>
          <Icon name="book" size={80} color={Theme.colors.teal} />
          <Text style={styles.title}>Start Return Process</Text>
          <Text style={styles.subtitle}>
            Scan a borrowed book QR code to begin return process
          </Text>
        </View>

        <TouchableOpacity
          onPress={() => router.push("/return/scan-book")}
          style={styles.primaryButton}
        >
          <Text style={styles.primaryButtonText}>Start Scanning</Text>
          <Icon name="chevron-right" size={20} color={Theme.colors.white} />
        </TouchableOpacity>

        <View style={styles.stepsContainer}>
          <Text style={styles.stepsTitle}>Process Steps:</Text>
          {['Scan Book QR Code', 'Scan User ID', 'Confirm Return'].map((step, index) => (
            <View key={index} style={styles.stepRow}>
              <View style={styles.stepIndicator}>
                <Text style={styles.stepNumber}>{index + 1}</Text>
              </View>
              <Text style={styles.stepText}>{step}</Text>
            </View>
          ))}
        </View>

        {/* Additional Info */}
        <View style={styles.infoCard}>
          <Icon name="info" size={20} color={Theme.colors.gold} />
          <View style={styles.infoContent}>
            <Text style={styles.infoTitle}>Important Note</Text>
            <Text style={styles.infoText}>
              Only books currently borrowed by users can be returned. 
              The system will verify the borrowing record before proceeding.
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.cream,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Theme.spacing.md,
    paddingTop: Theme.spacing.lg + 20,
    paddingBottom: Theme.spacing.md,
    backgroundColor: Theme.colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.border,
  },
  backButton: {
    padding: Theme.spacing.sm,
    marginRight: Theme.spacing.sm,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Theme.colors.navy,
  },
  content: {
    flex: 1,
    padding: Theme.spacing.lg,
    justifyContent: 'center',
  },
  illustrationContainer: {
    alignItems: 'center',
    marginBottom: Theme.spacing.xl,
  },
  title: {
    ...Theme.typography.h1,
    color: Theme.colors.navy,
    textAlign: 'center',
    marginTop: Theme.spacing.lg,
    marginBottom: Theme.spacing.sm,
  },
  subtitle: {
    ...Theme.typography.body,
    color: Theme.colors.textLight,
    textAlign: 'center',
    maxWidth: '80%',
  },
  primaryButton: {
    backgroundColor: Theme.colors.teal,
    borderRadius: Theme.radius.md,
    paddingVertical: Theme.spacing.lg,
    paddingHorizontal: Theme.spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Theme.spacing.xl,
    shadowColor: Theme.colors.teal,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  primaryButtonText: {
    color: Theme.colors.white,
    fontSize: 18,
    fontWeight: '600',
    marginRight: Theme.spacing.sm,
  },
  stepsContainer: {
    backgroundColor: Theme.colors.white,
    borderRadius: Theme.radius.md,
    padding: Theme.spacing.lg,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    marginBottom: Theme.spacing.lg,
  },
  stepsTitle: {
    ...Theme.typography.h3,
    color: Theme.colors.navy,
    marginBottom: Theme.spacing.md,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Theme.spacing.md,
  },
  stepIndicator: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Theme.colors.teal,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Theme.spacing.md,
  },
  stepNumber: {
    color: Theme.colors.white,
    fontSize: 14,
    fontWeight: '600',
  },
  stepText: {
    ...Theme.typography.body,
    color: Theme.colors.textDark,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(212, 175, 55, 0.1)',
    borderRadius: Theme.radius.md,
    padding: Theme.spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.2)',
  },
  infoContent: {
    flex: 1,
    marginLeft: Theme.spacing.md,
  },
  infoTitle: {
    ...Theme.typography.h3,
    color: Theme.colors.gold,
    marginBottom: Theme.spacing.xs,
  },
  infoText: {
    ...Theme.typography.caption,
    color: Theme.colors.textDark,
  },
});
// app/auth/bootstrap.tsx
import React from "react";
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  Dimensions,
  ScrollView 
} from "react-native";
import { useRouter } from "expo-router";
import Icon from 'react-native-vector-icons/Feather';

const { width, height } = Dimensions.get('window');

export default function BootstrapScreen() {
  const router = useRouter();

  const handleBeginSetup = () => {
    router.push("/auth/login-cloud");
  };

  return (
    <ScrollView 
      contentContainerStyle={styles.container}
      bounces={false}
    >
      {/* Hero Section */}
      <View style={styles.heroSection}>
        <View style={styles.logoContainer}>
          <Icon name="book-open" size={64} color="#D4AF37" />
          <Text style={styles.appName}>FAYDA</Text>
          <Text style={styles.appTagline}>Smart Library Management</Text>
        </View>
      </View>

      {/* Setup Card */}
      <View style={styles.setupCard}>
        <View style={styles.setupHeader}>
          <Icon name="settings" size={32} color="#003153" />
          <Text style={styles.setupTitle}>Initial Setup Required</Text>
        </View>

        <View style={styles.instructions}>
          <View style={styles.instructionItem}>
            <View style={styles.instructionIcon}>
              <Icon name="wifi" size={20} color="#FFFFFF" />
            </View>
            <View style={styles.instructionText}>
              <Text style={styles.instructionTitle}>Internet Connection</Text>
              <Text style={styles.instructionDesc}>
                Ensure this device is connected to the internet via Wi-Fi or mobile data
              </Text>
            </View>
          </View>

          <View style={styles.instructionItem}>
            <View style={[styles.instructionIcon, { backgroundColor: "#005B82" }]}>
              <Icon name="user-check" size={20} color="#FFFFFF" />
            </View>
            <View style={styles.instructionText}>
              <Text style={styles.instructionTitle}>Admin Credentials</Text>
              <Text style={styles.instructionDesc}>
                Have your administrator username and temporary PIN ready
              </Text>
            </View>
          </View>

          <View style={styles.instructionItem}>
            <View style={[styles.instructionIcon, { backgroundColor: "#D4AF37" }]}>
              <Icon name="download-cloud" size={20} color="#FFFFFF" />
            </View>
            <View style={styles.instructionText}>
              <Text style={styles.instructionTitle}>Data Download</Text>
              <Text style={styles.instructionDesc}>
                Library catalog and user data will be downloaded to this device
              </Text>
            </View>
          </View>
        </View>

        <TouchableOpacity
          onPress={handleBeginSetup}
          style={styles.setupButton}
          activeOpacity={0.9}
        >
          <Icon name="arrow-right-circle" size={22} color="#FFFFFF" />
          <Text style={styles.setupButtonText}>Begin Setup</Text>
        </TouchableOpacity>

        <View style={styles.setupFooter}>
          <Icon name="info" size={16} color="#7F8C8D" />
          <Text style={styles.setupFooterText}>
            This setup only needs to be completed once per device
          </Text>
        </View>
      </View>

      {/* Features Section */}
      <View style={styles.featuresSection}>
        <Text style={styles.featuresTitle}>What happens next?</Text>
        <View style={styles.featuresGrid}>
          <View style={styles.featureCard}>
            <Icon name="shield" size={24} color="#003153" />
            <Text style={styles.featureTitle}>Device Binding</Text>
            <Text style={styles.featureDesc}>
              This device will be securely linked to your account
            </Text>
          </View>
          <View style={styles.featureCard}>
            <Icon name="database" size={24} color="#003153" />
            <Text style={styles.featureTitle}>Offline Access</Text>
            <Text style={styles.featureDesc}>
              Work without internet after initial setup
            </Text>
          </View>
          <View style={styles.featureCard}>
            <Icon name="sync" size={24} color="#003153" />
            <Text style={styles.featureTitle}>Sync Ready</Text>
            <Text style={styles.featureDesc}>
              Automatic synchronization when online
            </Text>
          </View>
        </View>
      </View>

      {/* Bottom Info */}
      <View style={styles.bottomInfo}>
        <Text style={styles.bottomText}>Need help? Contact DiguwaSoft Support</Text>
        <Text style={styles.version}>Version 1.0 • Production Ready</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: "#FDFBF7",
    paddingBottom: 40,
  },
  heroSection: {
    alignItems: "center",
    paddingTop: 60,
    paddingBottom: 40,
  },
  logoContainer: {
    alignItems: "center",
  },
  appName: {
    fontSize: 42,
    fontWeight: "800",
    color: "#003153",
    marginTop: 16,
    letterSpacing: 2,
  },
  appTagline: {
    fontSize: 16,
    color: "#005B82",
    fontWeight: "500",
    marginTop: 4,
    letterSpacing: 0.5,
  },
  setupCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 28,
    marginHorizontal: 20,
    shadowColor: "#003153",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
    elevation: 8,
    borderWidth: 1,
    borderColor: "#E5E0D5",
    marginBottom: 40,
  },
  setupHeader: {
    alignItems: "center",
    marginBottom: 32,
  },
  setupTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#003153",
    marginTop: 16,
  },
  instructions: {
    marginBottom: 32,
  },
  instructionItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 24,
  },
  instructionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#003153",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  instructionText: {
    flex: 1,
  },
  instructionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#2C3E50",
    marginBottom: 4,
  },
  instructionDesc: {
    fontSize: 14,
    color: "#7F8C8D",
    lineHeight: 20,
  },
  setupButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#003153",
    borderRadius: 14,
    paddingVertical: 20,
    marginBottom: 24,
    shadowColor: "#003153",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
  setupButtonText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "700",
    marginLeft: 12,
  },
  setupFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: "#E5E0D5",
  },
  setupFooterText: {
    fontSize: 14,
    color: "#7F8C8D",
    marginLeft: 8,
    fontStyle: "italic",
  },
  featuresSection: {
    paddingHorizontal: 20,
    marginBottom: 40,
  },
  featuresTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#003153",
    marginBottom: 24,
    textAlign: "center",
  },
  featuresGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    flexWrap: "wrap",
  },
  featureCard: {
    width: width / 3.5,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E5E0D5",
    shadowColor: "#003153",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  featureTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#003153",
    marginTop: 12,
    marginBottom: 6,
    textAlign: "center",
  },
  featureDesc: {
    fontSize: 12,
    color: "#7F8C8D",
    textAlign: "center",
    lineHeight: 16,
  },
  bottomInfo: {
    alignItems: "center",
    paddingHorizontal: 20,
  },
  bottomText: {
    fontSize: 14,
    color: "#7F8C8D",
    marginBottom: 8,
    textAlign: "center",
  },
  version: {
    fontSize: 12,
    color: "#A0AEC0",
    fontStyle: "italic",
  },
});
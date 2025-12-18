// church-library-app/app/auth/login.tsx
import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Dimensions
} from "react-native";
import { useRouter } from "expo-router";
import Icon from 'react-native-vector-icons/Feather';

import { getLibrarianByUsername } from "../../db/queries/librarians";
import { verifyPinHash } from "../../lib/authUtils";
import { saveSession } from "../../lib/session";
import { getMetaValue } from "../../db/queries/meta";
import { getActiveShift } from "../../utils/shift";
import { scheduleShiftLogout } from "../../lib/shiftSession";
import { implicitClockIn } from "../../db/queries/attendance";

const { width } = Dimensions.get('window');

export default function LoginScreen() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPin, setShowPin] = useState(false);

  const handleLogin = async () => {
    if (!username.trim() || !pin.trim()) {
      Alert.alert("Validation", "Please enter both username and PIN.");
      return;
    }

    setLoading(true);

    try {
      /* --------------------------------------------------
       * 1. Local user lookup
       * --------------------------------------------------*/
      const user = await getLibrarianByUsername(username.trim());

      if (!user) {
        Alert.alert("User Not Found", "This username is not registered on this device.");
        return;
      }

      /* --------------------------------------------------
       * 2. Device binding check
       * --------------------------------------------------*/
      const deviceId = await getMetaValue("device_id");

      if (user.device_id && user.device_id !== deviceId) {
        Alert.alert(
          "Device Restriction",
          "This account is bound to another device. Please contact an administrator."
        );
        return;
      }

      /* --------------------------------------------------
       * 3. PIN verification
       * --------------------------------------------------*/
      const validPin = await verifyPinHash(
        pin.trim(),
        user.pin_salt ?? "",
        user.pin_hash ?? ""
      );

      if (!validPin) {
        Alert.alert("Invalid PIN", "The PIN you entered is incorrect.");
        return;
      }

      /* --------------------------------------------------
       * 4. Force PIN change if required
       * --------------------------------------------------*/
      if (user.require_pin_change) {
        router.push({
          pathname: "/auth/change-pin",
          params: { username: user.username },
        });
        return;
      }

      /* --------------------------------------------------
       * 5. Shift validation (LIBRARIAN ONLY)
       * --------------------------------------------------*/
      let activeShift: Awaited<ReturnType<typeof getActiveShift>> | null = null;

      if (user.role === "librarian") {
        activeShift = await getActiveShift(user.username);

        if (!activeShift) {
          Alert.alert(
            "Access Restricted",
            "You are outside your scheduled shift hours. Please return during your assigned shift time."
          );
          return;
        }
      }

      /* --------------------------------------------------
       * 6. Save session (after ALL checks)
       * --------------------------------------------------*/
      await saveSession({
        username: user.username,
        role: user.role,
        loggedInAt: Date.now(),
        device_id: deviceId,
      });

      /* --------------------------------------------------
       * 7. Attendance handling (LIBRARIAN ONLY)
       * --------------------------------------------------*/
      const HIGH_ATTENDANCE_VERIFICATION = 
        (process.env.EXPO_PUBLIC_HIGH_ATTENDANCE_VERIFICATION === "true") || false;

      if (user.role === "librarian" && activeShift) {
        if (HIGH_ATTENDANCE_VERIFICATION) {
          router.push("/attendance/verify");
          return;
        } else {
          await implicitClockIn(
            activeShift.id,
            user.username,
            activeShift.startTs
          );

          scheduleShiftLogout(activeShift.endTs, () => {
            router.replace("/auth/login");
          });
        }
      }

      /* --------------------------------------------------
       * 8. Schedule auto logout at shift end
       * --------------------------------------------------*/
      if (user.role === "librarian" && activeShift && !HIGH_ATTENDANCE_VERIFICATION) {
        scheduleShiftLogout(activeShift.endTs, () => {
          router.replace("/auth/login");
        });
      }

      /* --------------------------------------------------
       * 9. Navigate based on role
       * --------------------------------------------------*/
      console.log("✅ Login successful:", user.username);
      
      if (user.role === "admin") {
        router.replace("/admin");
      } else if (!HIGH_ATTENDANCE_VERIFICATION) {
        router.replace("/");
      }

    } catch (err) {
      console.error("❌ Login error:", err);
      Alert.alert("Authentication Error", "Unable to process login. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPin = () => {
    Alert.alert(
      "Forgot PIN?",
      "Please contact an administrator to reset your PIN. They can reset it from the admin panel."
    );
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* App Header Section */}
        <View style={styles.header}>
          <Icon name="book-open" size={48} color="#D4AF37" style={styles.headerIcon} />
          <Text style={styles.appTitle}>FAYDA LIBRARY</Text>
          <Text style={styles.appSubtitle}>Smart Management System</Text>
        </View>

        {/* Login Card */}
        <View style={styles.loginCard}>
          <View style={styles.cardHeader}>
            <Icon name="lock" size={24} color="#003153" />
            <Text style={styles.cardTitle}>Welcome Back</Text>
            <Text style={styles.cardDescription}>
              Sign in with your credentials to access the library system
            </Text>
          </View>

          {/* Username Field */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Username</Text>
            <View style={styles.inputContainer}>
              <Icon name="user" size={20} color="#7F8C8D" style={styles.inputIcon} />
              <TextInput
                placeholder="Enter your username"
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
                autoCorrect={false}
                editable={!loading}
                style={styles.textInput}
                placeholderTextColor="#A0AEC0"
              />
            </View>
          </View>

          {/* PIN Field */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>PIN Code</Text>
            <View style={styles.inputContainer}>
              <Icon name="key" size={20} color="#7F8C8D" style={styles.inputIcon} />
              <TextInput
                placeholder="Enter your 4-6 digit PIN"
                value={pin}
                onChangeText={setPin}
                secureTextEntry={!showPin}
                keyboardType="numeric"
                maxLength={6}
                editable={!loading}
                style={[styles.textInput, { flex: 1 }]}
                placeholderTextColor="#A0AEC0"
              />
              <TouchableOpacity
                onPress={() => setShowPin(!showPin)}
                style={styles.visibilityToggle}
              >
                <Icon 
                  name={showPin ? "eye-off" : "eye"} 
                  size={20} 
                  color="#005B82" 
                />
              </TouchableOpacity>
            </View>
            <Text style={styles.hintText}>PIN is 4-6 digits (numeric only)</Text>
          </View>

          {/* Login Button */}
          <TouchableOpacity
            onPress={handleLogin}
            disabled={loading}
            style={[styles.loginButton, loading && styles.loginButtonDisabled]}
            activeOpacity={0.9}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <>
                <Icon name="log-in" size={20} color="#FFFFFF" />
                <Text style={styles.loginButtonText}>Sign In</Text>
              </>
            )}
          </TouchableOpacity>

          {/* Forgot PIN Link */}
          <TouchableOpacity
            onPress={handleForgotPin}
            style={styles.forgotPinLink}
            disabled={loading}
          >
            <Icon name="help-circle" size={16} color="#005B82" />
            <Text style={styles.forgotPinText}>Forgot or need to reset PIN?</Text>
          </TouchableOpacity>

          {/* Status Indicator */}
          <View style={styles.statusContainer}>
            <View style={styles.statusDot} />
            <Text style={styles.statusText}>Offline Mode • Secure Local Authentication</Text>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Need help? Contact your library administrator
          </Text>
          <Text style={styles.versionText}>v1.0 • DiguwaSoft</Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FDFBF7",
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  header: {
    alignItems: "center",
    marginBottom: 40,
  },
  headerIcon: {
    marginBottom: 12,
  },
  appTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: "#003153",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  appSubtitle: {
    fontSize: 14,
    color: "#005B82",
    fontWeight: "500",
  },
  loginCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 28,
    shadowColor: "#003153",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 5,
    borderWidth: 1,
    borderColor: "#E5E0D5",
  },
  cardHeader: {
    alignItems: "center",
    marginBottom: 28,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#003153",
    marginTop: 12,
    marginBottom: 6,
  },
  cardDescription: {
    fontSize: 14,
    color: "#7F8C8D",
    textAlign: "center",
    lineHeight: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#2C3E50",
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#E5E0D5",
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
  },
  inputIcon: {
    marginRight: 12,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 16,
    color: "#2C3E50",
    minHeight: 50,
  },
  visibilityToggle: {
    padding: 8,
  },
  hintText: {
    fontSize: 12,
    color: "#7F8C8D",
    marginTop: 6,
    marginLeft: 4,
  },
  loginButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#003153",
    borderRadius: 12,
    paddingVertical: 18,
    marginTop: 8,
    marginBottom: 20,
    shadowColor: "#003153",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  loginButtonDisabled: {
    opacity: 0.7,
  },
  loginButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 10,
  },
  forgotPinLink: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  forgotPinText: {
    color: "#005B82",
    fontSize: 14,
    fontWeight: "500",
    marginLeft: 6,
    textDecorationLine: "underline",
  },
  statusContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#E5E0D5",
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#27AE60",
    marginRight: 8,
  },
  statusText: {
    fontSize: 12,
    color: "#7F8C8D",
  },
  footer: {
    alignItems: "center",
    marginTop: 40,
  },
  footerText: {
    fontSize: 13,
    color: "#7F8C8D",
    marginBottom: 8,
    textAlign: "center",
  },
  versionText: {
    fontSize: 12,
    color: "#A0AEC0",
    fontStyle: "italic",
  },
});
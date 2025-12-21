// app/auth/change-pin.tsx
import React, { useState, useEffect } from "react";
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
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import Icon from 'react-native-vector-icons/Feather';
import { getMetaValue } from "../../db/queries/meta";
import { postChangePin } from "../../lib/network";
import { updateLibrarianPin } from "../../db/queries/librarians";
import { generateSalt, hashPin } from "../../lib/authUtils";
import { getLibrarianByUsername } from "../../db/queries/librarians";

export default function ChangePinScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const usernameParam = (params.username as string) || "";
  const nextRoute = (params.next as string) || "/";

  const [oldPin, setOldPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [showOldPin, setShowOldPin] = useState(false);
  const [showNewPin, setShowNewPin] = useState(false);
  const [showConfirmPin, setShowConfirmPin] = useState(false);
  const [pinStrength, setPinStrength] = useState(0);

  // Calculate PIN strength
  useEffect(() => {
    if (newPin.length === 0) {
      setPinStrength(0);
      return;
    }

    let strength = 0;
    
    // Length check
    if (newPin.length >= 4) strength += 25;
    if (newPin.length >= 5) strength += 25;
    
    // Complexity check (not all same digits)
    const allSame = /^(\d)\1+$/.test(newPin);
    if (!allSame) strength += 25;
    
    // Not sequential (e.g., 1234, 4321)
    const isSequential = /1234|2345|3456|4567|5678|6789|9876|8765|7654|6543|5432|4321/.test(newPin);
    if (!isSequential) strength += 25;
    
    setPinStrength(strength);
  }, [newPin]);

  const getStrengthColor = () => {
    if (pinStrength >= 75) return "#27AE60"; // Strong - green
    if (pinStrength >= 50) return "#F39C12"; // Medium - orange
    if (pinStrength >= 25) return "#E74C3C"; // Weak - red
    return "#E5E0D5"; // Very weak - gray
  };

  const getStrengthText = () => {
    if (pinStrength >= 75) return "Strong";
    if (pinStrength >= 50) return "Medium";
    if (pinStrength >= 25) return "Weak";
    return "Very Weak";
  };

  const handleChange = async () => {
    if (!oldPin || oldPin.length < 4) {
      Alert.alert("Validation", "Please enter your current PIN (minimum 4 digits).");
      return;
    }
    
    if (!newPin || newPin.length < 4) {
      Alert.alert("Validation", "New PIN must be at least 4 digits.");
      return;
    }
    
    if (newPin === oldPin) {
      Alert.alert("Validation", "New PIN must be different from your current PIN.");
      return;
    }
    
    if (newPin !== confirmPin) {
      Alert.alert("Validation", "New PIN and confirmation do not match.");
      return;
    }

    if (pinStrength < 50) {
      Alert.alert(
        "Weak PIN", 
        "Your PIN is too weak. Please choose a stronger PIN (avoid simple patterns).",
        [{ text: "OK" }]
      );
      return;
    }

    setLoading(true);
    
    try {
      const deviceId = await getMetaValue("device_id");

      if (!deviceId) {
        Alert.alert("Error", "Device not properly initialized.");
        setLoading(false);
        return;
      }

      const res = await postChangePin({
        username: usernameParam,
        old_pin: oldPin,
        new_pin: newPin,
        device_id: deviceId,
      });

      if (!res.ok) {
        Alert.alert("Change Failed", res.reason || "Unable to change PIN. Please try again.");
        return;
      }

      // Update local database to match cloud
      const librarian = await getLibrarianByUsername(usernameParam);
      if (librarian) {
        const salt = generateSalt();
        const hash = await hashPin(newPin, salt);

        await updateLibrarianPin(
          librarian.id,
          salt,
          hash,
          false // require_pin_change = false
        );
      }

      Alert.alert(
        "Success", 
        "PIN changed successfully.",
        [{ 
          text: "Continue", 
          onPress: () => router.replace(nextRoute as any) 
        }]
      );

    } catch (err: any) {
      console.error("change-pin error:", err);
      Alert.alert(
        "Error", 
        "Failed to change PIN. Please check your connection and try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const renderPinInput = (
    label: string, 
    value: string, 
    setValue: (text: string) => void,
    show: boolean,
    setShow: (show: boolean) => void,
    placeholder: string
  ) => (
    <View style={styles.inputGroup}>
      <Text style={styles.inputLabel}>{label}</Text>
      <View style={styles.inputContainer}>
        <Icon name="key" size={20} color="#7F8C8D" style={styles.inputIcon} />
        <TextInput
          placeholder={placeholder}
          value={value}
          onChangeText={setValue}
          secureTextEntry={!show}
          keyboardType="numeric"
          maxLength={6}
          editable={!loading}
          style={[styles.textInput, { flex: 1 }]}
          placeholderTextColor="#A0AEC0"
        />
        <TouchableOpacity
          onPress={() => setShow(!show)}
          style={styles.visibilityToggle}
        >
          <Icon 
            name={show ? "eye-off" : "eye"} 
            size={20} 
            color="#005B82" 
          />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <Icon name="shield" size={48} color="#D4AF37" style={styles.headerIcon} />
          <Text style={styles.appTitle}>SECURITY SETUP</Text>
          <Text style={styles.appSubtitle}>Secure your library account</Text>
        </View>

        {/* User Info Card */}
        <View style={styles.userCard}>
          <View style={styles.userHeader}>
            <Icon name="user-check" size={20} color="#005B82" />
            <Text style={styles.userTitle}>Account: {usernameParam}</Text>
          </View>
          <Text style={styles.userInfo}>
            You are required to set a new PIN for security purposes
          </Text>
        </View>

        {/* Change PIN Card */}
        <View style={styles.pinCard}>
          <View style={styles.cardHeader}>
            <Icon name="refresh-cw" size={24} color="#003153" />
            <Text style={styles.cardTitle}>Set New PIN</Text>
            <Text style={styles.cardDescription}>
              Choose a 4-6 digit PIN that's easy for you to remember but hard for others to guess
            </Text>
          </View>

          {/* Current PIN */}
          {renderPinInput(
            "Current PIN",
            oldPin,
            setOldPin,
            showOldPin,
            setShowOldPin,
            "Enter your current PIN"
          )}

          {/* New PIN */}
          {renderPinInput(
            "New PIN",
            newPin,
            setNewPin,
            showNewPin,
            setShowNewPin,
            "Enter new 4-6 digit PIN"
          )}

          {/* PIN Strength Meter */}
          {newPin.length > 0 && (
            <View style={styles.strengthContainer}>
              <View style={styles.strengthBar}>
                <View 
                  style={[
                    styles.strengthFill, 
                    { 
                      width: `${pinStrength}%`,
                      backgroundColor: getStrengthColor()
                    }
                  ]} 
                />
              </View>
              <Text style={[styles.strengthText, { color: getStrengthColor() }]}>
                Strength: {getStrengthText()}
              </Text>
            </View>
          )}

          {/* Confirm PIN */}
          {renderPinInput(
            "Confirm New PIN",
            confirmPin,
            setConfirmPin,
            showConfirmPin,
            setShowConfirmPin,
            "Re-enter your new PIN"
          )}

          {/* PIN Guidelines */}
          <View style={styles.guidelinesBox}>
            <Text style={styles.guidelinesTitle}>PIN Guidelines:</Text>
            <View style={styles.guidelineItem}>
              <Icon name="check" size={14} color="#27AE60" />
              <Text style={styles.guidelineText}>Must be 4-6 digits</Text>
            </View>
            <View style={styles.guidelineItem}>
              <Icon name="check" size={14} color="#27AE60" />
              <Text style={styles.guidelineText}>Avoid simple patterns (1234, 0000)</Text>
            </View>
            <View style={styles.guidelineItem}>
              <Icon name="check" size={14} color="#27AE60" />
              <Text style={styles.guidelineText}>Don't use your birth year</Text>
            </View>
            <View style={styles.guidelineItem}>
              <Icon name="check" size={14} color="#27AE60" />
              <Text style={styles.guidelineText}>Don't share your PIN with anyone</Text>
            </View>
          </View>

          {/* Change Button */}
          <TouchableOpacity
            onPress={handleChange}
            disabled={loading || !oldPin || !newPin || !confirmPin}
            style={[
              styles.changeButton, 
              (loading || !oldPin || !newPin || !confirmPin) && styles.buttonDisabled
            ]}
            activeOpacity={0.9}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <>
                <Icon name="lock" size={20} color="#FFFFFF" />
                <Text style={styles.changeButtonText}>Change PIN</Text>
              </>
            )}
          </TouchableOpacity>

          {/* Security Notice */}
          <View style={styles.securityNotice}>
            <Icon name="info" size={16} color="#005B82" />
            <Text style={styles.securityText}>
              This PIN will be required every time you log into the library system
            </Text>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Forgot your PIN? Contact your library administrator
          </Text>
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
    paddingHorizontal: 24,
    paddingVertical: 30,
  },
  header: {
    alignItems: "center",
    marginBottom: 32,
  },
  headerIcon: {
    marginBottom: 12,
  },
  appTitle: {
    fontSize: 26,
    fontWeight: "700",
    color: "#003153",
    letterSpacing: 1,
    marginBottom: 4,
  },
  appSubtitle: {
    fontSize: 14,
    color: "#005B82",
    fontWeight: "500",
  },
  userCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "#E5E0D5",
    shadowColor: "#003153",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  userHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  userTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#003153",
    marginLeft: 10,
  },
  userInfo: {
    fontSize: 14,
    color: "#7F8C8D",
    lineHeight: 20,
  },
  pinCard: {
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
    marginBottom: 8,
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
    fontSize: 16,
    paddingVertical: 16,
    color: "#2C3E50",
    minHeight: 50,
  },
  visibilityToggle: {
    padding: 8,
  },
  strengthContainer: {
    marginBottom: 20,
  },
  strengthBar: {
    height: 6,
    backgroundColor: "#E5E0D5",
    borderRadius: 3,
    overflow: "hidden",
    marginBottom: 6,
  },
  strengthFill: {
    height: "100%",
    borderRadius: 3,
  },
  strengthText: {
    fontSize: 12,
    fontWeight: "600",
  },
  guidelinesBox: {
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    padding: 18,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "#E5E0D5",
  },
  guidelinesTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#003153",
    marginBottom: 12,
  },
  guidelineItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  guidelineText: {
    fontSize: 13,
    color: "#7F8C8D",
    marginLeft: 8,
  },
  changeButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#003153",
    borderRadius: 12,
    paddingVertical: 18,
    marginBottom: 24,
    shadowColor: "#003153",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  changeButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 10,
  },
  securityNotice: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#E5E0D5",
  },
  securityText: {
    fontSize: 13,
    color: "#005B82",
    marginLeft: 8,
    fontWeight: "500",
  },
  footer: {
    alignItems: "center",
    marginTop: 40,
  },
  footerText: {
    fontSize: 13,
    color: "#7F8C8D",
    textAlign: "center",
  },
});
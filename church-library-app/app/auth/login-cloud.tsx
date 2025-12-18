// app/auth/login-cloud.tsx
import { saveSession } from "../../lib/session";
import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  ScrollView,
  Dimensions
} from "react-native";
import { useRouter } from "expo-router";
import Icon from 'react-native-vector-icons/Feather';
import { applySnapshot } from "../../lib/activation";
import { postActivate } from "../../lib/network";
import * as Device from "expo-device";

const { width } = Dimensions.get('window');

export default function LoginCloud() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPin, setShowPin] = useState(false);
  const [deviceInfo, setDeviceInfo] = useState<{id?: string, name?: string}>({});

  React.useEffect(() => {
    // Get device info on mount
    const getDeviceInfo = async () => {
      let device_id: string = '';
      let device_name: string = Device.deviceName || 'Unknown Device';
      
      if (Platform.OS === 'android') {
        device_id = Device.osInternalBuildId || `android-${Date.now()}`;
      } else if (Platform.OS === 'ios') {
        device_id = Device.modelId || Device.deviceName || `ios-${Date.now()}`;
      } else {
        device_id = Device.deviceName || `device-${Date.now()}`;
      }
      
      if (!device_id) {
        device_id = `device-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      }
      
      setDeviceInfo({ id: device_id, name: device_name });
    };
    
    getDeviceInfo();
  }, []);

  const handleActivate = async () => {
    if (!username.trim() || !pin.trim()) {
      Alert.alert("Validation Required", "Please enter both username and PIN.");
      return;
    }

    if (!deviceInfo.id) {
      Alert.alert("Device Error", "Unable to identify this device. Please restart the app.");
      return;
    }

    setLoading(true);
    
    try {
      console.log("Activating device:", deviceInfo);

      const resp = await postActivate({ 
        username: username.trim(), 
        pin: pin.trim(), 
        device_id: deviceInfo.id 
      });

      if (!resp.ok) {
        const reason = resp.reason || "Activation failed. Please check credentials and try again.";
        Alert.alert("Activation Failed", reason);
        setLoading(false);
        return;
      }

      const { snapshot, role, require_pin_change, last_pulled_commit } = resp;

      if (!snapshot) {
        Alert.alert("Server Error", "No data received from server. Please try again.");
        setLoading(false);
        return;
      }

      console.log(`Applying snapshot for ${username}, role: ${role}`);

      // Apply snapshot to local DB
      await applySnapshot({
        snapshot,
        device_id: deviceInfo.id,
        activatedBy: username.trim(),
        lastPulledCommit: last_pulled_commit ?? null,
      });

      // If server requires PIN change, route to change-pin screen
      if (require_pin_change) {
        console.log(`PIN change required for ${username}`);
        router.replace({ 
          pathname: "/auth/change-pin", 
          params: { 
            username: username.trim(), 
            next: role === "admin" ? "/admin" : "/" 
          } 
        });
        setLoading(false);
        return;
      }

      // Save session with device_id
      await saveSession({
        username: username.trim(),
        role,
        loggedInAt: Date.now(),
        device_id: deviceInfo.id
      });

      console.log(`Device activated for ${username}, redirecting...`);

      // Route to appropriate dashboard
      router.replace(role === "admin" ? "/admin" : "/");
      
    } catch (err: any) {
      console.error("Activation error:", err);
      Alert.alert(
        "Connection Error", 
        err.message || "Unable to connect to server. Please check your internet connection and try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header Section */}
        <View style={styles.header}>
          <Icon name="tablet" size={48} color="#D4AF37" style={styles.headerIcon} />
          <Text style={styles.appTitle}>DEVICE ACTIVATION</Text>
          <Text style={styles.appSubtitle}>Bind this device to your account</Text>
        </View>

        {/* Device Info Card */}
        <View style={styles.deviceCard}>
          <View style={styles.deviceHeader}>
            <Icon name="smartphone" size={22} color="#005B82" />
            <Text style={styles.deviceTitle}>Current Device</Text>
          </View>
          <View style={styles.deviceInfo}>
            <View style={styles.deviceRow}>
              <Text style={styles.deviceLabel}>Device Name:</Text>
              <Text style={styles.deviceValue}>{deviceInfo.name}</Text>
            </View>
            <View style={styles.deviceRow}>
              <Text style={styles.deviceLabel}>Platform:</Text>
              <Text style={styles.deviceValue}>{Platform.OS.toUpperCase()}</Text>
            </View>
          </View>
        </View>

        {/* Activation Card */}
        <View style={styles.activationCard}>
          <View style={styles.cardHeader}>
            <Icon name="link-2" size={24} color="#003153" />
            <Text style={styles.cardTitle}>Activate Device</Text>
            <Text style={styles.cardDescription}>
              Enter your credentials to bind this device to your library account. 
              Requires internet connection.
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
            <Text style={styles.inputLabel}>Temporary PIN</Text>
            <View style={styles.inputContainer}>
              <Icon name="key" size={20} color="#7F8C8D" style={styles.inputIcon} />
              <TextInput
                placeholder="Enter temporary PIN"
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
            <Text style={styles.hintText}>Provided by administrator</Text>
          </View>

          {/* Activation Button */}
          <TouchableOpacity
            onPress={handleActivate}
            disabled={loading}
            style={[styles.activateButton, loading && styles.buttonDisabled]}
            activeOpacity={0.9}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <>
                <Icon name="check-circle" size={20} color="#FFFFFF" />
                <Text style={styles.activateButtonText}>Activate This Device</Text>
              </>
            )}
          </TouchableOpacity>

          {/* Network Status */}
          <View style={styles.networkStatus}>
            <Icon 
              name="wifi" 
              size={16} 
              color="#27AE60" 
              style={styles.networkIcon} 
            />
            <Text style={styles.networkText}>
              Online Mode • Secure Server Connection Required
            </Text>
          </View>

          {/* Important Notice */}
          <View style={styles.noticeBox}>
            <Icon name="alert-triangle" size={18} color="#D4AF37" />
            <Text style={styles.noticeText}>
              Note: Each account can only be active on one device at a time.
            </Text>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Having issues? Ensure you're connected to the internet
          </Text>
          <Text style={styles.versionText}>Secure Activation • v1.0</Text>
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
  deviceCard: {
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
  deviceHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  deviceTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#003153",
    marginLeft: 10,
  },
  deviceInfo: {
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    padding: 16,
  },
  deviceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  deviceLabel: {
    fontSize: 14,
    color: "#7F8C8D",
    fontWeight: "500",
  },
  deviceValue: {
    fontSize: 14,
    color: "#2C3E50",
    fontWeight: "600",
  },
  activationCard: {
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
  activateButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#003153",
    borderRadius: 12,
    paddingVertical: 18,
    marginTop: 10,
    marginBottom: 24,
    shadowColor: "#003153",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  activateButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 10,
  },
  networkStatus: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  networkIcon: {
    marginRight: 8,
  },
  networkText: {
    fontSize: 13,
    color: "#27AE60",
    fontWeight: "500",
  },
  noticeBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#FFF9E6",
    borderLeftWidth: 4,
    borderLeftColor: "#D4AF37",
    padding: 16,
    borderRadius: 8,
  },
  noticeText: {
    fontSize: 13,
    color: "#7F5600",
    marginLeft: 12,
    flex: 1,
    lineHeight: 18,
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
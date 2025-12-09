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
} from "react-native";
import { useRouter } from "expo-router";
import { applySnapshot } from "../../lib/activation";
import { postActivate } from "../../lib/network";
import * as Device from "expo-device";

export default function LoginCloud() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);

  const handleActivate = async () => {
    if (!username.trim() || !pin.trim()) {
      Alert.alert("Validation", "Please enter username and PIN.");
      return;
    }

    setLoading(true);
    try {
      // Generate stable device ID - using Expo Device API
      let device_id: string;
      
      if (Platform.OS === 'android') {
        // For Android, use osInternalBuildId which is stable
        device_id = Device.osInternalBuildId || `android-${Date.now()}`;
      } else if (Platform.OS === 'ios') {
        // For iOS, use modelId or deviceName
        device_id = Device.modelId || Device.deviceName || `ios-${Date.now()}`;
      } else {
        // Web or other platforms
        device_id = Device.deviceName || `device-${Date.now()}`;
      }
      
      // Ensure device_id is not null/undefined
      if (!device_id) {
        device_id = `device-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      }
      
      console.log("Activating with device_id:", device_id);

      const resp = await postActivate({ 
        username: username.trim(), 
        pin: pin.trim(), 
        device_id 
      });

      if (!resp.ok) {
        const reason = resp.reason || "Activation failed";
        Alert.alert("Activation Failed", reason);
        setLoading(false);
        return;
      }

      const { snapshot, role, require_pin_change, last_pulled_commit } = resp;

      if (!snapshot) {
        Alert.alert("Error", "No snapshot received from server");
        setLoading(false);
        return;
      }

      console.log(`Applying snapshot for ${username}, role: ${role}, device: ${device_id}`);

      // Apply snapshot to local DB
      await applySnapshot({
        snapshot,
        device_id,
        activatedBy: username.trim(),
        lastPulledCommit: last_pulled_commit ?? null,
      });

      // If server requires PIN change, route to change-pin screen
      if (require_pin_change) {
        console.log(`PIN change required for ${username}, redirecting...`);
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
        device_id
      });

      console.log(`Session saved for ${username}, redirecting to ${role === "admin" ? "/admin" : "/"}`);

      // Route to appropriate dashboard
      router.replace(role === "admin" ? "/admin" : "/");
      
    } catch (err: any) {
      console.error("Activation error:", err);
      Alert.alert(
        "Activation Error", 
        err.message || "Failed to activate device. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === "ios" ? "padding" : "height"} 
      style={{ 
        flex: 1, 
        padding: 20, 
        backgroundColor: "#f8fafc", 
        justifyContent: "center" 
      }}
    >
      <View style={{ 
        backgroundColor: "white", 
        padding: 24, 
        borderRadius: 16, 
        elevation: 4,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      }}>
        <Text style={{ 
          fontSize: 28, 
          fontWeight: "900", 
          color: "#1e3a8a", 
          marginBottom: 8,
          textAlign: "center"
        }}>
          📱 Device Activation
        </Text>

        <Text style={{ 
          color: "#475569", 
          marginBottom: 24,
          textAlign: "center",
          fontSize: 16,
          lineHeight: 22
        }}>
          Enter your credentials to activate this device with the library system.
          {"\n"}You'll need an active internet connection.
        </Text>

        <View style={{ marginBottom: 16 }}>
          <Text style={{ 
            color: "#334155", 
            fontWeight: "600", 
            marginBottom: 6,
            fontSize: 15
          }}>
            Username
          </Text>
          <TextInput
            placeholder="Enter your username"
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            autoCorrect={false}
            style={{ 
              borderWidth: 2, 
              borderColor: "#e6eef9", 
              padding: 14, 
              borderRadius: 10,
              fontSize: 16,
              backgroundColor: "#f8fafc"
            }}
            editable={!loading}
          />
        </View>

        <View style={{ marginBottom: 28 }}>
          <Text style={{ 
            color: "#334155", 
            fontWeight: "600", 
            marginBottom: 6,
            fontSize: 15
          }}>
            Temporary PIN
          </Text>
          <TextInput
            placeholder="Enter 4-6 digit PIN"
            value={pin}
            onChangeText={setPin}
            secureTextEntry
            keyboardType="numeric"
            maxLength={6}
            style={{ 
              borderWidth: 2, 
              borderColor: "#e6eef9", 
              padding: 14, 
              borderRadius: 10,
              fontSize: 16,
              backgroundColor: "#f8fafc"
            }}
            editable={!loading}
          />
        </View>

        <TouchableOpacity
          onPress={handleActivate}
          style={{ 
            backgroundColor: "#1e40af", 
            padding: 16, 
            borderRadius: 12, 
            alignItems: "center",
            shadowColor: "#1e40af",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.2,
            shadowRadius: 8,
            elevation: 3
          }}
          disabled={loading}
        >
          {loading ? (
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <ActivityIndicator color="white" size="small" style={{ marginRight: 8 }} />
              <Text style={{ color: "white", fontWeight: "700", fontSize: 16 }}>
                Activating...
              </Text>
            </View>
          ) : (
            <Text style={{ color: "white", fontWeight: "800", fontSize: 17 }}>
              ✅ Activate This Device
            </Text>
          )}
        </TouchableOpacity>

        <Text style={{ 
          color: "#64748b", 
          fontSize: 13, 
          textAlign: "center", 
          marginTop: 20,
          fontStyle: "italic"
        }}>
          This will download library data and bind this device to your account.
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
}
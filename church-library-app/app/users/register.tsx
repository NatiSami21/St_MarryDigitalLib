// church-library-app/app/users/register.tsx

import React, { useEffect, useState } from "react";
import {
  ScrollView,
  Text,
  TextInput,
  View,
  TouchableOpacity,
  Alert,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Feather';

import PhotoPicker from "../../components/PhotoPicker";
import { upsertUser } from "../../db/users";
import { events } from "../../utils/events";
import { getSession } from "../../lib/session";
import { isInsideShift } from "../../utils/shift";
import { theme } from "../../styles/theme";

import { Ionicons } from '@expo/vector-icons';

export default function RegisterUser() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();

  const [faydaId, setFaydaId] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [gender, setGender] = useState<"Male" | "Female" | "">("");
  const [address, setAddress] = useState("");
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [scanning, setScanning] = useState(false);
  
  // Validation states
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (params.fayda) {
      const id = String(params.fayda);
      // Validate 16-digit format when coming from scan
      if (/^\d{16}$/.test(id)) {
        setFaydaId(id);
      } else {
        Alert.alert("Invalid ID", "Scanned ID must be 16 digits");
      }
    }
  }, [params]);

  const assertCanWrite = async (): Promise<boolean> => {
    const session = await getSession();

    if (!session) {
      Alert.alert("Session Expired", "Please log in again.");
      router.replace("/auth/login");
      return false;
    }

    if (session.role === "admin") return true;

    const allowed = await isInsideShift(session.username);
    if (!allowed) {
      Alert.alert(
        "Action Blocked",
        "Your shift has ended. You cannot register users."
      );
      return false;
    }

    return true;
  };

  const handleScanPress = () => {
    setScanning(true);
    router.push({
      pathname: "/users/scan",
      params: {
        returnTo: "/users/register",
      },
    });
  };

  // Validation functions
  const validateFaydaId = (id: string): string => {
    if (!id.trim()) return "Fayda ID is required";
    if (!/^\d+$/.test(id)) return "Fayda ID must contain only numbers";
    if (id.length !== 16) return "Fayda ID must be exactly 16 digits";
    return "";
  };

  const validateName = (name: string): string => {
    if (!name.trim()) return "Full name is required";
    if (name.trim().length < 2) return "Name must be at least 2 characters";
    return "";
  };

  const validatePhone = (phone: string): string => {
    if (!phone.trim()) return "Phone number is required";
    // Ethiopian phone number format: starts with 09 or +2519 followed by 8 digits
    const phoneRegex = /^(09\d{8}|\+2519\d{8}|2519\d{8})$/;
    if (!phoneRegex.test(phone.trim())) {
      return "Please enter a valid Ethiopian phone number (e.g., 0912345678)";
    }
    return "";
  };

  const validateGender = (gender: string): string => {
    if (!gender) return "Gender is required";
    if (!["Male", "Female"].includes(gender)) return "Please select Male or Female";
    return "";
  };

  const validateAddress = (address: string): string => {
    if (!address.trim()) return "Address is required";
    if (address.trim().length < 5) return "Address is too short";
    return "";
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    newErrors.faydaId = validateFaydaId(faydaId);
    newErrors.name = validateName(name);
    newErrors.phone = validatePhone(phone);
    newErrors.gender = validateGender(gender);
    newErrors.address = validateAddress(address);
    
    setErrors(newErrors);
    
    // Check if any errors exist
    return !Object.values(newErrors).some(error => error !== "");
  };

  const handleFaydaIdChange = (text: string) => {
    // Only allow numbers and limit to 16 digits
    const numbersOnly = text.replace(/[^\d]/g, "");
    if (numbersOnly.length <= 16) {
      setFaydaId(numbersOnly);
      // Clear error when user starts typing
      if (errors.faydaId) {
        setErrors(prev => ({ ...prev, faydaId: "" }));
      }
    }
  };

  const handlePhoneChange = (text: string) => {
    setPhone(text);
    // Clear error when user starts typing
    if (errors.phone) {
      setErrors(prev => ({ ...prev, phone: "" }));
    }
  };

  const handleSave = async () => {
    const canWrite = await assertCanWrite();
    if (!canWrite) return;
    
    if (!validateForm()) {
      Alert.alert("Validation Error", "Please fix all errors before saving.");
      return;
    }

    setProcessing(true);

    try {
      await upsertUser({
        fayda_id: faydaId,
        name: name.trim(),
        phone: phone.trim(),
        gender: gender.trim(),
        address: address.trim(),
        photo_uri: photoUri ?? "",
      });

      Alert.alert("Success", "User saved successfully!", [
        {
          text: "OK",
          onPress: () => {
            events.emit("refresh-users");
            router.push("/users/list");
          },
        },
      ]);
    } catch (err) {
      console.log(err);
      Alert.alert("Error", "Failed to save user. Please try again.");
    } finally {
      setProcessing(false);
    }
  };

  const clearForm = () => {
    setFaydaId("");
    setName("");
    setPhone("");
    setGender("");
    setAddress("");
    setPhotoUri(null);
    setErrors({});
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + theme.spacing.lg }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Icon name="arrow-left" size={24} color={theme.colors.navy} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Register User</Text>
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Create New User</Text>

        {/* Fayda ID Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Fayda ID</Text>
          <View style={styles.idContainer}>
            <TextInput
              value={faydaId}
              onChangeText={handleFaydaIdChange}
              style={[styles.idInput, errors.faydaId && styles.inputError]}
              placeholder="16 digit FAN "
              placeholderTextColor={theme.colors.textLight}
              keyboardType="numeric"
              maxLength={16}
            />
            <TouchableOpacity
              onPress={handleScanPress}
              style={styles.scanButton}
              disabled={scanning}
            >
              {scanning ? (
                <ActivityIndicator size="small" color={theme.colors.white} />
              ) : (
                <>
                  <Icon name="camera" size={18} color={theme.colors.white} />
                  <Text style={styles.scanButtonText}>Scan</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
          {errors.faydaId ? (
            <Text style={styles.errorText}>{errors.faydaId}</Text>
          ) : (
            <Text style={styles.digitCount}>
              {faydaId.length}/16 digits
              {faydaId.length === 16 && (
                <Icon name="check-circle" size={14} color={theme.colors.success} style={styles.checkIcon} />
              )}
            </Text>
          )}
        </View>

        {/* Personal Information Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Personal Information</Text>
          
          <View style={styles.inputGroup}>
            <Icon name="user" size={18} color={theme.colors.textLight} style={styles.inputIcon} />
            <TextInput
              value={name}
              onChangeText={(text) => {
                setName(text);
                if (errors.name) setErrors(prev => ({ ...prev, name: "" }));
              }}
              placeholder="Full Name"
              placeholderTextColor={theme.colors.textLight}
              style={[styles.input, errors.name && styles.inputError]}
            />
          </View>
          {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}

          <View style={styles.inputGroup}>
            <Icon name="phone" size={18} color={theme.colors.textLight} style={styles.inputIcon} />
            <TextInput
              value={phone}
              onChangeText={handlePhoneChange}
              keyboardType="phone-pad"
              placeholder="Phone Number"
              placeholderTextColor={theme.colors.textLight}
              style={[styles.input, errors.phone && styles.inputError]}
            />
          </View>
          {errors.phone && <Text style={styles.errorText}>{errors.phone}</Text>}

          {/* Gender Selection */}
          <View style={styles.genderContainer}>
            <Text style={styles.genderLabel}>Gender</Text>
            <View style={styles.genderOptions}>
              {["Male", "Female"].map((option) => (
                <TouchableOpacity
                  key={option}
                  style={[
                    styles.genderOption,
                    gender === option && styles.genderOptionSelected,
                    { flexDirection: 'row', alignItems: 'center', gap: 6 } // Ensures icon & text align
                  ]}
                  onPress={() => {
                    setGender(option as "Male" | "Female");
                    if (errors.gender) setErrors(prev => ({ ...prev, gender: "" }));
                  }}
                >
                  <Ionicons
                    // "man" and "woman" are the person silhouettes in Ionicons
                    name={option === "Male" ? "man" : "woman"}
                    size={18}
                    color={gender === option ? theme.colors.white : theme.colors.textLight}
                  />
                  <Text
                    style={[
                      styles.genderOptionText,
                      gender === option && styles.genderOptionTextSelected,
                    ]}
                  >
                    {option}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          {errors.gender && <Text style={styles.errorText}>{errors.gender}</Text>}

          <View style={styles.inputGroup}>
            <Icon name="map-pin" size={18} color={theme.colors.textLight} style={styles.inputIcon} />
            <TextInput
              value={address}
              onChangeText={(text) => {
                setAddress(text);
                if (errors.address) setErrors(prev => ({ ...prev, address: "" }));
              }}
              placeholder="Address"
              placeholderTextColor={theme.colors.textLight}
              style={[
                styles.input, 
                styles.addressInput,
                errors.address && styles.inputError
              ]}
              multiline
              numberOfLines={3}
            />
          </View>
          {errors.address && <Text style={styles.errorText}>{errors.address}</Text>}
        </View>

        {/* Photo Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Profile Photo</Text>
          <Text style={styles.sectionSubtitle}>Optional - Capture or upload a photo</Text>
          <View style={styles.photoContainer}>
            <PhotoPicker imageUri={photoUri} onChange={setPhotoUri} />
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity
            onPress={clearForm}
            style={styles.clearButton}
            disabled={processing}
          >
            <Icon name="trash-2" size={18} color={theme.colors.error} />
            <Text style={styles.clearButtonText}>Clear</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleSave}
            style={[
              styles.saveButton, 
              (!name.trim() || !faydaId.trim() || !phone.trim() || !gender || !address.trim()) && 
              styles.saveButtonDisabled
            ]}
            disabled={processing || !name.trim() || !faydaId.trim() || !phone.trim() || !gender || !address.trim()}
          >
            {processing ? (
              <ActivityIndicator size="small" color={theme.colors.white} />
            ) : (
              <>
                <Icon name="save" size={18} color={theme.colors.white} />
                <Text style={styles.saveButtonText}>Save User</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Form Validation Help */}
        <View style={styles.helpCard}>
          <Icon name="info" size={20} color={theme.colors.gold} />
          <View style={styles.helpContent}>
            <Text style={styles.helpTitle}>Required Fields</Text>
            <Text style={styles.helpText}>
              • Fayda ID: 16 digits{'\n'} 
              • Phone: (09XXXXXXXX){'\n'}
            </Text>
          </View>
        </View>
      </ScrollView>
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: theme.spacing.lg,
    paddingBottom: theme.spacing.xl,
  },
  title: {
    ...theme.typography.h1,
    color: theme.colors.navy,
    marginBottom: theme.spacing.xs,
  },
  subtitle: {
    ...theme.typography.body,
    color: theme.colors.error,
    marginBottom: theme.spacing.xl,
    fontWeight: '600',
  },
  section: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.radius.md,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    shadowColor: theme.colors.navy,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    ...theme.typography.h3,
    color: theme.colors.navy,
    marginBottom: theme.spacing.xs,
  },
  sectionSubtitle: {
    ...theme.typography.caption,
    color: theme.colors.textLight,
    marginBottom: theme.spacing.md,
  },
  requiredLabel: {
    ...theme.typography.caption,
    color: theme.colors.error,
    marginBottom: theme.spacing.sm,
    fontWeight: '500',
  },
  idContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  idInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    padding: theme.spacing.md,
    fontSize: 16,
    color: theme.colors.textDark,
    marginRight: theme.spacing.sm,
    fontFamily: 'monospace', // For better number display
    letterSpacing: 1,
  },
  digitCount: {
    ...theme.typography.caption,
    color: theme.colors.textLight,
    textAlign: 'right',
    marginTop: theme.spacing.xs,
  },
  checkIcon: {
    marginLeft: theme.spacing.xs,
  },
  scanButton: {
    backgroundColor: theme.colors.teal,
    borderRadius: theme.radius.sm,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 80,
  },
  scanButtonText: {
    color: theme.colors.white,
    fontWeight: '600',
    marginLeft: theme.spacing.xs,
  },
  inputGroup: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    marginBottom: theme.spacing.xs,
    paddingHorizontal: theme.spacing.md,
  },
  inputIcon: {
    marginRight: theme.spacing.sm,
    marginTop: theme.spacing.md,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: theme.colors.textDark,
    paddingVertical: theme.spacing.md,
    minHeight: 50,
  },
  addressInput: {
    minHeight: 80,
    textAlignVertical: 'top',
    paddingTop: theme.spacing.md,
  },
  inputError: {
    borderColor: theme.colors.error,
    borderWidth: 2,
  },
  errorText: {
    color: theme.colors.error,
    fontSize: 12,
    marginBottom: theme.spacing.md,
    marginTop: 2,
    fontWeight: '500',
  },
  genderContainer: {
    marginBottom: theme.spacing.md,
  },
  genderLabel: {
    ...theme.typography.body,
    color: theme.colors.textDark,
    marginBottom: theme.spacing.sm,
    fontWeight: '500',
  },
  genderOptions: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  genderOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.white,
  },
  genderOptionSelected: {
    backgroundColor: theme.colors.teal,
    borderColor: theme.colors.teal,
  },
  genderOptionText: {
    ...theme.typography.body,
    color: theme.colors.textDark,
    fontWeight: '500',
    marginLeft: theme.spacing.sm,
  },
  genderOptionTextSelected: {
    color: theme.colors.white,
    fontWeight: '600',
  },
  photoContainer: {
    alignItems: 'center',
  },
  actionButtons: {
    flexDirection: 'row',
    marginBottom: theme.spacing.xl,
  },
  clearButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.white,
    borderRadius: theme.radius.md,
    paddingVertical: theme.spacing.lg,
    paddingHorizontal: theme.spacing.xl,
    marginRight: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.error,
  },
  clearButtonText: {
    color: theme.colors.error,
    fontSize: 16,
    fontWeight: '600',
    marginLeft: theme.spacing.sm,
  },
  saveButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.navy,
    borderRadius: theme.radius.md,
    paddingVertical: theme.spacing.lg,
    paddingHorizontal: theme.spacing.xl,
    marginLeft: theme.spacing.md,
    shadowColor: theme.colors.navy,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  saveButtonDisabled: {
    backgroundColor: theme.colors.textLight,
    opacity: 0.7,
  },
  saveButtonText: {
    color: theme.colors.white,
    fontSize: 16,
    fontWeight: '600',
    marginLeft: theme.spacing.sm,
  },
  helpCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(212, 175, 55, 0.1)',
    borderRadius: theme.radius.md,
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.2)',
  },
  helpContent: {
    flex: 1,
    marginLeft: theme.spacing.md,
  },
  helpTitle: {
    ...theme.typography.h3,
    color: theme.colors.gold,
    marginBottom: theme.spacing.xs,
  },
  helpText: {
    ...theme.typography.caption,
    color: theme.colors.textDark,
    lineHeight: 18,
  },
});
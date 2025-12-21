import React, { useEffect, useState } from "react";
import { 
  View, 
  Text, 
  TextInput, 
  ScrollView, 
  TouchableOpacity, 
  ActivityIndicator, 
  Alert,
  StyleSheet 
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Feather';
import Ionicons from 'react-native-vector-icons/Ionicons';

import { getUser, updateUser } from "../../../db/users";
import PhotoPicker from "../../../components/PhotoPicker";
import { getSession } from "../../../lib/session";
import { isInsideShift } from "../../../utils/shift";
import { theme } from "../../../styles/theme";
import { events } from "../../../utils/events";

interface UserForm {
  name: string;
  gender: string;
  phone: string;
  address: string;
  photo_uri: string | null;
}

export default function EditUser() {
  const { fayda_id } = useLocalSearchParams();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [form, setForm] = useState<UserForm>({
    name: "",
    gender: "",
    phone: "",
    address: "",
    photo_uri: null,
  });
  
  // Validation states
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    loadUser();
  }, []);

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
        "Your shift has ended. You cannot edit users."
      );
      return false;
    }

    return true;
  };

  const loadUser = async () => {
    try {
      const user = await getUser(String(fayda_id));
      if (user) {
        setForm({
          name: user.name || "",
          gender: user.gender || "",
          phone: user.phone || "",
          address: user.address || "",
          photo_uri: user.photo_uri || null,
        });
      }
    } catch (err) {
      console.log("Load user error:", err);
      Alert.alert("Error", "Failed to load user data");
    } finally {
      setLoading(false);
    }
  };

  // Validation functions (same as register)
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
    
    newErrors.name = validateName(form.name);
    newErrors.phone = validatePhone(form.phone);
    newErrors.gender = validateGender(form.gender);
    newErrors.address = validateAddress(form.address);
    
    setErrors(newErrors);
    
    // Check if any errors exist
    return !Object.values(newErrors).some(error => error !== "");
  };

  const handlePhoneChange = (text: string) => {
    setForm({ ...form, phone: text });
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
      await updateUser(String(fayda_id), {
        name: form.name.trim(),
        gender: form.gender.trim(),
        phone: form.phone.trim(),
        address: form.address.trim(),
        photo_uri: form.photo_uri,
      });

      Alert.alert("Success", "User updated successfully!", [
        {
          text: "OK",
          onPress: () => {
            events.emit("refresh-users");
            router.replace(`/users/${fayda_id}`);
          },
        },
      ]);
    } catch (err) {
      console.log("Update user error:", err);
      Alert.alert("Error", "Could not update user. Please try again.");
    } finally {
      setProcessing(false);
    }
  };

  const handleCancel = () => {
    Alert.alert(
      "Discard Changes",
      "Are you sure you want to discard your changes?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Discard", 
          style: "destructive",
          onPress: () => router.back()
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.navy} />
        <Text style={styles.loadingText}>Loading user data...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + theme.spacing.lg }]}>
        <TouchableOpacity
          onPress={handleCancel}
          style={styles.backButton}
        >
          <Icon name="arrow-left" size={24} color={theme.colors.navy} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit User</Text>
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Edit User Profile</Text>
        <Text style={styles.subtitle}>Update user information below</Text>

        {/* User ID Display */}
        <View style={styles.idSection}>
          <Icon name="hash" size={24} color={theme.colors.teal} />
          <View style={styles.idContent}>
            <Text style={styles.idLabel}>Fayda ID</Text>
            <Text style={styles.idValue}>{fayda_id}</Text>
            <Text style={styles.idNote}>16-digit number, cannot be changed</Text>
          </View>
        </View>

        {/* Personal Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Personal Information</Text> 
          
          <View style={styles.inputGroup}>
            <Icon name="user" size={18} color={theme.colors.textLight} style={styles.inputIcon} />
            <TextInput
              value={form.name}
              onChangeText={(text) => {
                setForm({ ...form, name: text });
                if (errors.name) setErrors(prev => ({ ...prev, name: "" }));
              }}
              placeholder="Full Name"
              placeholderTextColor={theme.colors.textLight}
              style={[styles.input, errors.name && styles.inputError]}
            />
          </View>
          {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}

          {/* Gender Selection */}
          <View style={styles.genderContainer}>
          <Text style={styles.genderLabel}>Gender</Text>
          <View style={styles.genderOptions}>
            {["Male", "Female"].map((option) => (
              <TouchableOpacity
                key={option}
                style={[
                  styles.genderOption,
                  form.gender === option && styles.genderOptionSelected,
                ]}
                onPress={() => {
                  setForm({ ...form, gender: option });
                  if (errors.gender) setErrors(prev => ({ ...prev, gender: "" }));
                }}
              >
                <Ionicons
                  // Using "man" and "woman" for the person silhouettes
                  name={option === "Male" ? "man" : "woman"}
                  size={18}
                  color={form.gender === option ? theme.colors.white : theme.colors.textLight}
                />
                <Text
                  style={[
                    styles.genderOptionText,
                    form.gender === option && styles.genderOptionTextSelected,
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
            <Icon name="phone" size={18} color={theme.colors.textLight} style={styles.inputIcon} />
            <TextInput
              value={form.phone}
              onChangeText={handlePhoneChange}
              keyboardType="phone-pad"
              placeholder="Phone Number"
              placeholderTextColor={theme.colors.textLight}
              style={[styles.input, errors.phone && styles.inputError]}
            />
          </View>
          {errors.phone && <Text style={styles.errorText}>{errors.phone}</Text>}

          <View style={styles.inputGroup}>
            <Icon name="map-pin" size={18} color={theme.colors.textLight} style={styles.inputIcon} />
            <TextInput
              value={form.address}
              onChangeText={(text) => {
                setForm({ ...form, address: text });
                if (errors.address) setErrors(prev => ({ ...prev, address: "" }));
              }}
              placeholder="Address"
              placeholderTextColor={theme.colors.textLight}
              style={[styles.input, styles.multilineInput, errors.address && styles.inputError]}
              multiline
              numberOfLines={3}
            />
          </View>
          {errors.address && <Text style={styles.errorText}>{errors.address}</Text>}
        </View>

        {/* Photo Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Profile Photo</Text>
          <Text style={styles.sectionSubtitle}>Update the user's profile photo (optional)</Text>
          <View style={styles.photoContainer}>
            <PhotoPicker imageUri={form.photo_uri} onChange={(uri) => 
              setForm({ ...form, photo_uri: uri })
            } />
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity
            onPress={handleCancel}
            style={styles.cancelButton}
            disabled={processing}
          >
            <Icon name="x" size={20} color={theme.colors.error} />
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleSave}
            style={[
              styles.saveButton, 
              (!form.name.trim() || !form.phone.trim() || !form.gender || !form.address.trim()) && 
              styles.saveButtonDisabled
            ]}
            disabled={processing || !form.name.trim() || !form.phone.trim() || !form.gender || !form.address.trim()}
          >
            {processing ? (
              <ActivityIndicator size="small" color={theme.colors.white} />
            ) : (
              <>
                <Icon name="save" size={20} color={theme.colors.white} />
                <Text style={styles.saveButtonText}>Save Changes</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Form Notes */}
        <View style={styles.notesCard}>
          <Icon name="info" size={20} color={theme.colors.gold} />
          <View style={styles.notesContent}>
            <Text style={styles.notesTitle}>Editing Notes</Text>
            <Text style={styles.notesText}>
              • All fields are required for complete user profile{'\n'}
              • Phone: Valid Ethiopian number (09XXXXXXXX){'\n'}
              • Gender: Select Male or Female only{'\n'}
              • Address: At least 5 characters{'\n'}
              • Profile photos help with identification
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
  loadingContainer: {
    flex: 1,
    backgroundColor: theme.colors.cream,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    ...theme.typography.body,
    color: theme.colors.textLight,
    marginTop: theme.spacing.md,
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
    color: theme.colors.textLight,
    marginBottom: theme.spacing.xl,
  },
  idSection: {
    flexDirection: 'row',
    alignItems: 'center',
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
  idContent: {
    flex: 1,
    marginLeft: theme.spacing.md,
  },
  idLabel: {
    ...theme.typography.caption,
    color: theme.colors.textLight,
    marginBottom: 4,
  },
  idValue: {
    ...theme.typography.h3,
    color: theme.colors.teal,
    fontFamily: 'monospace',
    letterSpacing: 1,
  },
  idNote: {
    ...theme.typography.caption,
    color: theme.colors.textLight,
    fontStyle: 'italic',
    marginTop: 4,
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
    marginBottom: theme.spacing.md,
    fontWeight: '500',
  },
  photoContainer: {
    alignItems: 'center',
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
  multilineInput: {
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
  actionButtons: {
    flexDirection: 'row',
    marginBottom: theme.spacing.xl,
  },
  cancelButton: {
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
  cancelButtonText: {
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
  notesCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(212, 175, 55, 0.1)',
    borderRadius: theme.radius.md,
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.2)',
  },
  notesContent: {
    flex: 1,
    marginLeft: theme.spacing.md,
  },
  notesTitle: {
    ...theme.typography.h3,
    color: theme.colors.gold,
    marginBottom: theme.spacing.xs,
  },
  notesText: {
    ...theme.typography.caption,
    color: theme.colors.textDark,
    lineHeight: 18,
  },
});
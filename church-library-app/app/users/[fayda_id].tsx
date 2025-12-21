// church-library-app/app/users/%5Bfayda_id%5D.tsx

import React, { useEffect, useState } from "react";
import { 
  View, 
  Text, 
  Image, 
  ActivityIndicator, 
  TouchableOpacity, 
  ScrollView, 
  StyleSheet,
  Alert 
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Feather';
import Ionicons from 'react-native-vector-icons/Ionicons';

import { getUser } from "../../db/users";
import { Theme } from "../../styles/theme";
import { events } from "../../utils/events";

interface User {
  fayda_id: string;
  name: string;
  phone: string;
  gender?: string;
  address?: string;
  photo_uri?: string;
}

export default function UserDetailsScreen() {
  const { fayda_id } = useLocalSearchParams();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadUser = async () => {
    try {
      const data = await getUser(String(fayda_id)) as User;
      setUser(data);
    } catch (err) {
      console.log("User load error:", err);
      Alert.alert("Error", "Failed to load user details");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadUser();
  }, []);

  useEffect(() => {
    const sub = events.listen("refresh-users", loadUser);
    return () => sub.remove();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadUser();
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Theme.colors.navy} />
        <Text style={styles.loadingText}>Loading user details...</Text>
      </View>
    );
  }

  if (!user) {
    return (
      <View style={styles.errorContainer}>
        <Icon name="user-x" size={64} color={Theme.colors.error} />
        <Text style={styles.errorTitle}>User Not Found</Text>
        <Text style={styles.errorText}>
          The user with ID {fayda_id} could not be found.
        </Text>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.primaryButton}
        >
          <Icon name="arrow-left" size={20} color={Theme.colors.white} style={{ marginRight: Theme.spacing.sm }} />
          <Text style={styles.primaryButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const DetailRow = ({ icon, label, value }: { icon: string; label: string; value: string }) => (
    <View style={styles.detailRow}>
      <Icon name={icon as any} size={18} color={Theme.colors.textLight} style={styles.detailIcon} />
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue} numberOfLines={2}>{value}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + Theme.spacing.lg }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Icon name="arrow-left" size={24} color={Theme.colors.navy} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>User Details</Text>
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Header */}
        <View style={styles.profileCard}>
          <View style={styles.avatarContainer}>
            <Image
              source={
                user.photo_uri
                  ? { uri: user.photo_uri }
                  : require("../../assets/user-placeholder.png")
              }
              style={styles.avatar}
            />
            <View style={styles.statusBadge}>
              <Icon name="user-check" size={12} color={Theme.colors.success} />
              <Text style={styles.statusText}>Active Member</Text>
            </View>
          </View>

          <Text style={styles.userName}>{user.name}</Text>
          <Text style={styles.userId}>Fayda ID: {user.fayda_id}</Text>
        </View>

        {/* Personal Information */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            <Icon name="user" size={20} color={Theme.colors.navy} />
            <Text style={{ marginLeft: Theme.spacing.sm }}>Personal Information</Text>
          </Text>

          <DetailRow icon="user" label="Full Name" value={user.name} />
          <DetailRow icon="users" label="Gender" value={user.gender || "Not specified"} />
          <DetailRow icon="phone" label="Phone" value={user.phone || "Not provided"} />
          <DetailRow icon="map-pin" label="Address" value={user.address || "Not provided"} />
          <DetailRow icon="hash" label="Fayda ID" value={user.fayda_id} />
        </View>

        {/* Quick Stats */}
        <View style={styles.statsCard}>
          <Text style={styles.cardTitle}>
            <Icon name="activity" size={20} color={Theme.colors.navy} />
            <Text style={{ marginLeft: Theme.spacing.sm }}>User Stats</Text>
          </Text>
          
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Icon name="book-open" size={24} color={Theme.colors.teal} />
              <Text style={styles.statNumber}>12</Text>
              <Text style={styles.statLabel}>Books Borrowed</Text>
            </View>
            <View style={styles.statItem}>
              <Icon name="clock" size={24} color={Theme.colors.warning} />
              <Text style={styles.statNumber}>3</Text>
              <Text style={styles.statLabel}>Active Loans</Text>
            </View>
            <View style={styles.statItem}>
              <Icon name="calendar" size={24} color={Theme.colors.success} />
              <Text style={styles.statNumber}>9</Text>
              <Text style={styles.statLabel}>Returns</Text>
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity
            onPress={() => router.push(`/users/edit/${user.fayda_id}`)}
            style={styles.primaryButton}
          >
            <Icon name="edit-2" size={20} color={Theme.colors.white} />
            <Text style={styles.primaryButtonText}>Edit User</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push(`/transactions/history/${user.fayda_id}`)}
            style={styles.secondaryButton}
          >
            <Icon name="clipboard" size={20} color={Theme.colors.teal} />
            <Text style={styles.secondaryButtonText}>Borrow History</Text>
          </TouchableOpacity>
        </View>

        {/* Additional Actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity style={styles.quickAction}>
            <View style={styles.quickActionIcon}>
              <Ionicons name="scan" size={20} color={Theme.colors.navy} />
            </View>
            <Text style={styles.quickActionText}>Scan ID Again</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.quickAction}>
            <View style={styles.quickActionIcon}>
              <Icon name="printer" size={20} color={Theme.colors.navy} />
            </View>
            <Text style={styles.quickActionText}>Print ID Card</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.quickAction}>
            <View style={styles.quickActionIcon}>
              <Icon name="mail" size={20} color={Theme.colors.navy} />
            </View>
            <Text style={styles.quickActionText}>Send SMS</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
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
  loadingContainer: {
    flex: 1,
    backgroundColor: Theme.colors.cream,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    ...Theme.typography.body,
    color: Theme.colors.textLight,
    marginTop: Theme.spacing.md,
  },
  errorContainer: {
    flex: 1,
    backgroundColor: Theme.colors.cream,
    padding: Theme.spacing.xl,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorTitle: {
    ...Theme.typography.h2,
    color: Theme.colors.error,
    textAlign: 'center',
    marginTop: Theme.spacing.lg,
    marginBottom: Theme.spacing.sm,
  },
  errorText: {
    ...Theme.typography.body,
    color: Theme.colors.textLight,
    textAlign: 'center',
    marginBottom: Theme.spacing.xl,
    maxWidth: '80%',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Theme.spacing.lg,
    paddingBottom: Theme.spacing.xl + 20,
  },
  profileCard: {
    backgroundColor: Theme.colors.white,
    borderRadius: Theme.radius.lg,
    padding: Theme.spacing.xl,
    alignItems: 'center',
    marginBottom: Theme.spacing.lg,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    shadowColor: Theme.colors.navy,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 5,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: Theme.spacing.lg,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: Theme.colors.border,
  },
  statusBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(39, 174, 96, 0.1)',
    paddingVertical: Theme.spacing.xs,
    paddingHorizontal: Theme.spacing.sm,
    borderRadius: Theme.radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(39, 174, 96, 0.2)',
  },
  statusText: {
    ...Theme.typography.caption,
    color: Theme.colors.success,
    fontWeight: '600',
    marginLeft: Theme.spacing.xs,
  },
  userName: {
    ...Theme.typography.h1,
    color: Theme.colors.navy,
    textAlign: 'center',
    marginBottom: Theme.spacing.xs,
  },
  userId: {
    ...Theme.typography.body,
    color: Theme.colors.textLight,
    textAlign: 'center',
  },
  card: {
    backgroundColor: Theme.colors.white,
    borderRadius: Theme.radius.md,
    padding: Theme.spacing.lg,
    marginBottom: Theme.spacing.lg,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    shadowColor: Theme.colors.navy,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardTitle: {
    ...Theme.typography.h3,
    color: Theme.colors.navy,
    marginBottom: Theme.spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: Theme.spacing.md,
    paddingBottom: Theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.border,
  },
  detailIcon: {
    width: 24,
    marginRight: Theme.spacing.sm,
  },
  detailLabel: {
    ...Theme.typography.caption,
    color: Theme.colors.textLight,
    width: 80,
    marginRight: Theme.spacing.md,
  },
  detailValue: {
    ...Theme.typography.body,
    color: Theme.colors.textDark,
    flex: 1,
    fontWeight: '500',
  },
  statsCard: {
    backgroundColor: Theme.colors.white,
    borderRadius: Theme.radius.md,
    padding: Theme.spacing.lg,
    marginBottom: Theme.spacing.lg,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    shadowColor: Theme.colors.navy,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statNumber: {
    ...Theme.typography.h2,
    color: Theme.colors.navy,
    marginTop: Theme.spacing.xs,
    marginBottom: Theme.spacing.xs,
  },
  statLabel: {
    ...Theme.typography.caption,
    color: Theme.colors.textLight,
    textAlign: 'center',
  },
  actionButtons: {
    flexDirection: 'row',
    marginBottom: Theme.spacing.lg,
  },
  primaryButton: {
    flex: 1,
    backgroundColor: Theme.colors.navy,
    borderRadius: Theme.radius.md,
    paddingVertical: Theme.spacing.lg,
    paddingHorizontal: Theme.spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Theme.spacing.md,
    shadowColor: Theme.colors.navy,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  primaryButtonText: {
    color: Theme.colors.white,
    fontSize: 16,
    fontWeight: '600',
    marginLeft: Theme.spacing.sm,
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: Theme.colors.white,
    borderRadius: Theme.radius.md,
    paddingVertical: Theme.spacing.lg,
    paddingHorizontal: Theme.spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: Theme.spacing.md,
    borderWidth: 1,
    borderColor: Theme.colors.teal,
  },
  secondaryButtonText: {
    color: Theme.colors.teal,
    fontSize: 16,
    fontWeight: '600',
    marginLeft: Theme.spacing.sm,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Theme.spacing.lg,
  },
  quickAction: {
    alignItems: 'center',
    flex: 1,
    paddingHorizontal: Theme.spacing.xs,
  },
  quickActionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0, 49, 83, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Theme.spacing.sm,
  },
  quickActionText: {
    ...Theme.typography.caption,
    color: Theme.colors.textDark,
    textAlign: 'center',
    fontWeight: '500',
  },
});
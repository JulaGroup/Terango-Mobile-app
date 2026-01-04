import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Modal,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '@/constants/config';
import { LinearGradient } from 'expo-linear-gradient';

interface SubscriptionPackage {
  id: string;
  name: string;
  displayName: string;
  price: number;
  currency: string;
  durationDays: number;
  maxProducts: number | null;
  priorityListing: boolean;
  featuredBadge: boolean;
  topPlacement: boolean;
  supportLevel: string;
  dedicatedManager: boolean;
  socialPostsPerMonth: number;
  storiesPerWeek: number;
  promoVideosPerMonth: number;
  bannerAdsPerMonth: number;
  deliveryFeeDiscount: number;
  customerFeeDiscount: boolean;
  advancedAnalytics: boolean;
  fasterPayouts: boolean;
  earlyFeatureAccess: boolean;
}

interface VendorSubscription {
  id: string;
  status: string;
  startDate: string;
  endDate: string;
  isTrial: boolean;
  autoRenew: boolean;
  package: SubscriptionPackage;
  productsUsed: number;
  socialPostsUsed: number;
}

export default function SubscriptionScreen() {
  const [currentSubscription, setCurrentSubscription] = useState<VendorSubscription | null>(null);
  const [packages, setPackages] = useState<SubscriptionPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<SubscriptionPackage | null>(null);
  const [showPackageModal, setShowPackageModal] = useState(false);
  const [subscribing, setSubscribing] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        Alert.alert('Error', 'Please login to view subscriptions');
        router.back();
        return;
      }

      const [subscriptionRes, packagesRes] = await Promise.all([
        axios
          .get(`${API_URL}/api/subscriptions/my-subscription`, {
            headers: { Authorization: `Bearer ${token}` },
          })
          .catch(() => ({ data: { subscription: null } })),
        axios.get(`${API_URL}/api/subscriptions/packages`),
      ]);

      setCurrentSubscription(subscriptionRes.data.subscription);
      setPackages(packagesRes.data.packages.sort((a: any, b: any) => a.displayOrder - b.displayOrder));
    } catch (error: any) {
      console.error('Error fetching subscription data:', error);
      Alert.alert('Error', 'Failed to load subscription data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const handleSubscribe = async (packageId: string) => {
    try {
      setSubscribing(true);
      const token = await AsyncStorage.getItem('token');

      const response = await axios.post(
        `${API_URL}/api/subscriptions/subscribe`,
        { packageId },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      Alert.alert('Success!', response.data.message || 'Subscription activated successfully');
      setShowPackageModal(false);
      fetchData();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to subscribe');
    } finally {
      setSubscribing(false);
    }
  };

  const handleStartTrial = async () => {
    try {
      setSubscribing(true);
      const token = await AsyncStorage.getItem('token');

      const response = await axios.post(
        `${API_URL}/api/subscriptions/start-trial`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      Alert.alert('Trial Started!', response.data.message || '30-day trial activated');
      fetchData();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to start trial');
    } finally {
      setSubscribing(false);
    }
  };

  const getDaysRemaining = (endDate: string) => {
    const end = new Date(endDate);
    const now = new Date();
    const diff = end.getTime() - now.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  const getPackageColor = (name: string): readonly [string, string] => {
    switch (name) {
      case 'Bantaba':
        return ['#3B82F6', '#2563EB'] as const;
      case 'Kaira':
        return ['#10B981', '#059669'] as const;
      case 'Toubab':
        return ['#8B5CF6', '#7C3AED'] as const;
      default:
        return ['#6B7280', '#4B5563'] as const;
    }
  };

  const getPackageIcon = (name: string) => {
    switch (name) {
      case 'Bantaba':
        return 'cube-outline';
      case 'Kaira':
        return 'trending-up-outline';
      case 'Toubab':
        return 'crown-outline';
      default:
        return 'cube-outline';
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#111827" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Subscription</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#8B5CF6" />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Subscription</Text>
        <TouchableOpacity onPress={onRefresh} style={styles.refreshButton}>
          <Ionicons name="refresh" size={22} color="#6B7280" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Current Subscription */}
        {currentSubscription ? (
          <View style={styles.currentSubscriptionCard}>
            <LinearGradient
              colors={getPackageColor(currentSubscription.package.name)}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.currentSubscriptionHeader}
            >
              <View style={styles.currentSubscriptionTop}>
                <View style={styles.currentSubscriptionTitleRow}>
                  <Ionicons name={getPackageIcon(currentSubscription.package.name) as any} size={32} color="white" />
                  <View style={styles.currentSubscriptionTitleContainer}>
                    <Text style={styles.currentSubscriptionTitle}>{currentSubscription.package.displayName}</Text>
                    {currentSubscription.isTrial && (
                      <View style={styles.trialBadge}>
                        <Ionicons name="gift" size={12} color="white" />
                        <Text style={styles.trialBadgeText}>FREE TRIAL</Text>
                      </View>
                    )}
                  </View>
                </View>
                <View style={styles.statusBadge}>
                  <Text style={styles.statusBadgeText}>{currentSubscription.status}</Text>
                </View>
              </View>

              <View style={styles.daysRemainingContainer}>
                <Text style={styles.daysRemainingLabel}>Days Remaining</Text>
                <Text style={styles.daysRemainingValue}>{getDaysRemaining(currentSubscription.endDate)}</Text>
              </View>
            </LinearGradient>

            <View style={styles.currentSubscriptionBody}>
              <View style={styles.detailRow}>
                <Ionicons name="calendar-outline" size={20} color="#6B7280" />
                <View style={styles.detailTextContainer}>
                  <Text style={styles.detailLabel}>Valid Until</Text>
                  <Text style={styles.detailValue}>
                    {new Date(currentSubscription.endDate).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </Text>
                </View>
              </View>

              <View style={styles.detailRow}>
                <Ionicons name="cash-outline" size={20} color="#6B7280" />
                <View style={styles.detailTextContainer}>
                  <Text style={styles.detailLabel}>Monthly Cost</Text>
                  <Text style={styles.detailValue}>
                    {currentSubscription.package.currency} {currentSubscription.package.price.toLocaleString()}
                  </Text>
                </View>
              </View>

              {currentSubscription.package.maxProducts && (
                <View style={styles.usageContainer}>
                  <Text style={styles.usageLabel}>Products Used</Text>
                  <View style={styles.usageBarContainer}>
                    <View style={styles.usageBar}>
                      <View
                        style={[
                          styles.usageBarFill,
                          {
                            width: `${
                              (currentSubscription.productsUsed / currentSubscription.package.maxProducts) * 100
                            }%`,
                          },
                        ]}
                      />
                    </View>
                    <Text style={styles.usageText}>
                      {currentSubscription.productsUsed} / {currentSubscription.package.maxProducts}
                    </Text>
                  </View>
                </View>
              )}
            </View>
          </View>
        ) : (
          <View style={styles.noSubscriptionCard}>
            <Ionicons name="alert-circle-outline" size={64} color="#F59E0B" />
            <Text style={styles.noSubscriptionTitle}>No Active Subscription</Text>
            <Text style={styles.noSubscriptionText}>
              Subscribe to unlock premium features and grow your business
            </Text>
            <TouchableOpacity style={styles.startTrialButton} onPress={handleStartTrial} disabled={subscribing}>
              <Ionicons name="gift" size={20} color="white" />
              <Text style={styles.startTrialButtonText}>
                {subscribing ? 'Processing...' : 'Start Free Trial'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Available Plans */}
        <View style={styles.plansSection}>
          <Text style={styles.plansSectionTitle}>Available Plans</Text>
          {packages.map((pkg) => {
            const isCurrentPlan = currentSubscription?.package.id === pkg.id;
            const colors = getPackageColor(pkg.name);

            return (
              <TouchableOpacity
                key={pkg.id}
                style={[styles.planCard, isCurrentPlan && styles.currentPlanCard]}
                onPress={() => {
                  setSelectedPackage(pkg);
                  setShowPackageModal(true);
                }}
                disabled={isCurrentPlan}
              >
                <LinearGradient colors={colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.planIcon}>
                  <Ionicons name={getPackageIcon(pkg.name) as any} size={28} color="white" />
                </LinearGradient>

                <View style={styles.planContent}>
                  <View style={styles.planHeader}>
                    <Text style={styles.planName}>{pkg.displayName}</Text>
                    {pkg.name === 'Kaira' && (
                      <View style={styles.popularBadge}>
                        <Ionicons name="star" size={12} color="#F59E0B" />
                        <Text style={styles.popularBadgeText}>Popular</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.planPrice}>
                    {pkg.currency} {pkg.price.toLocaleString()}
                    <Text style={styles.planPriceUnit}>/month</Text>
                  </Text>

                  <View style={styles.planFeatures}>
                    <View style={styles.planFeatureItem}>
                      <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                      <Text style={styles.planFeatureText}>
                        {pkg.maxProducts ? `${pkg.maxProducts} products` : 'Unlimited products'}
                      </Text>
                    </View>
                    {pkg.priorityListing && (
                      <View style={styles.planFeatureItem}>
                        <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                        <Text style={styles.planFeatureText}>Priority listing</Text>
                      </View>
                    )}
                    {pkg.advancedAnalytics && (
                      <View style={styles.planFeatureItem}>
                        <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                        <Text style={styles.planFeatureText}>Advanced analytics</Text>
                      </View>
                    )}
                  </View>
                </View>

                {isCurrentPlan ? (
                  <View style={styles.currentPlanBadge}>
                    <Ionicons name="checkmark-circle" size={18} color="#10B981" />
                    <Text style={styles.currentPlanBadgeText}>Current</Text>
                  </View>
                ) : (
                  <Ionicons name="chevron-forward" size={24} color="#9CA3AF" />
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      {/* Package Details Modal */}
      <Modal visible={showPackageModal} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedPackage && (
              <>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>{selectedPackage.displayName}</Text>
                  <TouchableOpacity onPress={() => setShowPackageModal(false)}>
                    <Ionicons name="close" size={28} color="#111827" />
                  </TouchableOpacity>
                </View>

                <ScrollView style={styles.modalBody}>
                  <View style={styles.modalPriceSection}>
                    <Text style={styles.modalPrice}>
                      {selectedPackage.currency} {selectedPackage.price.toLocaleString()}
                    </Text>
                    <Text style={styles.modalPriceUnit}>/month</Text>
                  </View>

                  <Text style={styles.modalFeaturesTitle}>Features Included:</Text>

                  <View style={styles.modalFeaturesList}>
                    <View style={styles.modalFeatureItem}>
                      <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                      <Text style={styles.modalFeatureText}>
                        {selectedPackage.maxProducts ? `${selectedPackage.maxProducts} products` : 'Unlimited products'}
                      </Text>
                    </View>

                    {selectedPackage.priorityListing && (
                      <View style={styles.modalFeatureItem}>
                        <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                        <Text style={styles.modalFeatureText}>Priority listing in search results</Text>
                      </View>
                    )}

                    {selectedPackage.featuredBadge && (
                      <View style={styles.modalFeatureItem}>
                        <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                        <Text style={styles.modalFeatureText}>Featured badge on your business</Text>
                      </View>
                    )}

                    {selectedPackage.topPlacement && (
                      <View style={styles.modalFeatureItem}>
                        <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                        <Text style={styles.modalFeatureText}>Top placement in categories</Text>
                      </View>
                    )}

                    <View style={styles.modalFeatureItem}>
                      <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                      <Text style={styles.modalFeatureText}>{selectedPackage.supportLevel} support level</Text>
                    </View>

                    {selectedPackage.advancedAnalytics && (
                      <View style={styles.modalFeatureItem}>
                        <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                        <Text style={styles.modalFeatureText}>Advanced analytics dashboard</Text>
                      </View>
                    )}

                    {selectedPackage.socialPostsPerMonth > 0 && (
                      <View style={styles.modalFeatureItem}>
                        <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                        <Text style={styles.modalFeatureText}>
                          {selectedPackage.socialPostsPerMonth} social media posts/month
                        </Text>
                      </View>
                    )}

                    {selectedPackage.deliveryFeeDiscount > 0 && (
                      <View style={styles.modalFeatureItem}>
                        <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                        <Text style={styles.modalFeatureText}>
                          {selectedPackage.deliveryFeeDiscount}% delivery fee discount
                        </Text>
                      </View>
                    )}

                    {selectedPackage.fasterPayouts && (
                      <View style={styles.modalFeatureItem}>
                        <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                        <Text style={styles.modalFeatureText}>Faster payout processing</Text>
                      </View>
                    )}
                  </View>
                </ScrollView>

                <View style={styles.modalFooter}>
                  <TouchableOpacity
                    style={styles.subscribeButton}
                    onPress={() => handleSubscribe(selectedPackage.id)}
                    disabled={subscribing}
                  >
                    <Text style={styles.subscribeButtonText}>
                      {subscribing ? 'Processing...' : 'Subscribe Now'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  refreshButton: {
    padding: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
  },
  content: {
    flex: 1,
  },
  currentSubscriptionCard: {
    margin: 16,
    backgroundColor: 'white',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  currentSubscriptionHeader: {
    padding: 20,
  },
  currentSubscriptionTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  currentSubscriptionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  currentSubscriptionTitleContainer: {
    gap: 6,
  },
  currentSubscriptionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: 'white',
  },
  trialBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
    alignSelf: 'flex-start',
  },
  trialBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: 'white',
  },
  statusBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: 'white',
  },
  daysRemainingContainer: {
    alignItems: 'center',
  },
  daysRemainingLabel: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 4,
  },
  daysRemainingValue: {
    fontSize: 48,
    fontWeight: '700',
    color: 'white',
  },
  currentSubscriptionBody: {
    padding: 20,
    gap: 16,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  detailTextContainer: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  usageContainer: {
    marginTop: 8,
  },
  usageLabel: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 8,
  },
  usageBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  usageBar: {
    flex: 1,
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    overflow: 'hidden',
  },
  usageBarFill: {
    height: '100%',
    backgroundColor: '#10B981',
    borderRadius: 4,
  },
  usageText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
  },
  noSubscriptionCard: {
    margin: 16,
    padding: 32,
    backgroundColor: 'white',
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  noSubscriptionTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginTop: 16,
    marginBottom: 8,
  },
  noSubscriptionText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  startTrialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#8B5CF6',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
  },
  startTrialButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  plansSection: {
    padding: 16,
  },
  plansSectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
  },
  planCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  currentPlanCard: {
    borderWidth: 2,
    borderColor: '#10B981',
  },
  planIcon: {
    width: 56,
    height: 56,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  planContent: {
    flex: 1,
    marginLeft: 12,
  },
  planHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  planName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  popularBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
    gap: 3,
  },
  popularBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#D97706',
  },
  planPrice: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  planPriceUnit: {
    fontSize: 13,
    fontWeight: '400',
    color: '#6B7280',
  },
  planFeatures: {
    gap: 4,
  },
  planFeatureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  planFeatureText: {
    fontSize: 13,
    color: '#6B7280',
  },
  currentPlanBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  currentPlanBadgeText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#059669',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
  },
  modalBody: {
    maxHeight: 500,
  },
  modalPriceSection: {
    flexDirection: 'row',
    alignItems: 'baseline',
    padding: 20,
    paddingBottom: 10,
  },
  modalPrice: {
    fontSize: 36,
    fontWeight: '700',
    color: '#111827',
  },
  modalPriceUnit: {
    fontSize: 18,
    color: '#6B7280',
    marginLeft: 4,
  },
  modalFeaturesTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  modalFeaturesList: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    gap: 12,
  },
  modalFeatureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  modalFeatureText: {
    fontSize: 15,
    color: '#374151',
    flex: 1,
  },
  modalFooter: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  subscribeButton: {
    backgroundColor: '#8B5CF6',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  subscribeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
});

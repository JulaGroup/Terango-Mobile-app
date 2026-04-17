import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Dimensions,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { apiCall } from '@/lib/apiClient';

interface TrackingData {
  deliveryId: string;
  currentStatus: string;
  isExpress: boolean;
  priorityLevel: 'STANDARD' | 'EXPRESS' | 'URGENT';
  guaranteedDeliveryTime?: string;
  pickupLocation: {
    address: string;
    latitude?: number;
    longitude?: number;
  };
  dropoffLocation: {
    address: string;
    latitude?: number;
    longitude?: number;
  };
  driverLocation?: {
    latitude: number;
    longitude: number;
    lastUpdate: string;
  };
  timeline: Array<{
    id: string;
    status: string;
    message?: string;
    createdAt: string;
  }>;
  timeRemaining?: number;
  isDelayed?: boolean;
}

interface TimelineStep {
  title: string;
  description: string;
  time?: Date;
  completed: boolean;
  current: boolean;
}

interface TrackingProps {
  deliveryId: string;
  onClose?: () => void;
}

const { width, height } = Dimensions.get('window');

const ExpressTrackingScreen: React.FC<TrackingProps> = ({ deliveryId, onClose }) => {
  const [tracking, setTracking] = useState<TrackingData | null>(null);
  const [timeline, setTimeline] = useState<{ steps: TimelineStep[]; currentStep: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showMap, setShowMap] = useState(true);
  const router = useRouter();

  useEffect(() => {
    loadTrackingData();
    
    // Set up real-time updates
    const interval = setInterval(loadTrackingData, 30000); // Update every 30 seconds
    
    return () => clearInterval(interval);
  }, [deliveryId]);

  const loadTrackingData = async () => {
    try {
      setRefreshing(true);
      
      // Load tracking data and timeline in parallel
      const [trackingRes, timelineRes] = await Promise.all([
        apiCall(`/api/express-delivery/${deliveryId}/tracking`),
        apiCall(`/api/express-delivery/${deliveryId}/timeline`)
      ]);

      if (trackingRes.ok) {
        const trackingData = await trackingRes.json();
        setTracking(trackingData.data);
      } else {
        Alert.alert('Error', 'Failed to load tracking information');
      }

      if (timelineRes.ok) {
        const timelineData = await timelineRes.json();
        setTimeline(timelineData.data);
      }
    } catch (error) {
      console.error('Load tracking error:', error);
      Alert.alert('Error', 'Failed to load tracking information');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const formatTimeRemaining = (minutes: number) => {
    if (minutes <= 0) return 'Overdue';
    if (minutes < 60) return `${minutes} min left`;
    
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m left`;
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'URGENT':
        return '#DC2626';
      case 'EXPRESS':
        return '#D97706';
      default:
        return '#059669';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING':
        return '#6B7280';
      case 'DRIVER_ASSIGNED':
        return '#2563EB';
      case 'PICKED_UP':
        return '#DC2626';
      case 'IN_TRANSIT':
        return '#D97706';
      case 'DELIVERED':
        return '#059669';
      case 'CANCELLED':
        return '#EF4444';
      default:
        return '#6B7280';
    }
  };

  const renderMap = () => {
    if (!tracking || !showMap) return null;

    const hasCoordinates = tracking.pickupLocation.latitude && 
                          tracking.dropoffLocation.latitude;

    if (!hasCoordinates) {
      return (
        <View style={styles.mapPlaceholder}>
          <Ionicons name="map-outline" size={48} color="#9CA3AF" />
          <Text style={styles.mapPlaceholderText}>Map not available</Text>
          <Text style={styles.mapPlaceholderSubtext}>Location coordinates not found</Text>
        </View>
      );
    }

    const markers = [];
    const coordinates = [];

    // Pickup marker
    if (tracking.pickupLocation.latitude && tracking.pickupLocation.longitude) {
      const coord = {
        latitude: tracking.pickupLocation.latitude,
        longitude: tracking.pickupLocation.longitude,
      };
      markers.push(
        <Marker
          key="pickup"
          coordinate={coord}
          title="Pickup Location"
          description={tracking.pickupLocation.address}
          pinColor="#059669"
        />
      );
      coordinates.push(coord);
    }

    // Driver marker (if available)
    if (tracking.driverLocation) {
      const coord = {
        latitude: tracking.driverLocation.latitude,
        longitude: tracking.driverLocation.longitude,
      };
      markers.push(
        <Marker
          key="driver"
          coordinate={coord}
          title="Driver Location"
          description={`Last updated: ${new Date(tracking.driverLocation.lastUpdate).toLocaleTimeString()}`}
        >
          <View style={styles.driverMarker}>
            <Ionicons name="car" size={20} color="#FFFFFF" />
          </View>
        </Marker>
      );
      coordinates.push(coord);
    }

    // Dropoff marker
    if (tracking.dropoffLocation.latitude && tracking.dropoffLocation.longitude) {
      const coord = {
        latitude: tracking.dropoffLocation.latitude,
        longitude: tracking.dropoffLocation.longitude,
      };
      markers.push(
        <Marker
          key="dropoff"
          coordinate={coord}
          title="Delivery Location"
          description={tracking.dropoffLocation.address}
          pinColor="#DC2626"
        />
      );
      coordinates.push(coord);
    }

    return (
      <MapView
        style={styles.map}
        initialRegion={{
          latitude: tracking.pickupLocation.latitude!,
          longitude: tracking.pickupLocation.longitude!,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }}
        showsUserLocation={false}
        showsMyLocationButton={false}
      >
        {markers}
        {coordinates.length > 1 && (
          <Polyline
            coordinates={coordinates}
            strokeColor="#2563EB"
            strokeWidth={3}
            lineDashPattern={[5, 5]}
          />
        )}
      </MapView>
    );
  };

  const renderTimeline = () => {
    if (!timeline) return null;

    return (
      <View style={styles.timelineContainer}>
        <Text style={styles.timelineTitle}>Delivery Progress</Text>
        
        {timeline.steps.map((step, index) => (
          <View key={index} style={styles.timelineItem}>
            <View style={styles.timelineLeft}>
              <View style={[
                styles.timelineIndicator,
                {
                  backgroundColor: step.completed ? '#059669' : 
                                  step.current ? '#D97706' : '#E5E7EB',
                },
              ]}>
                {step.completed && (
                  <Ionicons name="checkmark" size={12} color="#FFFFFF" />
                )}
              </View>
              {index < timeline.steps.length - 1 && (
                <View style={[
                  styles.timelineConnector,
                  { backgroundColor: step.completed ? '#059669' : '#E5E7EB' },
                ]} />
              )}
            </View>
            
            <View style={styles.timelineContent}>
              <Text style={[
                styles.timelineStepTitle,
                { color: step.completed || step.current ? '#1F2937' : '#9CA3AF' },
              ]}>
                {step.title}
              </Text>
              <Text style={[
                styles.timelineStepDescription,
                { color: step.completed || step.current ? '#6B7280' : '#D1D5DB' },
              ]}>
                {step.description}
              </Text>
              {step.time && (
                <Text style={styles.timelineStepTime}>
                  {new Date(step.time).toLocaleString()}
                </Text>
              )}
            </View>
          </View>
        ))}
      </View>
    );
  };

  if (loading && !tracking) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading tracking information...</Text>
      </View>
    );
  }

  if (!tracking) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={48} color="#EF4444" />
        <Text style={styles.errorTitle}>Tracking Not Found</Text>
        <Text style={styles.errorText}>Unable to find tracking information for this delivery.</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadTrackingData}>
          <Text style={styles.retryButtonText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Track Delivery</Text>
          <Text style={styles.headerSubtitle}>#{tracking.deliveryId.slice(-6).toUpperCase()}</Text>
        </View>
        <TouchableOpacity 
          style={styles.mapToggle}
          onPress={() => setShowMap(!showMap)}
        >
          <Ionicons 
            name={showMap ? "list" : "map"} 
            size={24} 
            color="#1F2937" 
          />
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={loadTrackingData} />
        }
      >
        {/* Status Banner */}
        <View style={[
          styles.statusBanner,
          { backgroundColor: getStatusColor(tracking.currentStatus) },
        ]}>
          <View style={styles.statusBannerContent}>
            <Text style={styles.statusText}>
              {tracking.currentStatus.replace('_', ' ')}
            </Text>
            {tracking.isExpress && (
              <View style={[
                styles.priorityBadge,
                { backgroundColor: getPriorityColor(tracking.priorityLevel) },
              ]}>
                <Text style={styles.priorityText}>{tracking.priorityLevel}</Text>
              </View>
            )}
          </View>
          
          {tracking.isExpress && tracking.timeRemaining !== undefined && (
            <Text style={[
              styles.timeRemainingText,
              tracking.isDelayed && styles.delayedText,
            ]}>
              {tracking.isDelayed ? '⚠️ ' : '⏱️ '}
              {formatTimeRemaining(tracking.timeRemaining)}
            </Text>
          )}
        </View>

        {/* Map or Timeline */}
        {showMap ? renderMap() : renderTimeline()}

        {/* Addresses */}
        <View style={styles.addressSection}>
          <View style={styles.addressItem}>
            <View style={styles.addressIcon}>
              <Ionicons name="radio-button-on" size={12} color="#059669" />
            </View>
            <View style={styles.addressContent}>
              <Text style={styles.addressLabel}>Pickup</Text>
              <Text style={styles.addressText}>{tracking.pickupLocation.address}</Text>
            </View>
          </View>
          
          <View style={styles.addressConnector} />
          
          <View style={styles.addressItem}>
            <View style={styles.addressIcon}>
              <Ionicons name="location" size={12} color="#DC2626" />
            </View>
            <View style={styles.addressContent}>
              <Text style={styles.addressLabel}>Delivery</Text>
              <Text style={styles.addressText}>{tracking.dropoffLocation.address}</Text>
            </View>
          </View>
        </View>

        {/* Recent Updates */}
        <View style={styles.updatesSection}>
          <Text style={styles.updatesTitle}>Recent Updates</Text>
          {tracking.timeline.slice(-3).reverse().map((update, index) => (
            <View key={update.id} style={styles.updateItem}>
              <Text style={styles.updateStatus}>{update.status.replace('_', ' ')}</Text>
              {update.message && (
                <Text style={styles.updateMessage}>{update.message}</Text>
              )}
              <Text style={styles.updateTime}>
                {new Date(update.createdAt).toLocaleString()}
              </Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
};

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
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  
  closeButton: {
    padding: 8,
  },
  
  headerContent: {
    flex: 1,
    alignItems: 'center',
  },
  
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  
  headerSubtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  
  mapToggle: {
    padding: 8,
  },
  
  content: {
    flex: 1,
  },
  
  statusBanner: {
    padding: 16,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
  },
  
  statusBannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  
  statusText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textTransform: 'uppercase',
  },
  
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  
  priorityText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  
  timeRemainingText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  
  delayedText: {
    color: '#FEE2E2',
  },
  
  map: {
    height: 250,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
  },
  
  mapPlaceholder: {
    height: 250,
    marginHorizontal: 16,
    marginTop: 16,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  mapPlaceholderText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 8,
  },
  
  mapPlaceholderSubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 4,
  },
  
  driverMarker: {
    backgroundColor: '#2563EB',
    borderRadius: 16,
    padding: 6,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  
  timelineContainer: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    padding: 16,
  },
  
  timelineTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 16,
  },
  
  timelineItem: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  
  timelineLeft: {
    alignItems: 'center',
    marginRight: 12,
  },
  
  timelineIndicator: {
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  timelineConnector: {
    width: 2,
    flex: 1,
    marginTop: 4,
  },
  
  timelineContent: {
    flex: 1,
  },
  
  timelineStepTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  
  timelineStepDescription: {
    fontSize: 12,
    lineHeight: 16,
  },
  
  timelineStepTime: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 4,
  },
  
  addressSection: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    padding: 16,
  },
  
  addressItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  
  addressIcon: {
    marginRight: 12,
    marginTop: 2,
  },
  
  addressContent: {
    flex: 1,
  },
  
  addressLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 2,
  },
  
  addressText: {
    fontSize: 14,
    color: '#1F2937',
    lineHeight: 20,
  },
  
  addressConnector: {
    width: 2,
    height: 16,
    backgroundColor: '#E5E7EB',
    marginLeft: 6,
    marginVertical: 8,
  },
  
  updatesSection: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 32,
    borderRadius: 12,
    padding: 16,
  },
  
  updatesTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 16,
  },
  
  updateItem: {
    borderLeftWidth: 3,
    borderLeftColor: '#D97706',
    paddingLeft: 12,
    marginBottom: 12,
  },
  
  updateStatus: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    textTransform: 'capitalize',
  },
  
  updateMessage: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  
  updateTime: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 4,
  },
  
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
  },
  
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 32,
  },
  
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    marginTop: 16,
    marginBottom: 8,
  },
  
  errorText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  
  retryButton: {
    backgroundColor: '#D97706',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ExpressTrackingScreen;
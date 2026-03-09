import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  useColorScheme,
  ActivityIndicator,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { Bill } from '../types';

const HomeScreen = () => {
  const [totalPending, setTotalPending] = useState(0);
  const [loading, setLoading] = useState(true);
  const [billCount, setBillCount] = useState(0);
  const [overdueCount, setOverdueCount] = useState(0);
  const isDarkMode = useColorScheme() === 'dark';

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, 'bills'),
      (querySnapshot) => {
        let pendingSum = 0;
        let count = 0;
        let overdue = 0;

        querySnapshot.forEach((docSnap) => {
          const bill = { id: docSnap.id, ...docSnap.data() } as Bill;

          // Only add pending amount if it's positive
          if (bill.pendingAmount && bill.pendingAmount > 0) {
            pendingSum += bill.pendingAmount;
            count++;

            // Check if bill is overdue (pending amount > 0 and daysCount > 0)
            if (bill.daysCount && bill.daysCount > 0) {
              overdue++;
            }
          }
        });

        setTotalPending(pendingSum);
        setBillCount(count);
        setOverdueCount(overdue);
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching bills for home screen: ', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <LinearGradient colors={['#FCF9EA', '#BADFDB']} style={styles.container}>
        <ActivityIndicator size="large" color="#FFA4A4" />
      </LinearGradient>
    );
  }

  // Format currency
  const formattedTotal = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(totalPending);

  return (
    <LinearGradient colors={['#FCF9EA', '#BADFDB']} style={styles.container}>
      <View style={styles.content}>
        {/* Main Card */}
        <View style={styles.mainCard}>
          <Text style={styles.totalLabel}>Total Pending Amount</Text>
          <Text style={styles.totalAmount}>{formattedTotal}</Text>
        </View>

        {/* Stats Row */}
        {/* <View style={styles.statsContainer}>
          <View style={[styles.statCard, { marginRight: 8 }]}>
            <Text style={styles.statValue}>{billCount}</Text>
            <Text style={styles.statLabel}>Pending Bills</Text>
          </View>

          <View style={[styles.statCard, { marginLeft: 8 }]}>
            <Text style={[styles.statValue, { color: '#FF6B6B' }]}>
              {overdueCount}
            </Text>
            <Text style={styles.statLabel}>Overdue</Text>
          </View>
        </View> */}

        {/* If no pending bills */}
        {/* {billCount === 0 && (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No pending bills! 🎉</Text>
            <Text style={styles.emptySubText}>
              All your bills are cleared
            </Text>
          </View>
        )} */}
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  mainCard: {
    backgroundColor: 'rgba(255, 164, 164, 0.2)',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#FFA4A4',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  totalLabel: {
    fontSize: 18,
    color: '#FFA4A4',
    fontWeight: '600',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  totalAmount: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#FFA4A4',
    textAlign: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#FFE0E0',
  },
  statValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFA4A4',
    marginBottom: 5,
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 30,
  },
  emptyText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFA4A4',
    marginBottom: 10,
  },
  emptySubText: {
    fontSize: 16,
    color: '#666',
  },
});

export default HomeScreen;
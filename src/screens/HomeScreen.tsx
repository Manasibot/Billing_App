import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  useColorScheme,
  ActivityIndicator,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { Bill } from '../types';
import SyncIndicator from '../components/SyncIndicator';
import { syncManager } from '../SyncManager';
import { cacheManager } from '../CacheManager';
import { enrichBill } from '../utils';

interface PartySummary {
  partyName: string;
  totalPending: number;
  billCount: number;
}

const HomeScreen = () => {
  const [totalPending, setTotalPending] = useState(0);
  const [loading, setLoading] = useState(true);
  const [billCount, setBillCount] = useState(0);
  const [overdueCount, setOverdueCount] = useState(0);
  const [partySummaries, setPartySummaries] = useState<PartySummary[]>([]);
  const [expandedParties, setExpandedParties] = useState<Set<string>>(new Set());
  const [allBills, setAllBills] = useState<Bill[]>([]);
  const isDarkMode = useColorScheme() === 'dark';

  const updateStats = (bills: Bill[]) => {
    let pendingSum = 0;
    let count = 0;
    let overdue = 0;
    const partyMap = new Map<string, { total: number; count: number; bills: Bill[] }>();

    bills.forEach((bill) => {
      // Only add pending amount if it's positive
      if (bill.pendingAmount && bill.pendingAmount > 0) {
        pendingSum += bill.pendingAmount;
        count++;

        // Check if bill is overdue (pending amount > 0 and daysCount > 0)
        if (bill.daysCount && bill.daysCount > 0) {
          overdue++;
        }

        // Group by party name
        const partyName = bill.partyName || 'Unknown Party';
        if (partyMap.has(partyName)) {
          const existing = partyMap.get(partyName)!;
          partyMap.set(partyName, {
            total: existing.total + bill.pendingAmount,
            count: existing.count + 1,
            bills: [...existing.bills, bill]
          });
        } else {
          partyMap.set(partyName, {
            total: bill.pendingAmount,
            count: 1,
            bills: [bill]
          });
        }
      }
    });

    // Convert to array and sort by total pending amount (highest first)
    const summaries = Array.from(partyMap.entries())
      .map(([partyName, data]) => ({
        partyName,
        totalPending: data.total,
        billCount: data.count,
        bills: data.bills
      }))
      .sort((a, b) => b.totalPending - a.totalPending);

    setPartySummaries(summaries);
    setTotalPending(pendingSum);
    setBillCount(count);
    setOverdueCount(overdue);
    setAllBills(bills);
    setLoading(false);
  };

  const togglePartyExpand = (partyName: string) => {
    const newExpanded = new Set(expandedParties);
    if (newExpanded.has(partyName)) {
      newExpanded.delete(partyName);
    } else {
      newExpanded.add(partyName);
    }
    setExpandedParties(newExpanded);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (date: any) => {
    if (!date) return 'N/A';
    try {
      const d = date.toDate ? date.toDate() : new Date(date);
      return d.toLocaleDateString('en-IN');
    } catch {
      return 'N/A';
    }
  };

  useEffect(() => {
    const loadCache = async () => {
      const cachedBills = await cacheManager.getCachedBills();
      if (cachedBills.length > 0) {
        updateStats(cachedBills);
      }
    };
    loadCache();
  }, []);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, 'bills'),
      (querySnapshot) => {
        const billsMap = new Map<string, Bill>();

        querySnapshot.forEach((docSnap) => {
          const bill = enrichBill(docSnap.id, docSnap.data());
          billsMap.set(docSnap.id, bill);
        });

        const billsArray = Array.from(billsMap.values());
        const isOffline = syncManager.getStatus() === 'offline';

        // Only update UI if we have data or if we are online (meaning it's a real empty state)
        if (billsArray.length > 0 || !isOffline) {
          updateStats(billsArray);

          // Save to cache only if we have data to prevent overwriting with empty on failure
          if (billsArray.length > 0) {
            cacheManager.saveBills(billsArray);
          }
        }

        // Track pending writes for sync status
        const hasPending = querySnapshot.metadata.hasPendingWrites;
        syncManager.setPendingWrites(hasPending);
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

  return (
    <LinearGradient colors={['#FCF9EA', '#BADFDB']} style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Main Card */}
        <View style={styles.mainCard}>
          <Text style={styles.totalLabel}>Total Pending Amount</Text>
          <Text style={styles.totalAmount}>{formatCurrency(totalPending)}</Text>
        </View>

        <SyncIndicator />

        {/* Party-wise Summary Section */}
        {partySummaries.length > 0 && (
          <View style={styles.partySection}>
            <Text style={styles.sectionTitle}>Party-wise Summary</Text>
            
            {partySummaries.map((party, index) => (
              <View key={party.partyName} style={styles.partyCard}>
                <TouchableOpacity 
                  style={styles.partyHeader}
                  onPress={() => togglePartyExpand(party.partyName)}
                  activeOpacity={0.7}
                >
                  <View style={styles.partyInfo}>
                    <Text style={styles.partyName}>{party.partyName}</Text>
                    {/* <Text style={styles.billCountText}>
                      {party.billCount} bill{party.billCount !== 1 ? 's' : ''}
                    </Text> */}
                  </View>
                  <View style={styles.partyAmount}>
                    <Text style={styles.partyAmountText}>
                      {formatCurrency(party.totalPending)}
                    </Text>
                    <Text style={styles.expandIcon}>
                      {expandedParties.has(party.partyName) ? '▼' : '▶'}
                    </Text>
                  </View>
                </TouchableOpacity>

                {/* Expanded Bill Details */}
                {expandedParties.has(party.partyName) && (
                  <View style={styles.billsList}>
                    {partySummaries
                      .find(p => p.partyName === party.partyName)
                      ?.bills?.map((bill, idx) => (
                        <View key={bill.id || idx} style={styles.billRow}>
                          <View style={styles.billInfo}>
                            <Text style={styles.billNo}>#{bill.billNo}</Text>
                            <Text style={styles.billDate}>{formatDate(bill.billDate)}</Text>
                          </View>
                          <Text style={styles.billAmount}>
                            {formatCurrency(bill.pendingAmount)}
                          </Text>
                        </View>
                      ))}
                  </View>
                )}
              </View>
            ))}
          </View>
        )}

        {/* If no pending bills */}
        {partySummaries.length === 0 && (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No pending bills! 🎉</Text>
            <Text style={styles.emptySubText}>
              All your bills are cleared
            </Text>
          </View>
        )}
      </ScrollView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    padding: 20,
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
  partySection: {
    marginTop: 10,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFA4A4',
    marginBottom: 15,
    paddingHorizontal: 4,
  },
  partyCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  partyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 5,
    backgroundColor: '#FFF',
  },
  partyInfo: {
    flex: 1,
  },
  partyName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 2,padding:2
  },
  billCountText: {
    fontSize: 12,
    color: '#888',
  },
  partyAmount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  partyAmountText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFA4A4',
  },
  expandIcon: {
    fontSize: 12,
    color: '#999',
    marginLeft: 4,
  },
  billsList: {
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    backgroundColor: '#FAFAFA',
  },
  billRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  billInfo: {
    flex: 1,
  },
  billNo: {
    fontSize: 14,
    fontWeight: '500',
    color: '#555',
    marginBottom: 2,
  },
  billDate: {
    fontSize: 11,
    color: '#999',
  },
  billAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFA4A4',
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
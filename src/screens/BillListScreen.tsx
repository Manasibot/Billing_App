import React, { useEffect, useState, useMemo } from 'react';
import {
    View,
    FlatList,
    StyleSheet,
    Alert,
    ActivityIndicator,
    TouchableOpacity,
    Text,
    StatusBar,
    Modal,
    AppState,
} from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { collection, query, orderBy, onSnapshot, addDoc, updateDoc, deleteDoc, doc, Timestamp, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import BillItem from '../components/BillItem';
import AddBillModal from '../components/AddBillModal';
import { Bill } from '../types';
import LinearGradient from 'react-native-linear-gradient';
import SyncIndicator from '../components/SyncIndicator';
import { syncManager } from '../SyncManager';

// Icon imports as specified
import IonIcon from 'react-native-vector-icons/Ionicons';
import EntypoIcon from 'react-native-vector-icons/Entypo';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';

// Filter types
type FilterType = 'all' | 'unpaid' | 'paid' | 'overdue' | 'today' | 'week' | 'month';
type SortType = 'daysDesc' | 'daysAsc' | 'amountDesc' | 'amountAsc' | 'partyAsc' | 'partyDesc';

interface FilterState {
    type: FilterType;
    sort: SortType;
    minAmount: number | null;
    maxAmount: number | null;
}

const calculateDaysCount = (bill: any): number => {
    if (!bill?.billDate) return 0;

    try {
        const billDate = bill.billDate?.toDate ? bill.billDate.toDate() : new Date(bill.billDate);
        const endDate = bill.fullyPaidDate
            ? (bill.fullyPaidDate?.toDate ? bill.fullyPaidDate.toDate() : new Date(bill.fullyPaidDate))
            : new Date();

        billDate.setHours(0, 0, 0, 0);
        endDate.setHours(0, 0, 0, 0);

        const diffTime = endDate.getTime() - billDate.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        return diffDays > 0 ? diffDays : 0;
    } catch (error) {
        console.error('Error calculating days count:', error);
        return 0;
    }
};

// Check if bill is overdue (more than 30 days)
const isOverdue = (daysCount: number): boolean => {
    return daysCount > 30;
};

// Check if bill is due today
const isDueToday = (billDate: any): boolean => {
    if (!billDate) return false;

    try {
        const date = billDate?.toDate ? billDate.toDate() : new Date(billDate);
        const today = new Date();

        date.setHours(0, 0, 0, 0);
        today.setHours(0, 0, 0, 0);

        return date.getTime() === today.getTime();
    } catch (error) {
        return false;
    }
};

// Check if bill is due this week
const isDueThisWeek = (billDate: any): boolean => {
    if (!billDate) return false;

    try {
        const date = billDate?.toDate ? billDate.toDate() : new Date(billDate);
        const today = new Date();
        const weekLater = new Date(today);
        weekLater.setDate(today.getDate() + 7);

        date.setHours(0, 0, 0, 0);
        today.setHours(0, 0, 0, 0);
        weekLater.setHours(0, 0, 0, 0);

        return date >= today && date <= weekLater;
    } catch (error) {
        return false;
    }
};

// Check if bill is due this month
const isDueThisMonth = (billDate: any): boolean => {
    if (!billDate) return false;

    try {
        const date = billDate?.toDate ? billDate.toDate() : new Date(billDate);
        const today = new Date();
        const monthLater = new Date(today);
        monthLater.setMonth(today.getMonth() + 1);

        date.setHours(0, 0, 0, 0);
        today.setHours(0, 0, 0, 0);
        monthLater.setHours(0, 0, 0, 0);

        return date >= today && date <= monthLater;
    } catch (error) {
        return false;
    }
};

const BillListScreen = () => {
    const [bills, setBills] = useState<Bill[]>([]);
    const [loading, setLoading] = useState(true);
    const [modalVisible, setModalVisible] = useState(false);
    const [filterModalVisible, setFilterModalVisible] = useState(false);
    const [editingBill, setEditingBill] = useState<Bill | null>(null);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const isFocused = useIsFocused();

    // Filter state
    const [filters, setFilters] = useState<FilterState>({
        type: 'all',
        sort: 'daysDesc',
        minAmount: null,
        maxAmount: null,
    });

    useEffect(() => {
        if (!isFocused) {
            setExpandedId(null);
        }
    }, [isFocused]);

    useEffect(() => {
        const subscription = AppState.addEventListener('change', nextAppState => {
            if (nextAppState === 'background' || nextAppState === 'inactive') {
                setExpandedId(null);
            }
        });

        return () => subscription.remove();
    }, []);

    useEffect(() => {
        const q = query(collection(db, 'bills'), orderBy('createdAt', 'desc'));

        const unsubscribe = onSnapshot(
            q,
            { includeMetadataChanges: true },
            (querySnapshot) => {
                const billsMap = new Map<string, Bill>();

                querySnapshot.forEach((docSnap) => {
                    const data = docSnap.data();
                    const daysCount = calculateDaysCount(data);

                    billsMap.set(docSnap.id, {
                        id: docSnap.id,
                        ...data,
                        daysCount
                    } as Bill);
                });

                setBills(Array.from(billsMap.values()));
                setLoading(false);

                // Track pending writes
                const hasPending = querySnapshot.metadata.hasPendingWrites;
                syncManager.setPendingWrites(hasPending);
            },
            (error) => {
                console.error('Error fetching bills: ', error);
                setLoading(false);
            }
        );

        return () => unsubscribe();
    }, []);

    // Apply filters and sorting using useMemo to prevent flickering
    const filteredBills = useMemo(() => {
        let filtered = [...bills];

        // Apply filter type
        switch (filters.type) {
            case 'unpaid':
                filtered = filtered.filter(bill => bill.pendingAmount > 0);
                break;
            case 'paid':
                filtered = filtered.filter(bill => bill.pendingAmount <= 0);
                break;
            case 'overdue':
                filtered = filtered.filter(bill =>
                    bill.pendingAmount > 0 && isOverdue(bill.daysCount || 0)
                );
                break;
            case 'today':
                filtered = filtered.filter(bill =>
                    bill.pendingAmount > 0 && isDueToday(bill.billDate)
                );
                break;
            case 'week':
                filtered = filtered.filter(bill =>
                    bill.pendingAmount > 0 && isDueThisWeek(bill.billDate)
                );
                break;
            case 'month':
                filtered = filtered.filter(bill =>
                    bill.pendingAmount > 0 && isDueThisMonth(bill.billDate)
                );
                break;
            default:
                // 'all' - no filter
                break;
        }

        // Apply amount range filter
        if (filters.minAmount !== null) {
            filtered = filtered.filter(bill => bill.pendingAmount >= filters.minAmount!);
        }
        if (filters.maxAmount !== null) {
            filtered = filtered.filter(bill => bill.pendingAmount <= filters.maxAmount!);
        }

        // Apply sorting
        filtered.sort((a, b) => {
            switch (filters.sort) {
                case 'daysDesc':
                    return (b.daysCount || 0) - (a.daysCount || 0);
                case 'daysAsc':
                    return (a.daysCount || 0) - (b.daysCount || 0);
                case 'amountDesc':
                    return (b.pendingAmount || 0) - (a.pendingAmount || 0);
                case 'amountAsc':
                    return (a.pendingAmount || 0) - (b.pendingAmount || 0);
                case 'partyAsc':
                    return (a.partyName || '').localeCompare(b.partyName || '');
                case 'partyDesc':
                    return (b.partyName || '').localeCompare(a.partyName || '');
                default:
                    return 0;
            }
        });

        return filtered;
    }, [bills, filters]);

    const handleAddBill = async (billData: Omit<Bill, 'id'>) => {
        const isOffline = syncManager.getStatus() === 'offline';
        // Generate a unique ID on the client to prevent duplicates during sync
        const newBillRef = doc(collection(db, 'bills'));
        const billId = newBillRef.id;
        
        console.log(`[BillListScreen] Adding Bill: "${billData.partyName}" - ID: ${billId} (${isOffline ? 'OFFLINE QUEUED' : 'ONLINE'})`);

        try {
            if (isOffline) {
                // Queue for background sync/app restart
                await syncManager.queueOperation({
                    type: 'add',
                    collection: 'bills',
                    data: { ...billData, id: billId } // Include the unique ID
                });
            }

            // Always try Firestore (updates UI immediately via memory cache even if offline)
            syncManager.setPendingWrites(true);
            await setDoc(newBillRef, {
                ...billData,
                createdAt: Timestamp.now(),
                updatedAt: Timestamp.now(),
            });
            console.log(`[BillListScreen] Bill Added to Firestore Local: "${billData.partyName}" with ID: ${billId}`);
        } catch (e) {
            syncManager.setPendingWrites(false);
            console.error('[BillListScreen] Error adding bill: ', e);
            Alert.alert('Error', 'Failed to save bill');
        }
    };

    const handleUpdateBill = async (billData: Omit<Bill, 'id'>) => {
        if (!editingBill?.id) return;
        const isOffline = syncManager.getStatus() === 'offline';
        console.log(`[BillListScreen] Updating Bill: ID ${editingBill.id} (${isOffline ? 'OFFLINE QUEUED' : 'ONLINE'})`);

        try {
            if (isOffline) {
                await syncManager.queueOperation({
                    type: 'update',
                    collection: 'bills',
                    targetId: editingBill.id,
                    data: billData
                });
            }

            syncManager.setPendingWrites(true);
            await updateDoc(doc(db, 'bills', editingBill.id), {
                ...billData,
                updatedAt: Timestamp.now(),
            });
            console.log(`[BillListScreen] Bill Updated in Firestore Local: ID ${editingBill.id}`);
        } catch (e) {
            syncManager.setPendingWrites(false);
            console.error('[BillListScreen] Error updating bill: ', e);
            Alert.alert('Error', 'Failed to update bill');
        }
    };

    const handleSave = (billData: Omit<Bill, 'id'>) => {
        if (editingBill) {
            handleUpdateBill(billData);
        } else {
            handleAddBill(billData);
        }
    };

    const confirmDelete = (billId: string) => {
        Alert.alert('Delete Bill', 'Are you sure you want to delete this bill?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Delete', style: 'destructive', onPress: () => handleDelete(billId) },
        ]);
    };

    const handleDelete = async (billId: string) => {
        const isOffline = syncManager.getStatus() === 'offline';
        console.log(`[BillListScreen] Deleting Bill: ID ${billId} (${isOffline ? 'OFFLINE QUEUED' : 'ONLINE'})`);

        try {
            if (isOffline) {
                await syncManager.queueOperation({
                    type: 'delete',
                    collection: 'bills',
                    targetId: billId
                });
            }

            syncManager.setPendingWrites(true);
            await deleteDoc(doc(db, 'bills', billId));
            console.log(`[BillListScreen] Bill Deleted in Firestore Local: ID ${billId}`);
        } catch (e) {
            syncManager.setPendingWrites(false);
            console.error('[BillListScreen] Error deleting bill: ', e);
            Alert.alert('Error', 'Failed to delete bill');
        }
    };

    const openEditModal = (bill: Bill) => {
        setExpandedId(null);
        setEditingBill(bill);
        setModalVisible(true);
    };

    const clearFilters = () => {
        setFilters({
            type: 'all',
            sort: 'daysDesc',
            minAmount: null,
            maxAmount: null,
        });
    };

    const getActiveFilterCount = (): number => {
        let count = 0;
        if (filters.type !== 'all') count++;
        if (filters.sort !== 'daysDesc') count++;
        if (filters.minAmount !== null) count++;
        if (filters.maxAmount !== null) count++;
        return count;
    };

    if (loading) {
        return (
            <LinearGradient colors={['#FCF9EA', '#BADFDB']} style={styles.center}>
                <ActivityIndicator size="large" color="#FFA4A4" />
            </LinearGradient>
        );
    }

    return (
        <>
            <StatusBar backgroundColor="#FFA4A4" barStyle="dark-content" />
            <LinearGradient colors={['#FCF9EA', '#BADFDB']} style={styles.container}>
                {/* Header */}
                <View style={styles.header}>
                    <View>
                        <Text style={styles.headerTitle}>My Bills</Text>
                        <SyncIndicator />
                    </View>
                    <TouchableOpacity
                        onPress={() => setFilterModalVisible(true)}
                        style={styles.filterButton}
                    >
                        <IonIcon name="funnel-outline" size={24} color="#FFA4A4" />
                        {getActiveFilterCount() > 0 && (
                            <View style={styles.filterBadge}>
                                <Text style={styles.filterBadgeText}>{getActiveFilterCount()}</Text>
                            </View>
                        )}
                    </TouchableOpacity>
                </View>

                {/* Active Filters Display */}
                {getActiveFilterCount() > 0 && (
                    <View style={styles.activeFiltersContainer}>
                        <Text style={styles.activeFiltersText}>
                            {filters.type !== 'all' && `Status: ${filters.type} • `}
                            {filters.sort !== 'daysDesc' && `Sort: ${filters.sort.replace(/([A-Z])/g, ' $1').toLowerCase()} • `}
                            {filters.minAmount !== null && `Min: ₹${filters.minAmount} • `}
                            {filters.maxAmount !== null && `Max: ₹${filters.maxAmount}`}
                        </Text>
                    </View>
                )}

                {/* Column Header Row */}
                <View style={styles.tableHeader}>
                    <Text style={[styles.tableHeaderCell, { width: 60 }]}>Days</Text>
                    <Text style={[styles.tableHeaderCell, { flex: 1 }]}>Party / Bill No</Text>
                    <Text style={[styles.tableHeaderCell, { width: 90, textAlign: 'right' }]}>Pending</Text>
                </View>

                {/* Results count */}
                <View style={styles.resultsContainer}>
                    <Text style={styles.resultsText}>
                        Showing {filteredBills.length} of {bills.length} bills
                    </Text>
                </View>

                <FlatList
                    data={filteredBills}
                    keyExtractor={(item) => item.id || Math.random().toString()}
                    renderItem={({ item }) => (
                        <BillItem
                            bill={item}
                            isExpanded={expandedId === item.id}
                            onToggle={() => setExpandedId(expandedId === item.id ? null : (item.id || null))}
                            onEdit={openEditModal}
                            onDelete={confirmDelete}
                        />
                    )}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <IonIcon name="document-text-outline" size={64} color="#FFA4A4" />
                            <Text style={styles.emptyText}>No bills found</Text>
                            <Text style={styles.emptySubtext}>Try adjusting your filters</Text>
                        </View>
                    }
                />

                {/* Floating Action Button */}
                <TouchableOpacity
                    style={styles.fab}
                    onPress={() => {
                        setExpandedId(null);
                        setEditingBill(null);
                        setModalVisible(true);
                    }}
                    activeOpacity={0.8}
                >
                    <EntypoIcon name="circle-with-plus" size={36} color="#FCF9EA" />
                </TouchableOpacity>

                <AddBillModal
                    visible={modalVisible}
                    onClose={() => setModalVisible(false)}
                    onSave={handleSave}
                    initialData={editingBill}
                />

                <FilterModal
                    visible={filterModalVisible}
                    onClose={() => setFilterModalVisible(false)}
                    filters={filters}
                    setFilters={setFilters}
                    clearFilters={clearFilters}
                />
            </LinearGradient>
        </>
    );
};

// Extracted FilterModal to a separate component to prevent re-mounting flicker
interface FilterModalProps {
    visible: boolean;
    onClose: () => void;
    filters: FilterState;
    setFilters: (filters: FilterState) => void;
    clearFilters: () => void;
}

const FilterModal: React.FC<FilterModalProps> = ({
    visible,
    onClose,
    filters,
    setFilters,
    clearFilters
}) => (
    <Modal
        animationType="slide"
        transparent={true}
        visible={visible}
        onRequestClose={onClose}
    >
        <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>Filters & Sorting</Text>
                    <TouchableOpacity onPress={onClose}>
                        <IonIcon name="close" size={24} color="#FFA4A4" />
                    </TouchableOpacity>
                </View>

                {/* Filter by Status */}
                <Text style={styles.filterSectionTitle}>Bill Status</Text>
                <View style={styles.filterOptions}>
                    {[
                        { value: 'all', label: 'All Bills', icon: 'list' },
                        { value: 'unpaid', label: 'Unpaid Only', icon: 'hourglass-outline' },
                        { value: 'paid', label: 'Paid Only', icon: 'checkmark-done-outline' },
                        { value: 'overdue', label: 'Overdue (>30 days)', icon: 'alert-circle-outline' },
                    ].map((option) => (
                        <TouchableOpacity
                            key={option.value}
                            style={[
                                styles.filterChip,
                                filters.type === option.value && styles.filterChipActive
                            ]}
                            onPress={() => setFilters({ ...filters, type: option.value as FilterType })}
                        >
                            <IonIcon
                                name={option.icon}
                                size={16}
                                color={filters.type === option.value ? '#fff' : '#FFA4A4'}
                            />
                            <Text style={[
                                styles.filterChipText,
                                filters.type === option.value && styles.filterChipTextActive
                            ]}>
                                {option.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Sort By */}
                <Text style={styles.filterSectionTitle}>Sort By</Text>
                <View style={styles.filterOptions}>
                    {[
                        { value: 'daysDesc', label: 'Days (High to Low)', icon: 'arrow-down' },
                        { value: 'daysAsc', label: 'Days (Low to High)', icon: 'arrow-up' },
                        { value: 'amountDesc', label: 'Amount (High to Low)', icon: 'arrow-down' },
                        { value: 'amountAsc', label: 'Amount (Low to High)', icon: 'arrow-up' },
                        { value: 'partyAsc', label: 'Party Name (A-Z)', icon: 'arrow-up' },
                        { value: 'partyDesc', label: 'Party Name (Z-A)', icon: 'arrow-down' },
                    ].map((option) => (
                        <TouchableOpacity
                            key={option.value}
                            style={[
                                styles.filterChip,
                                filters.sort === option.value && styles.filterChipActive
                            ]}
                            onPress={() => setFilters({ ...filters, sort: option.value as SortType })}
                        >
                            <IonIcon
                                name={option.icon === 'arrow-up' ? 'arrow-up-outline' : 'arrow-down-outline'}
                                size={16}
                                color={filters.sort === option.value ? '#fff' : '#FFA4A4'}
                            />
                            <Text style={[
                                styles.filterChipText,
                                filters.sort === option.value && styles.filterChipTextActive
                            ]}>
                                {option.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Action Buttons */}
                <View style={styles.modalActions}>
                    <TouchableOpacity
                        style={styles.clearButton}
                        onPress={clearFilters}
                    >
                        <Text style={styles.clearButtonText}>Clear All</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.applyButton}
                        onPress={onClose}
                    >
                        <Text style={styles.applyButtonText}>Apply Filters</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    </Modal>
);

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 16,
        paddingBottom: 8,
        backgroundColor: 'transparent',
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#FFA4A4',
        letterSpacing: 0.5,
    },
    filterButton: {
        position: 'relative',
        padding: 4,
    },
    filterBadge: {
        position: 'absolute',
        top: -4,
        right: -4,
        backgroundColor: '#FFA4A4',
        borderRadius: 10,
        minWidth: 20,
        height: 20,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1.5,
        borderColor: '#FCF9EA',
    },
    filterBadgeText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: 'bold',
    },
    activeFiltersContainer: {
        paddingHorizontal: 20,
        paddingVertical: 6,
        backgroundColor: 'rgba(255, 164, 164, 0.1)',
        marginHorizontal: 16,
        marginBottom: 8,
        borderRadius: 8,
    },
    activeFiltersText: {
        fontSize: 11,
        color: '#FFA4A4',
        fontWeight: '500',
        textTransform: 'capitalize',
    },
    resultsContainer: {
        paddingHorizontal: 20,
        paddingVertical: 4,
    },
    resultsText: {
        fontSize: 11,
        color: '#666',
        fontWeight: '400',
    },
    listContent: {
        paddingHorizontal: 16,
        paddingBottom: 100,
    },
    tableHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 6,
        backgroundColor: '#FFA4A4',
        marginHorizontal: 16,
        borderRadius: 8,
        marginBottom: 6,
    },
    tableHeaderCell: {
        fontSize: 11,
        fontWeight: '700',
        color: '#fff',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    fab: {
        position: 'absolute',
        width: 64,
        height: 64,
        alignItems: 'center',
        justifyContent: 'center',
        right: 24,
        bottom: 24,
        backgroundColor: '#FFA4A4',
        borderRadius: 32,
        elevation: 10,
        shadowColor: '#000',
        shadowOpacity: 0.2,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 4 },
        borderWidth: 2,
        borderColor: '#FCF9EA',
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 48,
    },
    emptyText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#FFA4A4',
        marginTop: 12,
    },
    emptySubtext: {
        fontSize: 13,
        color: '#999',
        marginTop: 4,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#FCF9EA',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 20,
        maxHeight: '80%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#BADFDB',
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#FFA4A4',
    },
    filterSectionTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
        marginTop: 16,
        marginBottom: 8,
    },
    filterOptions: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    filterChip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 8,
        backgroundColor: '#fff',
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#FFA4A4',
        gap: 6,
    },
    filterChipActive: {
        backgroundColor: '#FFA4A4',
    },
    filterChipText: {
        fontSize: 12,
        color: '#FFA4A4',
        fontWeight: '500',
    },
    filterChipTextActive: {
        color: '#fff',
    },
    modalActions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 24,
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: '#BADFDB',
    },
    clearButton: {
        flex: 1,
        paddingVertical: 12,
        alignItems: 'center',
        marginRight: 8,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#FFA4A4',
    },
    clearButtonText: {
        color: '#FFA4A4',
        fontSize: 14,
        fontWeight: '600',
    },
    applyButton: {
        flex: 1,
        paddingVertical: 12,
        alignItems: 'center',
        marginLeft: 8,
        borderRadius: 8,
        backgroundColor: '#FFA4A4',
    },
    applyButtonText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
    },
});

export default BillListScreen;
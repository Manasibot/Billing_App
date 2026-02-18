import React, { useEffect, useState } from 'react';
import {
    View,
    FlatList,
    StyleSheet,
    Alert,
    ActivityIndicator,
    TouchableOpacity,
    Text,
    StatusBar,
} from 'react-native';
import { collection, query, orderBy, onSnapshot, addDoc, updateDoc, deleteDoc, doc, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';
import BillItem from '../components/BillItem';
import AddBillModal from '../components/AddBillModal';
import { Bill } from '../types';
import LinearGradient from 'react-native-linear-gradient';

// Icon imports as specified
import IonIcon from 'react-native-vector-icons/Ionicons';
import EntypoIcon from 'react-native-vector-icons/Entypo';

const BillListScreen = () => {
    const [bills, setBills] = useState<Bill[]>([]);
    const [loading, setLoading] = useState(true);
    const [modalVisible, setModalVisible] = useState(false);
    const [editingBill, setEditingBill] = useState<Bill | null>(null);

    useEffect(() => {
        const q = query(collection(db, 'bills'), orderBy('createdAt', 'desc'));
        const unsubscribe = onSnapshot(
            q,
            (querySnapshot) => {
                const billsData: Bill[] = [];
                querySnapshot.forEach((docSnap) => {
                    billsData.push({ id: docSnap.id, ...docSnap.data() } as Bill);
                });
                // Sort: unpaid first (by daysCount desc), paid last (by daysCount desc)
                billsData.sort((a, b) => {
                    const aPaid = a.pendingAmount <= 0 ? 1 : 0;
                    const bPaid = b.pendingAmount <= 0 ? 1 : 0;
                    if (aPaid !== bPaid) return aPaid - bPaid; // unpaid first
                    return (b.daysCount || 0) - (a.daysCount || 0); // then by days desc
                });
                setBills(billsData);
                setLoading(false);
            },
            (error) => {
                console.error('Error fetching bills: ', error);
                Alert.alert('Error', 'Failed to fetch bills');
                setLoading(false);
            }
        );

        return () => unsubscribe();
    }, []);

    const handleAddBill = async (billData: Omit<Bill, 'id'>) => {
        try {
            await addDoc(collection(db, 'bills'), {
                ...billData,
                createdAt: Timestamp.now(),
                updatedAt: Timestamp.now(),
            });
        } catch (e) {
            console.error('Error adding bill: ', e);
            Alert.alert('Error', 'Failed to save bill');
        }
    };

    const handleUpdateBill = async (billData: Omit<Bill, 'id'>) => {
        if (!editingBill?.id) return;
        try {
            const billRef = doc(db, 'bills', editingBill.id);
            await updateDoc(billRef, {
                ...billData,
                updatedAt: Timestamp.now(),
            });
        } catch (e) {
            console.error('Error updating bill: ', e);
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
        try {
            await deleteDoc(doc(db, 'bills', billId));
        } catch (e) {
            console.error('Error deleting bill: ', e);
            Alert.alert('Error', 'Failed to delete bill');
        }
    };

    const openEditModal = (bill: Bill) => {
        setEditingBill(bill);
        setModalVisible(true);
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
                    <Text style={styles.headerTitle}>My Bills</Text>
                    <TouchableOpacity>
                        <IonIcon name="funnel-outline" size={24} color="#FFA4A4" />
                    </TouchableOpacity>
                </View>

                {/* Column Header Row */}
                <View style={styles.tableHeader}>
                    <Text style={[styles.tableHeaderCell, { width: 60 }]}>Days</Text>
                    <Text style={[styles.tableHeaderCell, { flex: 1 }]}>Party / Bill No</Text>
                    <Text style={[styles.tableHeaderCell, { width: 90, textAlign: 'right' }]}>Pending</Text>
                </View>

                <FlatList
                    data={bills}
                    keyExtractor={(item) => item.id || Math.random().toString()}
                    renderItem={({ item }) => (
                        <BillItem bill={item} onEdit={openEditModal} onDelete={confirmDelete} />
                    )}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                />

                {/* Floating Action Button */}
                <TouchableOpacity
                    style={styles.fab}
                    onPress={() => {
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
            </LinearGradient>
        </>
    );
};

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
});

export default BillListScreen;
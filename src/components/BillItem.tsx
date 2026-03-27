import React, { useState, useRef } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Animated,
    LayoutAnimation,
    UIManager,
    Platform,
} from 'react-native';
// @ts-ignore
import Icon from 'react-native-vector-icons/MaterialIcons';
import { Bill } from '../types';
import { format } from 'date-fns';
import { coerceDate } from '../utils';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface BillItemProps {
    bill: Bill;
    isExpanded: boolean;
    onToggle: () => void;
    onEdit: (bill: Bill) => void;
    onDelete: (billId: string) => void;
}

const BillItem: React.FC<BillItemProps> = ({ bill, isExpanded, onToggle, onEdit, onDelete }) => {
    const isPaid = bill.pendingAmount <= 0;

    const toggleExpand = () => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        onToggle();
    };

    const formatDate = (dateVal: any) => {
        try {
            const d = coerceDate(dateVal);
            return format(d, 'dd MMM yy');
        } catch {
            return '—';
        }
    };
    const calculateDaysCount = () => {
        if (!bill.billDate) return '—';

        try {
            const billDate = coerceDate(bill.billDate);
            const endDate = bill.fullyPaidDate 
                ? coerceDate(bill.fullyPaidDate)
                : new Date();

            // Reset time part for accurate day calculation
            billDate.setHours(0, 0, 0, 0);
            endDate.setHours(0, 0, 0, 0);

            const diffTime = endDate.getTime() - billDate.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            return diffDays > 0 ? diffDays : 0;
        } catch {
            return '—';
        }
    };

    const daysCount = calculateDaysCount();

    const formatAmount = (amount: number) =>
        amount.toLocaleString('en-IN', { minimumFractionDigits: 0 });

    return (
        <View style={[styles.card, isPaid && styles.cardPaid]}>
            {/* ── Collapsed Row (always visible) ── */}
            <TouchableOpacity
                style={styles.row}
                onPress={toggleExpand}
                activeOpacity={0.7}
            >
                {/* Days Badge */}
                <View style={[styles.daysBadge, isPaid && styles.daysBadgePaid]}>
                    <Text style={[styles.daysNum, isPaid && styles.daysNumPaid]}>
                        {daysCount}
                    </Text>
                    <Text style={[styles.daysLabel, isPaid && styles.daysLabelPaid]}>days</Text>
                </View>

                {/* Party + Bill No */}
                <View style={styles.middleCol}>
                    <Text style={styles.partyName} numberOfLines={1}>
                        {bill.partyName || '—'}
                    </Text>
                    <Text style={styles.billNo} numberOfLines={1}>
                        #{bill.billNo}
                    </Text>
                </View>

                {/* Amount + chevron */}
                <View style={styles.rightCol}>
                    <Text style={[styles.pendingAmt, isPaid ? styles.paidAmt : styles.unpaidAmt]}>
                        {isPaid ? '✓ Paid' : `₹${formatAmount(bill.pendingAmount)}`}
                    </Text>
                    <Icon
                        name={isExpanded ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
                        size={20}
                        color="#999"
                    />
                </View>
            </TouchableOpacity>

            {/* ── Expanded Detail Panel ── */}
            {isExpanded && (
                <View style={styles.expandedPanel}>
                    <View style={styles.divider} />

                    {/* Detail Grid */}
                    <View style={styles.detailGrid}>
                        <DetailRow label="Bill Date" value={formatDate(bill.billDate)} />
                        <DetailRow label="Bill Amount" value={`₹${formatAmount(bill.billAmount)}`} />
                        <DetailRow label="Goods Return" value={`₹${formatAmount(bill.goodsReturn)}`} />
                        <DetailRow label="Total Paid" value={`₹${formatAmount(bill.totalPaidAmount)}`} />
                        <DetailRow
                            label="Pending"
                            value={isPaid ? 'Fully Paid' : `₹${formatAmount(bill.pendingAmount)}`}
                            valueColor={isPaid ? '#2e7d32' : '#c62828'}
                        />
                        {bill.fullyPaidDate && (
                            <DetailRow label="Paid On" value={formatDate(bill.fullyPaidDate)} />
                        )}
                    </View>

                    {/* Installments */}
                    {bill.installments && bill.installments.length > 0 && (
                        <View style={styles.installmentsSection}>
                            <Text style={styles.instHeader}>Installments</Text>
                            {/* Table header */}
                            <View style={styles.instTableHeader}>
                                <Text style={[styles.instHeaderCell, { flex: 1 }]}>#</Text>
                                <Text style={[styles.instHeaderCell, { flex: 3 }]}>Date</Text>
                                <Text style={[styles.instHeaderCell, { flex: 2, textAlign: 'right' }]}>Amount</Text>
                            </View>
                            {bill.installments.map((inst, idx) => (
                                <View key={idx} style={[styles.instRow, idx % 2 === 0 && styles.instRowAlt]}>
                                    <Text style={[styles.instCell, { flex: 1 }]}>{idx + 1}</Text>
                                    <Text style={[styles.instCell, { flex: 3 }]}>{formatDate(inst.date)}</Text>
                                    <Text style={[styles.instCell, { flex: 2, textAlign: 'right', color: '#2e7d32', fontWeight: '600' }]}>
                                        ₹{formatAmount(inst.amount)}
                                    </Text>
                                </View>
                            ))}
                        </View>
                    )}

                    {/* Action Buttons */}
                    <View style={styles.actions}>
                        <TouchableOpacity style={styles.editBtn} onPress={() => onEdit(bill)}>
                            <Icon name="edit" size={16} color="#fff" />
                            <Text style={styles.actionBtnText}>Edit</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.deleteBtn}
                            onPress={() => bill.id && onDelete(bill.id)}
                        >
                            <Icon name="delete" size={16} color="#fff" />
                            <Text style={styles.actionBtnText}>Delete</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            )}
        </View>
    );
};

const DetailRow = ({
    label,
    value,
    valueColor,
}: {
    label: string;
    value: string;
    valueColor?: string;
}) => (
    <View style={styles.detailRow}>
        <Text style={styles.detailLabel}>{label}</Text>
        <Text style={[styles.detailValue, valueColor ? { color: valueColor } : {}]}>{value}</Text>
    </View>
);

const styles = StyleSheet.create({
    card: {
        backgroundColor: '#fff',
        borderRadius: 10,
        marginBottom: 6,
        overflow: 'hidden',
        elevation: 2,
        shadowColor: '#000',
        shadowOpacity: 0.06,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 2 },
        borderLeftWidth: 4,
        borderLeftColor: '#c62828',
    },
    cardPaid: {
        borderLeftColor: '#2e7d32',
    },

    // ── Collapsed Row ──
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 12,
    },
    daysBadge: {
        width: 48,
        height: 48,
        borderRadius: 8,
        backgroundColor: '#fdecea',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    daysBadgePaid: {
        backgroundColor: '#e8f5e9',
    },
    daysNum: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#c62828',
        lineHeight: 18,
    },
    daysNumPaid: {
        color: '#2e7d32',
    },
    daysLabel: {
        fontSize: 9,
        color: '#c62828',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    daysLabelPaid: {
        color: '#2e7d32',
    },
    middleCol: {
        flex: 1,
        marginRight: 8,
    },
    partyName: {
        fontSize: 15,
        fontWeight: '700',
        color: '#1a1a1a',
    },
    billNo: {
        fontSize: 12,
        color: '#888',
        marginTop: 2,
    },
    rightCol: {
        alignItems: 'flex-end',
    },
    pendingAmt: {
        fontSize: 15,
        fontWeight: 'bold',
        marginBottom: 2,
    },
    unpaidAmt: {
        color: '#c62828',
    },
    paidAmt: {
        color: '#2e7d32',
    },

    // ── Expanded Panel ──
    expandedPanel: {
        paddingHorizontal: 12,
        paddingBottom: 12,
    },
    divider: {
        height: 1,
        backgroundColor: '#f0f0f0',
        marginBottom: 10,
    },
    detailGrid: {
        backgroundColor: '#fafafa',
        borderRadius: 8,
        paddingVertical: 4,
        paddingHorizontal: 8,
        marginBottom: 10,
    },
    detailRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 5,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    detailLabel: {
        fontSize: 13,
        color: '#666',
    },
    detailValue: {
        fontSize: 13,
        fontWeight: '600',
        color: '#1a1a1a',
    },

    // ── Installments Table ──
    installmentsSection: {
        marginBottom: 10,
    },
    instHeader: {
        fontSize: 13,
        fontWeight: '700',
        color: '#555',
        marginBottom: 4,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    instTableHeader: {
        flexDirection: 'row',
        backgroundColor: '#FFA4A4',
        paddingVertical: 4,
        paddingHorizontal: 8,
        borderRadius: 4,
        marginBottom: 2,
    },
    instHeaderCell: {
        fontSize: 11,
        fontWeight: '700',
        color: '#fff',
        textTransform: 'uppercase',
    },
    instRow: {
        flexDirection: 'row',
        paddingVertical: 5,
        paddingHorizontal: 8,
        backgroundColor: '#fff',
    },
    instRowAlt: {
        backgroundColor: '#fafafa',
    },
    instCell: {
        fontSize: 13,
        color: '#333',
    },

    // ── Action Buttons ──
    actions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 8,
        marginTop: 4,
    },
    editBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFA4A4',
        paddingVertical: 7,
        paddingHorizontal: 14,
        borderRadius: 6,
        gap: 4,
    },
    deleteBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#c62828',
        paddingVertical: 7,
        paddingHorizontal: 14,
        borderRadius: 6,
        gap: 4,
    },
    actionBtnText: {
        color: '#fff',
        fontSize: 13,
        fontWeight: '600',
    },
});

export default BillItem;

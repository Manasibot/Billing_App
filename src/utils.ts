import { Bill } from './types';

/**
 * Robust date coercion that handles Firestore Timestamps, 
 * Date objects, and plain JSON serialized objects.
 */
export const coerceDate = (val: any): Date => {
  if (!val) return new Date();
  
  // Firestore Timestamp object
  if (typeof val.toDate === 'function') {
    return val.toDate();
  }
  
  // Plain object { seconds, nanoseconds } from JSON storage
  if (typeof val.seconds === 'number') {
    return new Date(val.seconds * 1000);
  }
  
  // ISO string or timestamp number or Date object
  const d = new Date(val);
  return isNaN(d.getTime()) ? new Date() : d;
};

/**
 * Consistently calculate days count for a bill
 */
export const calculateDaysCount = (bill: any): number => {
  if (!bill?.billDate) return 0;

  try {
    const billDate = coerceDate(bill.billDate);
    const endDate = bill.fullyPaidDate
      ? coerceDate(bill.fullyPaidDate)
      : new Date();

    billDate.setHours(0, 0, 0, 0);
    endDate.setHours(0, 0, 0, 0);

    const diffTime = endDate.getTime() - billDate.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return diffDays > 0 ? diffDays : 0;
  } catch (error) {
    console.warn('[Utils] Error calculating days count:', error);
    return 0;
  }
};

/**
 * Enrich bill data with calculated fields before saving to state/cache
 */
export const enrichBill = (docId: string, data: any): Bill => {
  const daysCount = calculateDaysCount(data);
  return {
    ...data,
    id: docId,
    daysCount
  } as Bill;
};

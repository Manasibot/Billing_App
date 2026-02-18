
export interface Installment {
    amount: number;
    date: any; // Using any for simplicity as Firestore Timestamp or Date object handling can vary, usually filtered before saving
}

export interface Bill {
    id?: string;
    partyName: string;
    billNo: string;
    billDate: any; // Date or Timestamp
    billAmount: number;
    goodsReturn: number;
    installments: Installment[];
    totalPaidAmount: number; // calculated
    pendingAmount: number; // calculated
    daysCount: number; // calculated
    fullyPaidDate: any | null;
    createdAt?: any;
    updatedAt?: any;
}

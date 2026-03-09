import React, { useState, useEffect } from 'react';
import {
   Modal,
   View,
   Text,
   TextInput,
   TouchableOpacity,
   ScrollView,
   StyleSheet,
   Alert
} from 'react-native';
// @ts-ignore
import Icon from 'react-native-vector-icons/MaterialIcons';
import { Bill, Installment } from '../types';
import { format } from 'date-fns';
import { Calendar } from 'react-native-calendars';


interface AddBillModalProps {
   visible: boolean;
   onClose: () => void;
   onSave: (bill: Omit<Bill, 'id'>) => void;
   initialData?: Bill | null;
}


const AddBillModal: React.FC<AddBillModalProps> = ({ visible, onClose, onSave, initialData }) => {
   const [partyName, setPartyName] = useState('');
   const [billNo, setBillNo] = useState('');
   const [billDate, setBillDate] = useState(new Date());
   const [billAmount, setBillAmount] = useState('');
   const [goodsReturn, setGoodsReturn] = useState('0');
   const [installments, setInstallments] = useState<Installment[]>([]);


   const [showGoodsReturn, setShowGoodsReturn] = useState(false);


   // Installment input state
   const [instAmount, setInstAmount] = useState('');
   const [instDate, setInstDate] = useState(new Date());
   const [showBillDatePicker, setShowBillDatePicker] = useState(false);
   const [showInstDatePicker, setShowInstDatePicker] = useState(false);


   useEffect(() => {
       if (initialData) {
           setPartyName(initialData.partyName || '');
           setBillNo(initialData.billNo);
           setBillDate(initialData.billDate.toDate ? initialData.billDate.toDate() : new Date(initialData.billDate));
           setBillAmount(initialData.billAmount.toString());
           setGoodsReturn(initialData.goodsReturn.toString());
           setInstallments(initialData.installments.map(i => ({
               ...i,
               date: i.date.toDate ? i.date.toDate() : new Date(i.date)
           })));
       } else {
           resetForm();
       }
   }, [initialData, visible]);


   const resetForm = () => {
       setPartyName('');
       setBillNo('');
       setBillDate(new Date());
       setBillAmount('');
       setGoodsReturn('0');
       setShowGoodsReturn(false);
       setInstallments([]);
       setInstAmount('');
       setInstDate(new Date());
   };


   const addInstallment = () => {
       const amount = parseFloat(instAmount);
       if (isNaN(amount) || amount <= 0) {
           Alert.alert('Invalid Amount', 'Please enter a valid installment amount');
           return;
       }
       setInstallments([...installments, { amount, date: instDate }]);
       setInstAmount('');
       setInstDate(new Date());
   };


   const removeInstallment = (index: number) => {
       const newInst = [...installments];
       newInst.splice(index, 1);
       setInstallments(newInst);
   };


   const calculateTotals = () => {
       const totalInst = installments.reduce((sum, i) => sum + i.amount, 0);
       const gr = parseFloat(goodsReturn) || 0;
       const totalPaid = totalInst + gr;
       const amount = parseFloat(billAmount) || 0;
       const pending = amount - totalPaid;


       // Days count
       const diffTime = Math.abs(new Date().getTime() - billDate.getTime());
       const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24));


       return { totalPaid, pending, days };
   };


   const { totalPaid, pending, days } = calculateTotals();


   const handleSave = () => {
       if (!partyName || !billNo || !billAmount) {
           Alert.alert('Missing Fields', 'Please fill in Party Name, Bill No and Bill Amount');
           return;
       }


       const billData: Omit<Bill, 'id'> = {
           partyName,
           billNo,
           billDate,
           billAmount: parseFloat(billAmount),
           goodsReturn: parseFloat(goodsReturn) || 0,
           installments,
           totalPaidAmount: totalPaid,
           pendingAmount: pending < 0 ? 0 : pending, // Prevent negative pending
           daysCount: days,
           fullyPaidDate: pending <= 0 ? new Date() : null,
       };


       onSave(billData);
       onClose();
   };


   const handleManualMarkPaid = () => {
       const amount = parseFloat(billAmount) || 0;
       setInstallments([{ amount: amount, date: new Date() }]);
       setGoodsReturn('0');
   };


   return (
       <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
           <View style={styles.modalContainer}>
               <View style={styles.header}>
                   <Text style={styles.headerTitle}>{initialData ? 'Edit Bill' : 'Add New Bill'}</Text>
                   <TouchableOpacity onPress={onClose}>
                       <Icon name="close" size={28} color="#FCF9EA" />
                   </TouchableOpacity>
               </View>


               <ScrollView contentContainerStyle={styles.content}>
                   <Text style={styles.label}>Party Name</Text>
                   <TextInput
                       style={styles.input}
                       value={partyName}
                       onChangeText={setPartyName}
                       placeholder="Enter Party Name"
                       placeholderTextColor="#BADFDB"
                   />


                   <Text style={styles.label}>Bill No</Text>
                   <TextInput
                       style={styles.input}
                       value={billNo}
                       onChangeText={setBillNo}
                       placeholder="Enter Bill No"
                       placeholderTextColor="#BADFDB"
                   />


                   <Text style={styles.label}>Bill Date</Text>
                   <TouchableOpacity onPress={() => setShowBillDatePicker(true)} style={styles.dateInput}>
                       <Text style={styles.dateText}>{format(billDate, 'yyyy-MM-dd')}</Text>
                       <Icon name="event" size={24} color="#FFA4A4" />
                   </TouchableOpacity>
                   <Modal
                       visible={showBillDatePicker}
                       transparent={true}
                       animationType="fade"
                       onRequestClose={() => setShowBillDatePicker(false)}
                   >
                       <View style={styles.calendarModalOverlay}>
                           <View style={styles.calendarContainer}>
                               <Calendar
                                   onDayPress={(day: any) => {
                                       setBillDate(new Date(day.timestamp));
                                       setShowBillDatePicker(false);
                                   }}
                                   markedDates={{
                                       [format(billDate, 'yyyy-MM-dd')]: { selected: true, selectedColor: '#FFA4A4' }
                                   }}
                                   theme={{
                                       todayTextColor: '#FFA4A4',
                                       arrowColor: '#FFA4A4',
                                       selectedDayBackgroundColor: '#FFA4A4',
                                   }}
                               />
                               <TouchableOpacity
                                   style={styles.closeCalendarBtn}
                                   onPress={() => setShowBillDatePicker(false)}
                               >
                                   <Text style={styles.closeCalendarBtnText}>Close</Text>
                               </TouchableOpacity>
                           </View>
                       </View>
                   </Modal>


                   <Text style={styles.label}>Bill Amount</Text>
                   <TextInput
                       style={styles.input}
                       value={billAmount}
                       onChangeText={setBillAmount}
                       placeholder="0.00"
                       keyboardType="numeric"
                       placeholderTextColor="#BADFDB"
                   />




                   {/* Goods Return - toggle with + icon */}
                   <View style={styles.goodsReturnHeader}>
                       <Text style={styles.label}>Goods Return</Text>
                       <TouchableOpacity
                           onPress={() => {
                               setShowGoodsReturn(prev => !prev);
                               if (showGoodsReturn) setGoodsReturn('0');
                           }}
                           style={styles.grToggleBtn}
                       >
                           <Icon
                               name={showGoodsReturn ? 'remove-circle-outline' : 'add-circle-outline'}
                               size={22}
                               color="#FFA4A4"
                           />
                       </TouchableOpacity>
                   </View>
                   {showGoodsReturn && (
                       <TextInput
                           style={styles.input}
                           value={goodsReturn === '0' ? '' : goodsReturn}
                           onChangeText={setGoodsReturn}
                           placeholder="Enter return amount"
                           keyboardType="numeric"
                           placeholderTextColor="#BADFDB"
                           autoFocus
                       />
                   )}


                   <View style={styles.divider} />


                   <Text style={styles.subHeader}>Installments</Text>
                   {installments.map((inst, index) => (
                       <View key={index} style={styles.instRow}>
                           <Text style={styles.instText}>{format(inst.date, 'yyyy-MM-dd')} - {inst.amount}</Text>
                           <TouchableOpacity onPress={() => removeInstallment(index)}>
                               <Icon name="delete" size={20} color="#FFA4A4" />
                           </TouchableOpacity>
                       </View>
                   ))}


                   <View style={styles.addInstContainer}>
                       <TextInput
                           style={[styles.input, { flex: 1, marginBottom: 0, marginRight: 8 }]}
                           value={instAmount}
                           onChangeText={setInstAmount}
                           placeholder="Amount"
                           keyboardType="numeric"
                           placeholderTextColor="#BADFDB"
                       />
                       <TouchableOpacity onPress={() => setShowInstDatePicker(true)} style={styles.iconBtn}>
                           <Icon name="event" size={24} color="#FFA4A4" />
                       </TouchableOpacity>
                       <Modal
                           visible={showInstDatePicker}
                           transparent={true}
                           animationType="fade"
                           onRequestClose={() => setShowInstDatePicker(false)}
                       >
                           <View style={styles.calendarModalOverlay}>
                               <View style={styles.calendarContainer}>
                                   <Calendar
                                       onDayPress={(day: any) => {
                                           setInstDate(new Date(day.timestamp));
                                           setShowInstDatePicker(false);
                                       }}
                                       markedDates={{
                                           [format(instDate, 'yyyy-MM-dd')]: { selected: true, selectedColor: '#FFA4A4' }
                                       }}
                                       theme={{
                                           todayTextColor: '#FFA4A4',
                                           arrowColor: '#FFA4A4',
                                           selectedDayBackgroundColor: '#FFA4A4',
                                       }}
                                   />
                                   <TouchableOpacity
                                       style={styles.closeCalendarBtn}
                                       onPress={() => setShowInstDatePicker(false)}
                                   >
                                       <Text style={styles.closeCalendarBtnText}>Close</Text>
                                   </TouchableOpacity>
                               </View>
                           </View>
                       </Modal>
                       <TouchableOpacity onPress={addInstallment} style={[styles.btn, { marginLeft: 8 }]}>
                           <Text style={styles.btnText}>Add</Text>
                       </TouchableOpacity>
                   </View>


                   <View style={styles.divider} />


                   <View style={styles.summaryRow}>
                       <Text style={styles.summaryLabel}>Total Paid:</Text>
                       <Text style={styles.summaryValue}>{totalPaid.toFixed(2)}</Text>
                   </View>
                   <View style={styles.summaryRow}>
                       <Text style={styles.summaryLabel}>Pending:</Text>
                       <Text style={[styles.summaryValue, { color: pending > 0 ? '#FFA4A4' : '#005F02' }]}>
                           {pending <= 0 ? '0.00' : pending.toFixed(2)}
                       </Text>
                   </View>
                   <View style={styles.summaryRow}>
                       <Text style={styles.summaryLabel}>Days Count:</Text>
                       <Text style={styles.summaryValue}>{days}</Text>
                   </View>


                   <TouchableOpacity style={styles.manualBtn} onPress={handleManualMarkPaid}>
                       <Text style={styles.manualBtnText}>Manual Mark Paid</Text>
                   </TouchableOpacity>


                   <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
                       <Text style={styles.saveBtnText}>Save Bill</Text>
                   </TouchableOpacity>
               </ScrollView>
           </View>
       </Modal>
   );
};


const styles = StyleSheet.create({
   modalContainer: {
       flex: 1,
       backgroundColor: '#FCF9EA', // Cream background
   },
   header: {
       flexDirection: 'row',
       justifyContent: 'space-between',
       alignItems: 'center',
       padding: 16,
       backgroundColor: '#FFA4A4', // Coral header
       borderBottomWidth: 1,
       borderBottomColor: '#FFBDBD',
   },
   headerTitle: {
       fontSize: 20,
       fontWeight: 'bold',
       color: '#FCF9EA', // Cream text
   },
   content: {
       padding: 16,
   },
   label: {
       fontSize: 14,
       fontWeight: '600',
       marginBottom: 6,
       color: '#FFA4A4', // Coral labels
   },
   input: {
       backgroundColor: '#FFFFFF',
       borderWidth: 1,
       borderColor: '#BADFDB', // Mint border
       borderRadius: 8,
       padding: 12,
       marginBottom: 16,
       fontSize: 16,
       color: '#333',
   },
   dateInput: {
       flexDirection: 'row',
       justifyContent: 'space-between',
       alignItems: 'center',
       backgroundColor: '#FFFFFF',
       borderWidth: 1,
       borderColor: '#BADFDB',
       borderRadius: 8,
       padding: 12,
       marginBottom: 16,
   },
   dateText: {
       fontSize: 16,
       color: '#333',
   },
   divider: {
       height: 1,
       backgroundColor: '#FFBDBD', // Light coral divider
       marginVertical: 16,
   },
   subHeader: {
       fontSize: 18,
       fontWeight: 'bold',
       marginBottom: 10,
       color: '#FFA4A4',
   },
   instRow: {
       flexDirection: 'row',
       justifyContent: 'space-between',
       alignItems: 'center',
       backgroundColor: '#FFBDBD', // Light coral background
       padding: 12,
       borderRadius: 8,
       marginBottom: 8,
   },
   instText: {
       fontSize: 16,
       color: '#333',
   },
   addInstContainer: {
       flexDirection: 'row',
       alignItems: 'center',
       marginTop: 8,
   },
   iconBtn: {
       padding: 10,
       backgroundColor: '#FCF9EA',
       borderWidth: 1,
       borderColor: '#BADFDB',
       borderRadius: 8,
   },
   btn: {
       backgroundColor: '#FFA4A4',
       paddingVertical: 12,
       paddingHorizontal: 20,
       borderRadius: 8,
   },
   btnText: {
       color: '#FCF9EA',
       fontWeight: 'bold',
       fontSize: 14,
   },
   goodsReturnHeader: {
       flexDirection: 'row',
       alignItems: 'center',
       justifyContent: 'space-between',
       marginBottom: 6,
   },
   grToggleBtn: {
       padding: 4,
   },
   summaryRow: {
       flexDirection: 'row',
       justifyContent: 'space-between',
       marginBottom: 8,
   },
   summaryLabel: {
       fontSize: 16,
       fontWeight: '600',
       color: '#FFA4A4',
   },
   summaryValue: {
       fontSize: 16,
       fontWeight: 'bold',
       color: '#333',
   },
   manualBtn: {
       backgroundColor: '#FFBDBD',
       padding: 14,
       borderRadius: 8,
       alignItems: 'center',
       marginTop: 20,
       borderWidth: 1,
       borderColor: '#FFA4A4',
   },
   manualBtnText: {
       color: '#FCF9EA',
       fontWeight: 'bold',
       fontSize: 16,
   },
   saveBtn: {
       backgroundColor: '#FFA4A4',
       padding: 16,
       borderRadius: 8,
       alignItems: 'center',
       marginTop: 12,
       marginBottom: 30,
   },
   saveBtnText: {
       color: '#FCF9EA',
       fontWeight: 'bold',
       fontSize: 18,
   },
   calendarModalOverlay: {
       flex: 1,
       backgroundColor: 'rgba(0,0,0,0,5)',
       justifyContent: 'center',
       alignItems: 'center',
       padding: 20,
   },
   calendarContainer: {
       backgroundColor: '#FFFFFF',
       borderRadius: 12,
       padding: 10,
       width: '100%',
       elevation: 5,
       shadowColor: '#000',
       shadowOffset: { width: 0, height: 2 },
       shadowOpacity: 0.25,
       shadowRadius: 3.84,
   },
   closeCalendarBtn: {
       marginTop: 10,
       backgroundColor: '#FFA4A4',
       padding: 10,
       borderRadius: 8,
       alignItems: 'center',
   },
   closeCalendarBtnText: {
       color: '#FFFFFF',
       fontWeight: 'bold',
   },
});


export default AddBillModal;


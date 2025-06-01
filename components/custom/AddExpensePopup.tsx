import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, Modal, TouchableOpacity, Platform } from 'react-native';
import { Button, ButtonText } from '@/components/ui/button';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { getCategories, Category } from '@/api/categoryApi';
import auth from '@react-native-firebase/auth';
import {Expense} from '@/api/expenseApi'

interface AddExpensePopupProps {
  visible: boolean;
  onClose: () => void;
  onAddExpense: (expenseData: Omit<Expense, 'id'>) => Promise<void>;
  scannedData?: string | null;
}

export function AddExpensePopup({ visible, onClose, onAddExpense, scannedData }: AddExpensePopupProps) {
  const [amount, setAmount] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedCurrency, setSelectedCurrency] = useState('EUR');
  const [categories, setCategories] = useState<Category[]>([]);
  const [showDatePicker, setShowDatePicker] = useState(false);

  useEffect(() => {
    if (visible) {
      void loadCategories();
    }
  }, [visible]);

  const loadCategories = async () => {
    try {
      const fetchedCategories = await getCategories();
      setCategories(fetchedCategories);
      if (fetchedCategories.length > 0) {
        setSelectedCategory(fetchedCategories[0].id);
      }
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const handleAddExpense = async () => {
    if (amount.trim() === '' || !selectedCategory) {
      alert('Please enter an amount and select a category');
      return;
    }

    try {
      const expenseData: Omit<Expense, 'id'> = {
        amount: parseFloat(amount),
        categoryId: selectedCategory,
        date: selectedDate.toISOString(),
        currency: selectedCurrency,
        userId: auth().currentUser?.uid || '',
        userName: auth().currentUser?.displayName || 'Unknown',
      };

      await onAddExpense(expenseData);
      onClose();
      setAmount('');
      setSelectedCategory('');
      setSelectedDate(new Date());
      setSelectedCurrency('EUR');
    } catch (error) {
      console.error('Error adding expense:', error);
      alert('Failed to add expense. Please try again.');
    }
  };

  const onDateChange = (event: any, selectedDate?: Date) => {
    const currentDate = selectedDate || new Date();
    setShowDatePicker(Platform.OS === 'ios');
    setSelectedDate(currentDate);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalBackground}>
        <View style={styles.modalContent}>
          <Text style={styles.title}>Add New Expense</Text>
          <TextInput
            style={styles.input}
            placeholder="Amount"
            value={amount}
            onChangeText={setAmount}
            keyboardType="numeric"
          />
          <Picker
            selectedValue={selectedCategory}
            style={styles.picker}
            onValueChange={(itemValue) => setSelectedCategory(itemValue)}
          >
            {categories.map((category) => (
              <Picker.Item key={category.id} label={category.name} value={category.id} />
            ))}
          </Picker>
          <TouchableOpacity onPress={() => setShowDatePicker(true)}>
            <Text style={styles.dateText}>
              Date: {selectedDate.toLocaleDateString()}
            </Text>
          </TouchableOpacity>
          {showDatePicker && (
            <DateTimePicker
              value={selectedDate}
              mode="date"
              display="default"
              onChange={onDateChange}
            />
          )}
          <Picker
            selectedValue={selectedCurrency}
            style={styles.picker}
            onValueChange={(itemValue) => setSelectedCurrency(itemValue)}
          >
            <Picker.Item label="EUR" value="EUR" />
            <Picker.Item label="USD" value="USD" />
            <Picker.Item label="GBP" value="GBP" />
          </Picker>
          <View style={styles.buttonContainer}>
            <Button onPress={handleAddExpense} style={styles.addButton}>
              <ButtonText>Add Expense</ButtonText>
            </Button>
            <Button onPress={onClose} style={styles.cancelButton}>
              <ButtonText>Cancel</ButtonText>
            </Button>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalBackground: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 10,
    width: '80%',
    maxHeight: '80%',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    padding: 10,
    marginBottom: 15,
  },
  picker: {
    marginBottom: 15,
  },
  dateText: {
    fontSize: 16,
    marginBottom: 15,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  addButton: {
    flex: 1,
    marginRight: 5,
  },
  cancelButton: {
    flex: 1,
    marginLeft: 5,
    backgroundColor: '#ccc',
  },
});


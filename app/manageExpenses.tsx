import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, Alert, Modal, TextInput, TouchableOpacity, Platform, ScrollView } from 'react-native';
import { Button, ButtonText } from '@/components/ui/button';
import { useRouter } from 'expo-router';
import { getExpenses, Expense } from '@/api/expenseApi';
import { getCategories, Category } from '@/api/categoryApi';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { updateExpense, deleteExpense,} from '@/api/expenseApi';

const ManageExpenses: React.FC = () => {
  const router = useRouter();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [editedAmount, setEditedAmount] = useState('');
  const [editedCategory, setEditedCategory] = useState('');
  const [editedDate, setEditedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  useEffect(() => {
    const loadExpensesAndCategories = async () => {
      try {
        const fetchedExpenses = await getExpenses();
        const fetchedCategories = await getCategories();
        setExpenses(fetchedExpenses);
        setCategories(fetchedCategories);
      } catch (error) {
        console.error('Error loading data:', error);
        Alert.alert('Error', 'Failed to load data.');
      }
    };

    loadExpensesAndCategories();
  }, []);

  const handleEditExpense = (expense: Expense) => {
    setEditingExpense(expense);
    setEditedAmount(expense.amount.toString());
    setEditedCategory(expense.categoryId);
    setEditedDate(new Date(expense.date));
    setShowDatePicker(false);
  };

  const handleSaveEdit = async () => {
    if (!editingExpense) return;

    try {
      await updateExpense({
        ...editingExpense,
        amount: parseFloat(editedAmount),
        categoryId: editedCategory,
        date: editedDate.toISOString(),
      });

      setExpenses(prevExpenses =>
        prevExpenses.map(expense =>
          expense.id === editingExpense.id
            ? { ...expense, amount: parseFloat(editedAmount), categoryId: editedCategory, date: editedDate.toISOString() }
            : expense
        )
      );

      setEditingExpense(null);
      Alert.alert('Success', 'Expense updated successfully.');
    } catch (error) {
      console.error('Error updating expense:', error);
      Alert.alert('Error', 'Failed to update expense.');
    }
  };

  const handleDeleteExpense = async (expenseId: string) => {
    try {
      await deleteExpense(expenseId);
      setExpenses(expenses.filter(expense => expense.id !== expenseId));
      Alert.alert('Success', 'Expense deleted successfully.');
    } catch (error) {
      console.error('Error deleting expense:', error);
      Alert.alert('Error', 'Failed to delete expense.');
    }
  };

  const getCategoryName = (categoryId: string) => {
    const category = categories.find(c => c.id === categoryId);
    return category ? category.name : 'Unknown';
  };

  const renderItem = ({ item }: { item: Expense }) => (
    <View style={styles.expenseItem}>
      <Text>{getCategoryName(item.categoryId)} - €{item.amount.toFixed(2)} - {new Date(item.date).toLocaleDateString()}</Text>
      <View style={styles.buttonContainer}>
        <Button onPress={() => handleEditExpense(item)} style={styles.editButton}>
          <ButtonText>Edit</ButtonText>
        </Button>
        <Button onPress={() => handleDeleteExpense(item.id)} style={styles.deleteButton}>
          <ButtonText>Delete</ButtonText>
        </Button>
      </View>
    </View>
  );

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Manage Expenses</Text>

      <Modal visible={!!editingExpense} animationType="slide" transparent={true}>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Edit Expense</Text>
            <TextInput
              style={styles.input}
              placeholder="Amount"
              value={editedAmount}
              onChangeText={setEditedAmount}
              keyboardType="numeric"
            />
            <Picker
              selectedValue={editedCategory}
              style={styles.picker}
              onValueChange={(itemValue) => setEditedCategory(itemValue)}
            >
              {categories.map(category => (
                <Picker.Item key={category.id} label={category.name} value={category.id} />
              ))}
            </Picker>
            <TouchableOpacity onPress={() => setShowDatePicker(true)}>
              <Text style={styles.dateText}>Date: {editedDate.toLocaleDateString()}</Text>
            </TouchableOpacity>
            {showDatePicker && (
              <DateTimePicker
                value={editedDate}
                mode="date"
                display="default"
                onChange={(event, date) => {
                  setShowDatePicker(Platform.OS === 'ios');
                  if (date) setEditedDate(date);
                }}
              />
            )}
            <Button onPress={handleSaveEdit} style={styles.saveButton}>
              <ButtonText>Save</ButtonText>
            </Button>
            <Button onPress={() => setEditingExpense(null)} style={styles.cancelButton}>
              <ButtonText>Cancel</ButtonText>
            </Button>
          </View>
        </View>
      </Modal>

      <FlatList
        data={expenses}
        keyExtractor={item => item.id}
        renderItem={renderItem}
      />

      <Button onPress={() => router.back()} style={styles.backButton}>
        <ButtonText>Back</ButtonText>
      </Button>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  expenseItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
    paddingVertical: 10,
  },
  buttonContainer: {
    flexDirection: 'row',
  },
  editButton: {
    marginRight: 10,
    backgroundColor: 'blue',
  },
  deleteButton: {
    backgroundColor: 'red',
  },
  backButton: {
    marginTop: 20,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 10,
    width: '80%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    padding: 10,
    marginBottom: 10,
  },
  picker: {
    height: 50,
    width: '100%',
    marginBottom: 10,
  },
  dateText: {
    fontSize: 16,
    marginBottom: 10,
  },
  saveButton: {
    backgroundColor: 'green',
    marginBottom: 10,
  },
  cancelButton: {
    backgroundColor: 'red',
  },
});

export default ManageExpenses;


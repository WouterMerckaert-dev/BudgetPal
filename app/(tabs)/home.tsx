import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Button, ButtonText } from '@/components/ui/button';
import { AddCategoryPopup } from '@/components/custom/AddCategoryPopup';
import { AddExpensePopup } from '@/components/custom/AddExpensePopup';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {Expense, addExpense, deleteExpense} from '@/api/expenseApi'
import { getFamily, Family } from '@/api/familyApi';
import { Card } from "@/components/ui/card";
import { Trash2 } from 'lucide-react-native';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';

export default function Home() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [isAddCategoryVisible, setIsAddCategoryVisible] = useState(false);
  const [isAddExpenseVisible, setIsAddExpenseVisible] = useState(false);
  const [_monthlyLimit, setMonthlyLimit] = useState<number | null>(null);

  const { data: family, isLoading: familyLoading, isError: familyError } = useQuery<Family | null>(
    ['family'],
    () => getFamily(auth().currentUser?.uid || ''),
    { enabled: !!auth().currentUser }
  );

  useFocusEffect(
    React.useCallback(() => {
      void queryClient.invalidateQueries(['family']);
      fetchMonthlyLimit();
    }, [queryClient])
  );

  const fetchMonthlyLimit = () => {
    const user = auth().currentUser;
    if (user) {
      console.log('Fetching user data for UID:', user.uid);
      firestore()
        .collection('users')
        .doc(user.uid)
        .get()
        .then((doc) => {
          console.log('Firestore document exists:', doc.exists);
          if (doc.exists) {
            const userData = doc.data();
            console.log('Firestore document data:', userData);
            if (userData && userData.monthlyLimit) {
              console.log('Setting monthly limit to:', userData.monthlyLimit);
              setMonthlyLimit(userData.monthlyLimit);
            } else {
              console.log('No monthly limit found in document');
              setMonthlyLimit(null);
            }
          } else {
            console.log('User document does not exist');
            setMonthlyLimit(null);
          }
        })
        .catch((error) => {
          console.error("Error fetching user data:", error);
          setMonthlyLimit(null);
        });
    } else {
      console.log('No authenticated user found');
      setMonthlyLimit(null);
    }
  };

  useEffect(() => {
    fetchMonthlyLimit();

    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  const handleAddCategory = () => {
    setIsAddCategoryVisible(true);
  };

  const handleAddExpense = () => {
    setIsAddExpenseVisible(true);
  };

  const getCategoryName = (categoryId: string) => {
    const category = family?.categories.find(c => c.id === categoryId);
    return category ? category.name : 'Unknown';
  };

  const getUserName = (userId: string) => {
    if (familyLoading) {
      return 'Loading...';
    }

    const currentUser = auth().currentUser;
    if (family && family.members.length > 0) {
      const member = family.members.find(m => m.id === userId);
      return member ? member.name : 'Unknown';
    }
    else if (currentUser && currentUser.uid === userId) {
      return currentUser.displayName || 'Unknown';
    }
    return 'Unknown';
  };

  const recentExpenses = family?.expenses
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 3) || [];

  const getCurrentBudget = () => {
    console.log('Calculating current budget. Family monthly limit:', family?.monthlyLimit);
    if (!family || family.monthlyLimit === null) return 0;

    const totalExpenses = family.expenses.reduce((sum, expense) => sum + expense.amount, 0) || 0;
    console.log('Total expenses:', totalExpenses);
    return family.monthlyLimit - totalExpenses;
  };

  if (familyLoading) {
    return <ActivityIndicator size="large" color="#007AFF" style={styles.loadingIndicator} />;
  }

  if (familyError || !family) {
    return <Text>Error loading family data</Text>;
  }

  async function HandleDeleteExpense(expenseId: string) {
    await deleteExpense(expenseId);
    await queryClient.invalidateQueries(['family']); // Ververs de gegevens na verwijderen
  }

  return (
      <Animated.View style={[styles.container, {opacity: fadeAnim}]}>
        <Text style={styles.greeting}>Welkom!</Text>
        <Card style={styles.budgetCard}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Huidig Budget</Text>
          </View>
          <View style={styles.cardContent}>
            <Text style={[
              styles.budgetAmount,
              {
                color: getCurrentBudget() <= (family?.monthlyLimit ? (family.monthlyLimit * (family.warningPercentage ?? 20) / 100) : 0)
                  ? '#FF3B30'  // Red when below warning threshold
                  : '#34C759'  // Green when above warning threshold
              }
            ]}>
              €{getCurrentBudget().toFixed(2)}
            </Text>
          </View>
          <View style={styles.cardFooter}>
            <Text style={styles.cardFooterTitle}>Recente activiteit:</Text>
            {recentExpenses.length > 0 ? (
              recentExpenses.map((expense, index) => (
                <View key={index} style={styles.recentExpenseItem}>
                  <Text style={styles.recentExpenseText}>
                    - {getCategoryName(expense.categoryId)}: €{expense.amount.toFixed(2)} (User: {getUserName(expense.userId)})
                  </Text>
                  <TouchableOpacity onPress={() => HandleDeleteExpense(expense.id)}>
                    <Trash2 size={20} color="#FF3B30" />
                  </TouchableOpacity>
                </View>
              ))
            ) : (
              <Text style={styles.noExpensesText}>Geen recente activiteiten</Text>
            )}
          </View>
        </Card>

        <TouchableOpacity style={styles.addExpenseButton} onPress={handleAddExpense}>
          <Text style={styles.addExpenseButtonText}>Nieuwe kost toevoegen</Text>
        </TouchableOpacity>
        <Button onPress={handleAddCategory} style={styles.addCategoryButton}>
          <ButtonText>Nieuwe categorie toevoegen</ButtonText>
        </Button>
        <Button onPress={() => router.push('/manageExpenses')} style={styles.manageExpensesButton}>
          <ButtonText>Kosten Beheren</ButtonText>
        </Button>
        <AddCategoryPopup
          visible={isAddCategoryVisible}
          onClose={async () => {
            setIsAddCategoryVisible(false)
            await queryClient.invalidateQueries(['family'])
          }}
        />
        <AddExpensePopup
          visible={isAddExpenseVisible}
          onClose={async () => {
            setIsAddExpenseVisible(false);
            await queryClient.invalidateQueries(['family']);
          }}
          onAddExpense={async (expenseData: Omit<Expense, 'id'>) => {
            try {
              await addExpense(expenseData);
              await queryClient.invalidateQueries(['family']);
              alert('Expense added successfully!');
            } catch (error) {
              console.error('Error adding expense:', error);
              Alert.alert('Error', 'Failed to add expense.');
            }
          }}
        />
      </Animated.View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  addExpenseButton: {
    backgroundColor: '#34C759',
    padding: 15,
    borderRadius: 5,
    marginTop: 10,
    width: '100%',
    alignItems: 'center',
  },
  addExpenseButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  addCategoryButton: {
    marginTop: 10,
    width: '100%',
  },
  removeExpenseButton: {
    marginTop: 10,
    width: '100%',
  },
  budgetCard: {
    width: '100%',
    backgroundColor: 'white',
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  budgetAmount: {
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  cardHeader: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  cardContent: {
    padding: 20,
    alignItems: 'center',
  },
  cardFooter: {
    padding: 15,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  cardFooterTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#666',
  },
  recentExpenseItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  recentExpenseText: {
    fontSize: 14,
    color: '#666',
  },
  noExpensesText: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
  },
  loadingIndicator: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  manageExpensesButton: {
    marginTop: 10,
    width: '100%',
  },
});


import { LogBox } from 'react-native';
import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions, RefreshControl, FlatList, ActivityIndicator, ScrollView} from 'react-native';
import { Button, ButtonText } from '@/components/ui/button';
import { useRouter, useFocusEffect } from 'expo-router';
import { PieChart } from 'react-native-chart-kit';
import { Picker } from '@react-native-picker/picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {Category, getCategories} from '@/api/categoryApi'
import { getFamily, Family} from '@/api/familyApi';
import {Expense, getExpenses} from '@/api/expenseApi'
import auth from '@react-native-firebase/auth';
import { format, startOfWeek, startOfMonth, startOfYear } from 'date-fns';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';

LogBox.ignoreLogs(['VirtualizedLists should never be nested']);

const BudgetOverview: React.FC = () => {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedTimePeriod, setSelectedTimePeriod] = useState('Week'); // Update 1
  const [sortBy, setSortBy] = useState('date');
  const [exchangeRate, setExchangeRate] = useState(1);
  const [currency, setCurrency] = useState('EUR');
  const [selectedUser, setSelectedUser] = useState('All');
  const [isLoading, setIsLoading] = useState(true);

  const { data: family, isLoading: familyLoading, isError, refetch } = useQuery<Family | null>(
    ['family'],
    () => getFamily(auth().currentUser?.uid || ''),
    { enabled: !!auth().currentUser }
  );

  const { data: categories = [], isLoading: categoriesLoading } = useQuery<Category[]>(
    ['categories'],
    getCategories,
    { enabled: !!auth().currentUser }
  );

  const { data: expenses = [], isLoading: expensesLoading } = useQuery<Expense[]>(
    ['expenses'],
    getExpenses,
    { enabled: !!auth().currentUser }
  );

  useFocusEffect(
    React.useCallback(() => {
      void queryClient.invalidateQueries(['family']);
      void queryClient.invalidateQueries(['categories']);
      void queryClient.invalidateQueries(['expenses']);
    }, [queryClient]),
  );

  useEffect(() => {
    void loadFilters();
    setIsLoading(false);
  }, [family]);

  const loadFilters = async () => {
    try {
      const filters = await AsyncStorage.getItem('budgetFilters');
      if (filters !== null) {
        const { category, timePeriod, sort, user } = JSON.parse(filters) as {
          category: string;
          timePeriod: string;
          sort: string;
          user: string;
        };
        setSelectedCategory(category);
        setSelectedTimePeriod(timePeriod);
        setSortBy(sort);
        setSelectedUser(user);
      }
    } catch (error) {
      console.error('Error loading filters:', error);
    }
  };

  const saveFilters = async () => {
    try {
      const filters = JSON.stringify({
        category: selectedCategory,
        timePeriod: selectedTimePeriod,
        sort: sortBy,
        user: selectedUser,
      });
      await AsyncStorage.setItem('budgetFilters', filters);
    } catch (error) {
      console.error('Error saving filters:', error);
    }
  };
  const updateExchangeRate = () => {
    const newRate = currency === 'EUR' ? 1 : currency === 'USD' ? 1.2 : 0.9;
    setExchangeRate(newRate);
  };
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        queryClient.invalidateQueries(['family']),
        queryClient.invalidateQueries(['categories']),
        queryClient.invalidateQueries(['expenses']),
      ]);
    } finally { // Ensure refreshing is set to false even if an error occurs
      setRefreshing(false);
    }
    updateExchangeRate();
  }, [queryClient, updateExchangeRate]);



  useEffect(() => {
    updateExchangeRate();
  }, [currency, updateExchangeRate]);

  const getCategoryColor = (categoryId: string): string => {
    const category = categories.find((c) => c.id === categoryId);
    return category?.color || '#000000';
  };

  const getCategoryName = (categoryId: string): string => {
    const category = categories.find((c) => c.id === categoryId);
    return category?.name || 'Unknown';
  };

  const filterExpenses = () => {
    let filteredExpenses = [...expenses];

    // Filter by category
    if (selectedCategory !== 'All') {
      filteredExpenses = filteredExpenses.filter(expense => expense.categoryId === selectedCategory);
    }

    // Filter by time period
    const now = new Date();
    switch (selectedTimePeriod) {
      case 'Week':
        filteredExpenses = filteredExpenses.filter(expense => {
          const expenseDate = new Date(expense.date);
          return expenseDate >= startOfWeek(now) && expenseDate <= now;
        });
        break;
      case 'Month':
        filteredExpenses = filteredExpenses.filter(expense => {
          const expenseDate = new Date(expense.date);
          return expenseDate >= startOfMonth(now) && expenseDate <= now;
        });
        break;
      case 'Year':
        filteredExpenses = filteredExpenses.filter(expense => {
          const expenseDate = new Date(expense.date);
          return expenseDate >= startOfYear(now) && expenseDate <= now;
        });
        break;
      // 'All' doesn't need filtering
    }

    // Filter by user
    if (selectedUser !== 'All') {
      filteredExpenses = filteredExpenses.filter(expense => expense.userId === selectedUser);
    }

    // Sort expenses
    switch (sortBy) {
      case 'date':
        filteredExpenses.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        break;
      case 'category':
        filteredExpenses.sort((a, b) => getCategoryName(a.categoryId).localeCompare(getCategoryName(b.categoryId)));
        break;
      case 'amount':
        filteredExpenses.sort((a, b) => b.amount - a.amount);
        break;
    }

    return filteredExpenses;
  };

  const chartData = filterExpenses().reduce<
    { name: string; population: number; color: string; legendFontColor: string; legendFontSize: number }[]>(
    (acc, expense) => {
      const categoryName = getCategoryName(expense.categoryId);
      const existingCategory = acc.find(item => item.name === categoryName);
      if (existingCategory) {
        existingCategory.population += expense.amount;
      } else {
        acc.push({
          name: categoryName,
          population: expense.amount,
          color: getCategoryColor(expense.categoryId),
          legendFontColor: '#7F7F7F',
          legendFontSize: 12,
        });
      }
      return acc;
    },
    [],
  );

  const ListHeaderComponent = () => (
    <View style={styles.headerContainer}>
      <View style={styles.tableRow}>
        <Text style={[styles.tableCell, styles.tableHeader]}>Date</Text>
        <Text style={[styles.tableCell, styles.tableHeader]}>Category</Text>
        <Text style={[styles.tableCell, styles.tableHeader]}>Amount</Text>
        <Text style={[styles.tableCell, styles.tableHeader]}>User</Text>
      </View>
    </View>
  );

  const renderItem = ({ item }: { item: Expense }) => {
    const member = family?.members.find(m => m.id === item.userId);
    const userName = member ? member.name : 'Unknown';

    return (
      <View style={styles.tableRow} key={item.id}>
        <Text style={styles.tableCell}>{format(new Date(item.date), 'dd/MM/yyyy')}</Text>
        <Text style={styles.tableCell}>{getCategoryName(item.categoryId)}</Text>
        <Text style={styles.tableCell}>
          {(item.amount * exchangeRate).toFixed(2)} {currency}
        </Text>
        <Text style={styles.tableCell}>{userName}</Text>
      </View>
    );
  };

  const getTotalCost = () => {
    return filterExpenses().reduce((sum, expense) => sum + expense.amount * exchangeRate, 0).toFixed(2);
  };

  if (familyLoading || categoriesLoading || expensesLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  const swipeGesture = Gesture.Pan()
    .onEnd((event) => {
      if (Math.abs(event.translationX) > 50) {
        runOnJS(router.push)('/(tabs)/home');
      }
    })
    .activeOffsetX([-10,10]);

  return (
    <GestureDetector gesture={swipeGesture}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Budget Overview</Text>
        <Text style={styles.totalCost}>Total: €{getTotalCost()}</Text>

        <View style={styles.chartContainer}>
          <PieChart
            data={chartData}
            width={Dimensions.get('window').width - 40}
            height={200}
            chartConfig={{
              color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
            }}
            accessor="population"
            backgroundColor="transparent"
            paddingLeft="15"
          />
        </View>

        <View style={styles.filtersContainer}>
          <View style={styles.filterRow}>
            <Picker
              selectedValue={selectedCategory}
              style={styles.picker}
              onValueChange={async (itemValue) => {
                setSelectedCategory(itemValue);
                await saveFilters(); // Save the selected filter
              }}
            >
              <Picker.Item label="All Categories" value="All" />
              {categories.map((category) => (
                <Picker.Item key={category.id} label={category.name} value={category.id} />
              ))}
            </Picker>
            <Picker
              selectedValue={selectedTimePeriod}
              style={styles.picker}
              onValueChange={async itemValue => {
                setSelectedTimePeriod(itemValue);
                await saveFilters();
              }}>
              <Picker.Item label="All Time" value="All" />
              <Picker.Item label="This Week" value="Week" />
              <Picker.Item label="This Month" value="Month" />
              <Picker.Item label="This Year" value="Year" />
            </Picker>
          </View>
          <View style={styles.filterRow}>
            <Picker
              selectedValue={sortBy}
              style={styles.picker}
              onValueChange={async itemValue => {
                setSortBy(itemValue);
                await saveFilters();
              }}>
              <Picker.Item label="Sort by Date" value="date" />
              <Picker.Item label="Sort by Category" value="category" />
              <Picker.Item label="Sort by Amount" value="amount" />
            </Picker>
            {family?.members && family.members.length > 0 && (
              <Picker
                selectedValue={selectedUser}
                style={styles.picker}
                onValueChange={async (itemValue) => {
                  setSelectedUser(itemValue);
                  await saveFilters();
                }}>
                <Picker.Item label="All Users" value="All" />
                {family.members.map((member) => (
                  <Picker.Item key={member.id || 'unknown'} label={member.name} value={member.id} />
                ))}
              </Picker>
            )}
          </View>
          <Picker selectedValue={currency} style={styles.picker} onValueChange={itemValue => setCurrency(itemValue)}>
            <Picker.Item label="EUR" value="EUR" />
            <Picker.Item label="USD" value="USD" />
            <Picker.Item label="GBP" value="GBP" />
          </Picker>
        </View>

        <View>
          <FlatList
            data={filterExpenses()}
            renderItem={renderItem}
            keyExtractor={item => item.id}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            ListHeaderComponent={ListHeaderComponent}
            stickyHeaderIndices={[0]}
          />
        </View>

        <Button onPress={() => router.back()} style={styles.backButton}>
          <ButtonText>Back</ButtonText>
        </Button>
      </ScrollView>
    </GestureDetector>
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
    marginBottom: 15,
    color: '#333',
  },
  chartContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  filtersContainer: {
    marginBottom: 10,
  },
  filterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  picker: {
    height: 55,
    width: '48%',
  },
  headerContainer: {
    backgroundColor: '#fff',
    paddingBottom: 10,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
    paddingVertical: 10,
  },
  tableCell: {
    flex: 1,
    textAlign: 'center',
  },
  tableHeader: {
    fontWeight: 'bold',
  },
  backButton: {
    marginTop: 20,
  },
  flatList: {
    height: 300,
  },
  totalCost: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 10,
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  flatListContent: {
    flexGrow: 1,
  },
});

export default BudgetOverview;


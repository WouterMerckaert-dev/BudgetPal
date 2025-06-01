import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';

const FAMILY_COLLECTION = 'families';
const USERS_COLLECTION = 'users';

export interface Expense {
  id: string
  amount: number
  categoryId: string
  date: string
  currency: string
  userId: string
  userName: string
}

interface Family {
  id: string;
  expenses: Expense[];
  // ... other family properties
}

export async function addExpense(expenseData: Omit<Expense, 'id'>): Promise<void> {
  const user = auth().currentUser;
  if (!user) throw new Error('User not authenticated');

  const userDoc = await firestore().collection(USERS_COLLECTION).doc(user.uid).get();
  const familyId = userDoc.data()?.familyId;

  if (!familyId) throw new Error('User does not belong to a family');

  const newExpense: Expense = {
    id: firestore().collection('expenses').doc().id, // Generate a new ID
    ...expenseData,
    userId: user.uid,
    userName: user.displayName || 'Unknown',
  };

  await firestore().collection(FAMILY_COLLECTION).doc(familyId).update({
    expenses: firestore.FieldValue.arrayUnion(newExpense)
  });
}

export async function updateExpense(updatedExpense: Expense): Promise<void> {
  const user = auth().currentUser;
  if (!user) throw new Error('User not authenticated');

  const userDoc = await firestore().collection(USERS_COLLECTION).doc(user.uid).get();
  const familyId = userDoc.data()?.familyId;

  if (!familyId) throw new Error('User does not belong to a family');

  const familyDoc = await firestore().collection(FAMILY_COLLECTION).doc(familyId).get();
  const familyData = familyDoc.data() as Family;

  const updatedExpenses = familyData.expenses.map(expense =>
    expense.id === updatedExpense.id ? updatedExpense : expense
  );

  await firestore().collection(FAMILY_COLLECTION).doc(familyId).update({
    expenses: updatedExpenses
  });
}

export async function deleteExpense(expenseId: string): Promise<void> {
  const user = auth().currentUser;
  if (!user) throw new Error('User not authenticated');

  const userDoc = await firestore().collection(USERS_COLLECTION).doc(user.uid).get();
  const familyId = userDoc.data()?.familyId;

  if (!familyId) throw new Error('User does not belong to a family');

  const familyDoc = await firestore().collection(FAMILY_COLLECTION).doc(familyId).get();
  const familyData = familyDoc.data() as Family;

  const updatedExpenses = familyData.expenses.filter(expense => expense.id !== expenseId);

  await firestore().collection(FAMILY_COLLECTION).doc(familyId).update({
    expenses: updatedExpenses
  });
}

export async function getExpenses(): Promise<Expense[]> {
  const user = auth().currentUser;
  if (!user) throw new Error('User not authenticated');

  const userDoc = await firestore().collection(USERS_COLLECTION).doc(user.uid).get();
  const familyId = userDoc.data()?.familyId;

  if (!familyId) throw new Error('User does not belong to a family');

  const familyDoc = await firestore().collection(FAMILY_COLLECTION).doc(familyId).get();
  const familyData = familyDoc.data();

  if (!familyData) throw new Error('Family not found');

  return familyData.expenses || [];
}


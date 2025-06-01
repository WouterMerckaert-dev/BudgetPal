import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';

const FAMILY_COLLECTION = 'families';
const USERS_COLLECTION = 'users';

export interface Category {
  id: string;
  name: string;
  color: string;
  userId: string;
}

export async function addCategory(name: string, color: string): Promise<void> {
  const user = auth().currentUser;
  if (!user) throw new Error('User not authenticated');

  const userDoc = await firestore().collection(USERS_COLLECTION).doc(user.uid).get();
  const familyId = userDoc.data()?.familyId;

  if (!familyId) throw new Error('User does not belong to a family');

  const newCategory: Category = {
    id: firestore().collection('categories').doc().id, // Generate a new ID
    name,
    color,
    userId: user.uid,
  };

  await firestore().collection(FAMILY_COLLECTION).doc(familyId).update({
    categories: firestore.FieldValue.arrayUnion(newCategory)
  });
}

export async function getCategories(): Promise<Category[]> {
  const user = auth().currentUser;
  if (!user) throw new Error('User not authenticated');

  const userDoc = await firestore().collection(USERS_COLLECTION).doc(user.uid).get();
  const familyId = userDoc.data()?.familyId;

  if (!familyId) throw new Error('User does not belong to a family');

  const familyDoc = await firestore().collection(FAMILY_COLLECTION).doc(familyId).get();
  const familyData = familyDoc.data();

  if (!familyData) throw new Error('Family not found');

  return familyData.categories || [];
}


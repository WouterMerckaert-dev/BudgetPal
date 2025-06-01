import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';

export interface FamilyMember {
  id: string;
  name: string;
  email: string;
}

export interface Invitation {
  id: string;
  fromUserId: string;
  fromUserName: string;
  toUserId: string;
  toUserName: string;
  status: 'pending' | 'accepted' | 'rejected';
}

export interface Family {
  id: string;
  members: FamilyMember[];
  expenses: any[];
  categories: any[];
  monthlyLimit: number | null;
  warningPercentage: number | null;
}

const FAMILY_COLLECTION = 'families';
const USERS_COLLECTION = 'users';
const INVITATIONS_COLLECTION = 'invitations';

export async function getFamily(userId: string): Promise<Family | null> {
  if (!userId) return null;

  const userDoc = await firestore().collection(USERS_COLLECTION).doc(userId).get();
  const familyId = userDoc.data()?.familyId;

  if (!familyId) {
    // Create a new family for the user if none exists
    const familyRef = firestore().collection(FAMILY_COLLECTION).doc();
    const newFamily: Family = {
      id: familyRef.id,
      members: [{
        id: userId,
        name: 'Unknown',
        email: 'Unknown'
      }],
      expenses: [],
      categories: [],
      monthlyLimit: 2000,
      warningPercentage: 20
    };

    await familyRef.set(newFamily);
    await firestore().collection(USERS_COLLECTION).doc(userId).update({
      familyId: familyRef.id
    });

    return newFamily;
  }

  const familyDoc = await firestore().collection(FAMILY_COLLECTION).doc(familyId).get();
  if (!familyDoc.exists) {
    throw new Error('Family document does not exist');
  }
  return { id: familyDoc.id, ...familyDoc.data() } as Family;
}

export async function getFamilyMembers(memberIds?: string | string[]): Promise<FamilyMember[]> {
  const currentUser = auth().currentUser;

  let targetUserIds: string[] = [];
  if (typeof memberIds === 'string') {
    targetUserIds = [memberIds];
  } else if (Array.isArray(memberIds)) {
    targetUserIds = memberIds;
  } else if (currentUser) {
    targetUserIds = [currentUser.uid];
  }

  if (targetUserIds.length === 0) {
    return [];
  }

  const memberPromises = targetUserIds.map(async (memberId) => {
    const memberDoc = await firestore().collection(USERS_COLLECTION).doc(memberId).get();
    const memberData = memberDoc.data();
    return {
      id: memberId,
      name: memberData?.name || 'Unknown',
      email: memberData?.email || 'Unknown',
    };
  });

  return Promise.all(memberPromises);
}

export async function searchUsers(query: string): Promise<FamilyMember[]> {
  console.log('Searching users with query:', query);

  const lowerQuery = query.toLowerCase();

  const usersSnapshot = await firestore()
    .collection(USERS_COLLECTION)
    .get();

  const results = usersSnapshot.docs
    .map(doc => ({
      id: doc.id,
      name: doc.data().name as string,
      email: doc.data().email as string,
      ...doc.data(),
    }))
    .filter(user =>
      (user.name?.toLowerCase().includes(lowerQuery) ||
        user.email?.toLowerCase().includes(lowerQuery))
    )
    .map(user => ({
      id: user.id,
      name: user.name || 'Unknown',
      email: user.email || 'Unknown',
    }));

  console.log('Search results:', results);
  return results;
}

export async function inviteFamilyMember(memberId: string): Promise<void> {
  const user = auth().currentUser;
  if (!user) throw new Error('User not authenticated');

  const [userDoc, memberDoc] = await Promise.all([
    firestore().collection(USERS_COLLECTION).doc(user.uid).get(),
    firestore().collection(USERS_COLLECTION).doc(memberId).get(),
  ]);

  const userData = userDoc.data();
  const memberData = memberDoc.data();

  await firestore().collection(INVITATIONS_COLLECTION).add({
    fromUserId: user.uid,
    fromUserName: userData?.name || user.email || 'Unknown',
    toUserId: memberId,
    toUserName: memberData?.name || memberData?.email || 'Unknown',
    status: 'pending',
  });
}

export async function acceptInvitation(invitationId: string): Promise<void> {
  const user = auth().currentUser;
  if (!user) throw new Error('User not authenticated');

  const invitationRef = firestore().collection(INVITATIONS_COLLECTION).doc(invitationId);
  const invitationDoc = await invitationRef.get();
  const invitationData = invitationDoc.data() as Invitation;

  if (!invitationData) {
    throw new Error('Invitation not found');
  }

  if (invitationData.toUserId !== user.uid) {
    throw new Error('Unauthorized');
  }

  try {
    await firestore().runTransaction(async (transaction) => {
      // Update invitation status
      transaction.update(invitationRef, { status: 'accepted' });

      // Get the inviting user's family
      const invitingUserDoc = await transaction.get(firestore().collection(USERS_COLLECTION).doc(invitationData.fromUserId));
      const invitingUserFamilyId = invitingUserDoc.data()?.familyId;

      if (!invitingUserFamilyId) {
        throw new Error('Inviting user does not have a family');
      }

      // Get the current user's family
      const currentUserDoc = await transaction.get(firestore().collection(USERS_COLLECTION).doc(user.uid));
      const currentUserFamilyId = currentUserDoc.data()?.familyId;

      if (currentUserFamilyId) {
        // Get the current user's family data
        const currentFamilyRef = firestore().collection(FAMILY_COLLECTION).doc(currentUserFamilyId);
        const currentFamilyDoc = await transaction.get(currentFamilyRef);
        const currentFamilyData = currentFamilyDoc.data() as Family;

        if (currentFamilyData) {
          // Transfer the user's data to the new family
          const newFamilyRef = firestore().collection(FAMILY_COLLECTION).doc(invitingUserFamilyId);
          const newFamilyDoc = await transaction.get(newFamilyRef);
          const newFamilyData = newFamilyDoc.data() as Family;

          if (newFamilyData) {
            // Merge expenses and categories
            const updatedExpenses = [...newFamilyData.expenses, ...currentFamilyData.expenses.filter(expense => expense.userId === user.uid)];
            const updatedCategories = [...newFamilyData.categories, ...currentFamilyData.categories.filter(category => category.userId === user.uid)];

            // Update the new family
            transaction.update(newFamilyRef, {
              expenses: updatedExpenses,
              categories: updatedCategories,
              members: [...newFamilyData.members, {
                id: user.uid,
                name: user.displayName || user.email || 'Unknown',
                email: user.email || 'Unknown'
              }]
            });

            // Update the user document with the new family's monthly limit and warning percentage
            transaction.update(firestore().collection(USERS_COLLECTION).doc(user.uid), {
              familyId: invitingUserFamilyId,
              monthlyLimit: newFamilyData.monthlyLimit,
              warningPercentage: newFamilyData.warningPercentage
            });

            // Remove the user from the old family
            transaction.update(currentFamilyRef, {
              members: firestore.FieldValue.arrayRemove(user.uid),
              expenses: currentFamilyData.expenses.filter(expense => expense.userId !== user.uid),
              categories: currentFamilyData.categories.filter(category => category.userId !== user.uid)
            });

            // If the user was the only member, delete the old family
            if (currentFamilyData.members.length === 1 && currentFamilyData.members[0].id === user.uid) {
              transaction.delete(currentFamilyRef);
            }
          }
        }
      }

      // Update the current user's familyId
      transaction.update(firestore().collection(USERS_COLLECTION).doc(user.uid), { familyId: invitingUserFamilyId });
    });
  } catch (error) {
    console.error('Error accepting invitation:', error);
    throw new Error('Failed to accept invitation');
  }
}

export async function updateFamilyMember(familyId: string, memberId: string, updates: Partial<FamilyMember>): Promise<void> {
  const familyRef = firestore().collection(FAMILY_COLLECTION).doc(familyId);

  await firestore().runTransaction(async (transaction) => {
    const familyDoc = await transaction.get(familyRef);
    const familyData = familyDoc.data() as Family;

    if (!familyData) throw new Error('Family not found');

    const updatedMembers = familyData.members.map(member =>
      member.id === memberId ? { ...member, ...updates } : member
    );

    transaction.update(familyRef, { members: updatedMembers });
  });
}

export async function rejectInvitation(invitationId: string): Promise<void> {
  const user = auth().currentUser;
  if (!user) throw new Error('User not authenticated');

  const invitationRef = firestore().collection(INVITATIONS_COLLECTION).doc(invitationId);
  const invitation = await invitationRef.get();
  const invitationData = invitation.data() as Invitation;

  if (invitationData.toUserId !== user.uid) {
    throw new Error('Unauthorized');
  }

  await invitationRef.update({ status: 'rejected' });
}

export async function getPendingInvitations(): Promise<Invitation[]> {
  const user = auth().currentUser;
  if (!user) throw new Error('User not authenticated');

  const invitationsSnapshot = await firestore()
    .collection(INVITATIONS_COLLECTION)
    .where('toUserId', '==', user.uid)
    .where('status', '==', 'pending')
    .get();

  return invitationsSnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  } as Invitation));
}

export async function getSentInvitations(): Promise<Invitation[]> {
  const user = auth().currentUser;
  if (!user) throw new Error('User not authenticated');

  const invitationsSnapshot = await firestore()
    .collection(INVITATIONS_COLLECTION)
    .where('fromUserId', '==', user.uid)
    .where('status', '==', 'pending')
    .get();

  return invitationsSnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  } as Invitation));
}

export async function removeFamilyMember(memberId: string): Promise<void> {
  const user = auth().currentUser;
  if (!user) throw new Error('User not authenticated');

  const batch = firestore().batch();

  // Get the current family
  const userDoc = await firestore().collection(USERS_COLLECTION).doc(user.uid).get();
  const familyId = userDoc.data()?.familyId;

  if (!familyId) throw new Error('User does not belong to a family');

  const familyRef = firestore().collection(FAMILY_COLLECTION).doc(familyId);
  const familyDoc = await familyRef.get();
  const familyData = familyDoc.data() as Family;

  if (!familyData) throw new Error('Family not found');

  // Get the member to be removed
  const memberToRemove = familyData.members.find(member => member.id === memberId);
  if (!memberToRemove) throw new Error('Member not found in the family');

  // Filter out the member's expenses
  const updatedExpenses = familyData.expenses.filter(expense => expense.userId !== memberId);

  // Keep categories used by other family members
  const categoriesUsedByOthers = new Set(
    familyData.expenses
      .filter(expense => expense.userId !== memberId)
      .map(expense => expense.categoryId)
  );

  const updatedCategories = familyData.categories.filter(category =>
    category.userId !== memberId || categoriesUsedByOthers.has(category.id)
  );

  // Update the existing family
  batch.update(familyRef, {
    members: firestore.FieldValue.arrayRemove(memberToRemove),
    expenses: updatedExpenses,
    categories: updatedCategories
  });

  // Create a new family for the removed member
  const newFamilyRef = firestore().collection(FAMILY_COLLECTION).doc();
  const memberExpenses = familyData.expenses.filter(expense => expense.userId === memberId);
  const memberCategories = familyData.categories.filter(category => category.userId === memberId);

  batch.set(newFamilyRef, {
    members: [{
      id: memberId,
      name: memberToRemove.name,
      email: memberToRemove.email
    }],
    expenses: memberExpenses,
    categories: memberCategories,
    monthlyLimit: null,
    warningPercentage: null
  });

  // Update the removed member's user document
  batch.update(firestore().collection(USERS_COLLECTION).doc(memberId), { familyId: newFamilyRef.id });

  await batch.commit();
}


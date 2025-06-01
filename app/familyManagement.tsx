import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, FlatList, StyleSheet, Alert, ScrollView } from 'react-native';
import { Button, ButtonText } from '@/components/ui/button';
import { useRouter } from 'expo-router';
import { searchUsers, inviteFamilyMember, removeFamilyMember, FamilyMember, getPendingInvitations, getSentInvitations, acceptInvitation, rejectInvitation, Invitation, Family } from '@/api/familyApi';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';

const FamilyManagement: React.FC = () => {
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<FamilyMember[]>([]);
  const [pendingInvitations, setPendingInvitations] = useState<Invitation[]>([]);
  const [sentInvitations, setSentInvitations] = useState<Invitation[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const router = useRouter();

  useEffect(() => {
    void loadFamilyMembers();
    void loadInvitations();
  }, []);

  const loadFamilyMembers = async () => {
    try {
      const user = auth().currentUser;
      if (!user) throw new Error('User not authenticated');

      const userDoc = await firestore().collection('users').doc(user.uid).get();
      const familyId = userDoc.data()?.familyId;

      if (!familyId) throw new Error('User does not belong to a family');

      const familyDoc = await firestore().collection('families').doc(familyId).get();
      const familyData = familyDoc.data() as Family;

      if (!familyData) throw new Error('Family not found');

      setFamilyMembers(familyData.members);
    } catch (error) {
      console.error('Error loading family members:', error);
      Alert.alert('Error', 'Failed to load family members');
    }
  };

  const loadInvitations = async () => {
    try {
      const pending = await getPendingInvitations();
      const sent = await getSentInvitations();
      setPendingInvitations(pending);
      setSentInvitations(sent);
    } catch (error) {
      console.error('Error loading invitations:', error);
      Alert.alert('Error', 'Failed to load invitations');
    }
  };

  const handleSearch = async () => {
    setHasSearched(true);
    if (searchQuery.trim() === '') {
      setSearchResults([]);
      return;
    }
    try {
      console.log('Searching for:', searchQuery);
      const results = await searchUsers(searchQuery);
      console.log('Search results:', results);
      setSearchResults(results);
    } catch (error) {
      console.error('Error searching users:', error);
      Alert.alert('Error', 'Failed to search users');
    }
  };

  const handleInviteFamilyMember = async (member: FamilyMember) => {
    try {
      await inviteFamilyMember(member.id);
      setSearchResults([]);
      setSearchQuery('');
      setHasSearched(false);
      Alert.alert('Success', 'Invitation sent successfully');
      await loadInvitations();
    } catch (error) {
      console.error('Error inviting family member:', error);
      Alert.alert('Error', 'Failed to invite family member');
    }
  };

  const handleRemoveFamilyMember = async (id: string) => {
    try {
      await removeFamilyMember(id);
      setFamilyMembers(familyMembers.filter(member => member.id !== id));
    } catch (error) {
      console.error('Error removing family member:', error);
      Alert.alert('Error', 'Failed to remove family member');
    }
  };

  const handleAcceptInvitation = async (invitationId: string) => {
    try {
      await acceptInvitation(invitationId);
      Alert.alert('Success', 'Invitation accepted');
      await loadFamilyMembers(); // Reload family members
      await loadInvitations();
    } catch (error) {
      console.error('Error accepting invitation:', error);
      Alert.alert('Error', 'Failed to accept invitation');
    }
  };

  const handleRejectInvitation = async (invitationId: string) => {
    try {
      await rejectInvitation(invitationId);
      Alert.alert('Success', 'Invitation rejected');
      await loadInvitations();
    } catch (error) {
      console.error('Error rejecting invitation:', error);
      Alert.alert('Error', 'Failed to reject invitation');
    }
  };

  const renderSearchResults = () => {
    if (!hasSearched) {
      return null;
    }

    if (searchResults.length === 0) {
      return (
        <View style={styles.noResultsContainer}>
          <Text style={styles.noResultsText}>
            Geen gebruikers gevonden voor de zoekterm "{searchQuery}"
          </Text>
        </View>
      );
    }

    return (
      <View>
        <Text style={styles.sectionTitle}>Zoekresultaten</Text>
        <FlatList
          data={searchResults}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.listItem}>
              <Text>{item.name}</Text>
              <Button onPress={() => handleInviteFamilyMember(item)}>
                <ButtonText>Uitnodigen</ButtonText>
              </Button>
            </View>
          )}
        />
      </View>
    );
  };

  const renderFamilyMember = ({ item }: { item: FamilyMember }) => {
    const currentUser = auth().currentUser;
    const isCurrentUser = currentUser && item.id === currentUser.uid;

    return (
      <View style={styles.listItem}>
        <Text>{item.name}</Text>
        <Button
          onPress={() => handleRemoveFamilyMember(item.id)}
          disabled={isCurrentUser}
          style={isCurrentUser ? styles.disabledButton : undefined}
        >
          <ButtonText>Verwijderen</ButtonText>
        </Button>
      </View>
    );
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Gezinsbeheer</Text>

      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Zoek op naam of e-mail"
          value={searchQuery}
          onChangeText={setSearchQuery}
          onSubmitEditing={handleSearch}
        />
        <Button onPress={handleSearch}>
          <ButtonText>Zoek</ButtonText>
        </Button>
      </View>

      {renderSearchResults()}

      <Text style={styles.sectionTitle}>Gezinsleden</Text>
      <FlatList
        data={familyMembers}
        keyExtractor={(item) => item.id}
        renderItem={renderFamilyMember}
      />

      <Text style={styles.sectionTitle}>Ontvangen Uitnodigingen</Text>
      <FlatList
        data={pendingInvitations}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.listItem}>
            <Text>Van: {item.fromUserName}</Text>
            <View style={styles.buttonContainer}>
              <Button onPress={() => handleAcceptInvitation(item.id)}>
                <ButtonText>Accepteren</ButtonText>
              </Button>
              <Button onPress={() => handleRejectInvitation(item.id)}>
                <ButtonText>Weigeren</ButtonText>
              </Button>
            </View>
          </View>
        )}
      />

      <Text style={styles.sectionTitle}>Verstuurde Uitnodigingen</Text>
      <FlatList
        data={sentInvitations}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.listItem}>
            <Text>Naar: {item.toUserName}</Text>
            <Text>Status: In afwachting</Text>
          </View>
        )}
      />

      <Button onPress={() => router.back()} style={styles.backButton}>
        <ButtonText>Terug</ButtonText>
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
  searchContainer: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  searchInput: {
    flex: 1,
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    padding: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 10,
  },
  listItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  backButton: {
    marginTop: 20,
  },
  noResultsContainer: {
    padding: 20,
    alignItems: 'center',
  },
  noResultsText: {
    color: '#666',
    fontSize: 16,
  },
  disabledButton: {
    opacity: 0.5,
  },
});

export default FamilyManagement;


import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import { Button, ButtonText } from '@/components/ui/button';
import { useSignOut } from '@/api/auth';
import * as LocalAuthentication from 'expo-local-authentication';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import { getFamily, updateFamilyMember } from '@/api/familyApi';
import AsyncStorage from '@react-native-async-storage/async-storage';

const AccountManagement: React.FC = () => {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { mutateAsync: signOut } = useSignOut();
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const user = auth().currentUser;
    if (user) {
      setEmail(user.email || '');
      firestore().collection('users').doc(user.uid).get()
        .then((doc) => {
          if (doc.exists) {
            setName(doc.data()?.name || '');
          }
        })
        .catch((error) => {
          console.error("Error fetching user data:", error);
        });
    }
  }, []);

  const handleSave = async () => {
    const user = auth().currentUser;
    if (user) {
      try {
        // Update user document
        await firestore().collection('users').doc(user.uid).set({
          name: name,
        }, { merge: true });

        // Update family member
        const family = await getFamily(user.uid);
        if (family) {
          await updateFamilyMember(family.id, user.uid, { name: name });
        }

        if (password) {
          await user.updatePassword(password);
        }
        showSuccessMessage();
      } catch (error) {
        console.error('Error updating profile:', error);
        alert('Failed to update profile. Please try again.');
      }
    }
  };

  const handleLogout = async () => {
    try {
      await signOut();
      router.push('/login/login');
    } catch (error) {
      console.error('Error during logout:', error);
    }
  };

  const handleBiometricAuth = async () => {
    const compatible = await LocalAuthentication.hasHardwareAsync();
    if (!compatible) {
      alert('Biometrische authenticatie is niet beschikbaar op dit apparaat.');
      return;
    }

    const enrolled = await LocalAuthentication.isEnrolledAsync();
    if (!enrolled) {
      alert('Biometrische authenticatie is niet ingesteld op dit apparaat.');
      return;
    }

    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Verifieer om biometrische login in te stellen',
    });

    if (result.success) {
      // Sla een vlag op dat biometrische login is ingeschakeld
      await AsyncStorage.setItem('biometricLoginEnabled', 'true');
      alert('Biometrische login is succesvol ingesteld!');
    } else {
      alert('Biometrische authenticatie mislukt. Probeer opnieuw.');
    }
  };

  const showSuccessMessage = () => {
    Animated.sequence([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.delay(2000),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Accountbeheer</Text>

      <TextInput
        style={styles.input}
        value={name}
        onChangeText={setName}
        placeholder="Naam"
      />
      <TextInput
        style={styles.input}
        value={email}
        onChangeText={setEmail}
        placeholder="E-mail"
        keyboardType="email-address"
        editable={false}
      />
      <TextInput
        style={styles.input}
        value={password}
        onChangeText={setPassword}
        placeholder="Nieuw wachtwoord"
        secureTextEntry
      />

      <Button onPress={handleSave} style={styles.button}>
        <ButtonText>Opslaan</ButtonText>
      </Button>

      <Button onPress={handleBiometricAuth} style={styles.button}>
        <ButtonText>Biometrische verificatie instellen</ButtonText>
      </Button>

      <Animated.View style={[styles.successMessage, { opacity: fadeAnim }]}>
        <Text style={styles.successText}>Profiel succesvol bijgewerkt!</Text>
      </Animated.View>

      <Button onPress={handleLogout} style={[styles.button, styles.logoutButton]}>
        <ButtonText>Uitloggen</ButtonText>
      </Button>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  input: {
    height: 40,
    borderColor: 'gray',
    borderWidth: 1,
    marginBottom: 10,
    paddingHorizontal: 10,
    borderRadius: 5,
  },
  button: {
    marginBottom: 10,
  },
  logoutButton: {
    backgroundColor: '#FF3B30',
  },
  successMessage: {
    backgroundColor: 'green',
    padding: 10,
    borderRadius: 5,
    marginTop: 10,
  },
  successText: {
    color: 'white',
    textAlign: 'center',
  },
});

export default AccountManagement;


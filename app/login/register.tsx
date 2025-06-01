import React, { useState } from 'react';
import { View, ScrollView, Text, TextInput, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Button, ButtonText } from '@/components/ui/button';
import { useSignUp } from '@/api/auth'; // Importeer de nieuwe hook

export default function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [username, setUsername] = useState(''); // Added username state
  const router = useRouter();

  const { mutate: signUp } = useSignUp();

  const handleRegister = () => {
    if (password !== confirmPassword) {
      Alert.alert('Fout', 'Wachtwoorden komen niet overeen');
      return;
    }

    signUp(
      { email, password, username }, // Added username to the signup data
      {
        onSuccess: () => {
          Alert.alert('Succes', 'Registratie succesvol! Je kunt nu inloggen.', [
            { text: 'OK', onPress: () => router.push("/(tabs)/home") },
          ]);
        },
        onError: (error) => {
          console.error('Error during registration:', error);
          Alert.alert('Fout', 'Er is een probleem opgetreden. Probeer het later opnieuw.');
        },
      }
    );
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.form}>
        <Text style={styles.title}>Registreren</Text>
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Gebruikersnaam</Text>
          <TextInput
            style={styles.input}
            placeholder="Voer je gebruikersnaam in"
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
          />
        </View>
        <View style={styles.inputContainer}>
          <Text style={styles.label}>E-mail</Text>
          <TextInput
            style={styles.input}
            placeholder="Voer je e-mailadres in"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Wachtwoord</Text>
          <TextInput
            style={styles.input}
            placeholder="Voer je wachtwoord in"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
        </View>
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Bevestig wachtwoord</Text>
          <TextInput
            style={styles.input}
            placeholder="Bevestig je wachtwoord"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
          />
        </View>
        <Button style={styles.button} onPress={handleRegister}>
          <ButtonText style={styles.buttonText}>Registreren</ButtonText>
        </Button>
        <Text style={styles.loginText}>
          Heb je al een account?{' '}
          <Text style={styles.loginLink} onPress={() => router.push('/login/login')}>
            Log in
          </Text>
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  form: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  inputContainer: {
    marginBottom: 15,
  },
  label: {
    fontSize: 16,
    marginBottom: 5,
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 10,
    fontSize: 16,
    borderRadius: 6,
  },
  button: {
    backgroundColor: '#007AFF',
    borderRadius: 6,
    alignItems: 'center',
    marginBottom: 10,
    marginTop: 10,

  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  loginText: {
    marginTop: 20,
    textAlign: 'center',
  },
  loginLink: {
    color: '#007AFF',
    fontWeight: 'bold',
  },
});


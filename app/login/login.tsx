import React, { FunctionComponent, useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, Alert, Animated } from 'react-native';
import { Button, ButtonText } from '@/components/ui/button';
import { Link, LinkText } from '@/components/ui/link';
import { Redirect, useRouter } from 'expo-router';
import { AuthProvider, useSignIn } from '@/api/auth';
import useUser from '@/hooks/useUser';
import * as LocalAuthentication from 'expo-local-authentication';
import AsyncStorage from '@react-native-async-storage/async-storage';

const Login: FunctionComponent = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { mutate: signInWithSocialAuth } = useSignIn();
  const user = useUser();
  const router = useRouter();
  const [fadeAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: true,
    }).start();
  }, []);

  if (user) {
    return <Redirect href="/" />;
  }

  const handleEmailLogin = () => {
    if (!email || !password) {
      Alert.alert('Fout', 'Vul alle velden in.');
      return;
    }

    signInWithSocialAuth(
      { provider: AuthProvider.EMAIL_PASSWORD, email, password },
      {
        onSuccess: () => {
          Alert.alert('Succes', `Welkom terug, ${email}!`);
          router.push('/'); // Redirect naar de homepagina na succesvolle login
        },
        onError: (error) => {
          console.error('Login fout:', error);
          Alert.alert('Fout', 'Er is een probleem opgetreden. Controleer je e-mail en wachtwoord en probeer het opnieuw.');
        },
      }
    );
  };

  const handleBiometricAuth = async () => {
    const biometricLoginEnabled = await AsyncStorage.getItem('biometricLoginEnabled');
    if (biometricLoginEnabled !== 'true') {
      Alert.alert('Fout', 'Biometrische login is niet ingeschakeld. Schakel het eerst in via de accountbeheer pagina.');
      return;
    }

    const compatible = await LocalAuthentication.hasHardwareAsync();
    if (!compatible) {
      Alert.alert('Fout', 'Biometrische authenticatie is niet beschikbaar op dit apparaat.');
      return;
    }

    const enrolled = await LocalAuthentication.isEnrolledAsync();
    if (!enrolled) {
      Alert.alert('Fout', 'Biometrische authenticatie is niet ingesteld op dit apparaat.');
      return;
    }

    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Log in met biometrie',
    });

    if (result.success) {
      // Hier voeren we de biometrische login uit
      signInWithSocialAuth(
        { provider: AuthProvider.BIOMETRIC },
        {
          onSuccess: () => {
            Alert.alert('Succes', 'Biometrische login geslaagd!');
            router.push('/');
          },
          onError: (error) => {
            console.error('Biometrische login fout:', error);
            Alert.alert('Fout', 'Biometrische login mislukt. Probeer opnieuw of gebruik e-mail en wachtwoord.');
          },
        }
      );
    } else {
      Alert.alert('Fout', 'Biometrische authenticatie mislukt. Probeer opnieuw of gebruik e-mail en wachtwoord.');
    }
  };

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <Text style={styles.title}>Login</Text>

      <TextInput
        style={styles.input}
        placeholder="Email"
        placeholderTextColor="#999"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />

      <TextInput
        style={styles.input}
        placeholder="Wachtwoord"
        placeholderTextColor="#999"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      <Button onPress={handleEmailLogin} style={styles.button}>
        <ButtonText style={styles.buttonText}>Inloggen</ButtonText>
      </Button>

      <Button onPress={handleBiometricAuth} style={styles.button}>
        <ButtonText style={styles.buttonText}>Biometrische login</ButtonText>
      </Button>

      <Button variant="outline" style={styles.button} onPress={() => signInWithSocialAuth({ provider: AuthProvider.GOOGLE })}>
        <ButtonText style={styles.buttonText}>Sign in with Google</ButtonText>
      </Button>

      {/* Navigate to Register screen */}
      <Button style={styles.button} onPress={() => router.push('/login/register')}>
        <ButtonText>Registreren</ButtonText>
      </Button>

      <Button onPress={() => console.log('Reset password')} variant="link" style={styles.forgotPasswordButton}>
        <ButtonText style={styles.forgotPasswordText}>Wachtwoord vergeten?</ButtonText>
      </Button>

    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#333',
    marginBottom: 30,
  },
  input: {
    backgroundColor: '#fff',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    fontSize: 16,
    marginBottom: 15,
  },
  button: {
    backgroundColor: '#007BFF',
    borderRadius: 8,
    marginTop: 10,
    marginBottom: 10,
  },
  buttonText: {
    color: '#ffffff',
    textAlign: 'center',
  },
  linkContainer: {
    alignItems: 'center',
    marginTop: 10,
  },
  forgotPasswordButton: {
    marginTop: 15,
  },
  forgotPasswordText: {
    color: '#007AFF',
    fontSize: 14,
  },
});

export default Login;


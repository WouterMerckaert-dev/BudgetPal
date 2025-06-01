import { useMutation, UseMutationResult, useQuery, useQueryClient } from '@tanstack/react-query';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { AuthCredential, User } from '@/models/firebaseTypes';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

export function useSignOut(): UseMutationResult<void, Error, void, void> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: signOut,
    onSettled: () => queryClient.invalidateQueries(['currentUser']),
  });
}

export function useSignIn(): UseMutationResult<User | null, Error, SignInParams, void> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: signIn,
    onSettled: () => queryClient.invalidateQueries(['currentUser']),
  });
}

export function useSignUp(): UseMutationResult<User | null, Error, SignUpParams, void> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: signUp,
    onSettled: () => queryClient.invalidateQueries(['currentUser']),
  });
}

export function useGetCurrentUser() {
  return useQuery({
    queryKey: ['currentUser'],
    queryFn: getCurrentUser,
    cacheTime: Infinity,
    staleTime: Infinity,
  });
}

export enum AuthProvider {
  GOOGLE = 'google.com',
  EMAIL_PASSWORD = 'email-password',
  BIOMETRIC = 'biometric',
}

type SignInParams =
  | { provider: AuthProvider.GOOGLE }
  | { provider: AuthProvider.EMAIL_PASSWORD; email: string; password: string }
  | { provider: AuthProvider.BIOMETRIC };

type SignUpParams = { email: string; password: string; username: string };

async function signIn(params: SignInParams): Promise<User | null> {
  if (params.provider === AuthProvider.GOOGLE) {
    const credential = await createGoogleCredential();
    if (!credential) return null;

    const userCredential = await auth().signInWithCredential(credential);
    const user = userCredential.user;

    // Check if the user already has a family
    const userDoc = await firestore().collection('users').doc(user.uid).get();
    if (!userDoc.exists || !userDoc.data()?.familyId) {
      await createFamilyForUser(user, user.displayName|| "Unknown");
    }

    return user;
  }
  else if (params.provider === AuthProvider.EMAIL_PASSWORD) {
    if (!params.email || !params.password) {
      throw new Error('Email and password are required');
    }
    try {
      const userCredential = await auth().signInWithEmailAndPassword(params.email, params.password);
      // Sla de inloggegevens op voor toekomstige biometrische login
      await AsyncStorage.setItem('lastLoggedInUser', JSON.stringify({ email: params.email, password: params.password }));
      return userCredential.user;
    } catch (error) {
      console.error('Error during email/password sign-in:', error);
      throw error;
    }
  }
  else if (params.provider === AuthProvider.BIOMETRIC) {
    // Implementeer hier de biometrische login logica
    const currentUser = auth().currentUser;
    if (currentUser) {
      // Als er al een ingelogde gebruiker is, gebruik die
      return currentUser;
    } else {
      // Anders proberen we de laatst ingelogde gebruiker op te halen
      const lastLoggedInUser = await AsyncStorage.getItem('lastLoggedInUser');
      if (lastLoggedInUser) {
        const { email, password } = JSON.parse(lastLoggedInUser);
        const userCredential = await auth().signInWithEmailAndPassword(email, password);
        return userCredential.user;
      } else {
        throw new Error('Geen gebruiker gevonden voor biometrische login');
      }
    }
  } else {
    throw new Error('Invalid provider');
  }
}

async function signUp(params: SignUpParams): Promise<User | null> {
  if (!params.email || !params.password || !params.username) {
    throw new Error('Email, password, and username are required');
  }

  try {
    const userCredential = await auth().createUserWithEmailAndPassword(params.email, params.password);
    const user = userCredential.user;

    // Update the user's display name
    await user.updateProfile({
      displayName: params.username
    });

    // Create a new family for the user
    await createFamilyForUser(user, params.username);

    return user;
  } catch (error) {
    console.error('Error during email/password sign-up:', error);
    throw error;
  }
}

async function createFamilyForUser(user: User, username: string): Promise<void> {
  const familyRef = firestore().collection('families').doc();
  await familyRef.set({
    members: [{
      id: user.uid,
      name: username,
      email: user.email || 'Unknown'
    }],
    expenses: [],
    categories: [],
    monthlyLimit: 2000,
    warningPercentage: 20
  });

  await firestore().collection('users').doc(user.uid).set({
    familyId: familyRef.id,
    name: username
  });
}

async function signOut(): Promise<void> {
  try {
    const user = auth().currentUser;
    if (!user) {
      console.log('No user found during signOut');
      return;
    }

    const provider = user.providerData[0]?.providerId;

    // Always sign out from Firebase first
    await auth().signOut();

    // Then handle provider-specific signout
    if (provider === AuthProvider.GOOGLE.toString()) {
      await GoogleSignin.signOut();
    }
  } catch (error) {
    console.error('Error during sign out:', error);
    throw error;
  }
}

GoogleSignin.configure({ webClientId: process.env.EXPO_PUBLIC_WEB_CLIENT_ID });

async function createGoogleCredential(): Promise<AuthCredential | null> {
  await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

  const signInResult = await GoogleSignin.signIn();
  const idToken = signInResult.data?.idToken;

  if (!idToken) {
    throw new Error('No ID token found');
  }

  return auth.GoogleAuthProvider.credential(idToken);
}

export function getCurrentUser(): User | null {
  return auth().currentUser;
}


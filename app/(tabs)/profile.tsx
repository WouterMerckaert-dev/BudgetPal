import React, { useState } from 'react';
import { View, Text, StyleSheet, Switch } from 'react-native';
import { useRouter } from 'expo-router';
import { Button, ButtonText } from '@/components/ui/button';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useSignOut } from '@/api/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { runOnJS } from 'react-native-reanimated';

const Profile: React.FC = () => {
  const router = useRouter();
  const [isNotificationsEnabled, setNotificationsEnabled] = useState(true);
  const { mutateAsync: signOut } = useSignOut();

  const toggleSwitch = async () => {
    const newValue = !isNotificationsEnabled;
    setNotificationsEnabled(newValue);
    await AsyncStorage.setItem('notificationsEnabled', JSON.stringify(newValue));
  };

  const handleLogout = async () => {
    try {
      await signOut();
      router.push('/login/login');
    } catch (error) {
      console.error('Error during logout:', error);
    }
  };

  const swipeGesture = Gesture.Pan()
    .onEnd((event) => {
      if (Math.abs(event.translationX) > 50) {
        runOnJS(router.push)('/(tabs)/home');
      }
    })
    .activeOffsetX([-10,10]);

  return (
    <GestureDetector gesture={swipeGesture}>
      <View style={styles.container}>
        <Text style={styles.title}>Instellingen</Text>

        <View style={styles.settingItem}>
          <Text style={styles.settingText}>Notificaties</Text>
          <Switch
            trackColor={{ false: "#767577", true: "#81b0ff" }}
            thumbColor={isNotificationsEnabled ? "#f5dd4b" : "#f4f3f4"}
            value={isNotificationsEnabled}
            onValueChange={toggleSwitch}
          />
        </View>

        <View style={styles.settings}>
          <Text style={styles.linkItem} onPress={() => router.push('/budgetLimit')}>
            Budgetlimiet instellen
          </Text>
          <Text style={styles.linkItem} onPress={() => router.push('/familyManagement')}>
            Gezinsbeheer
          </Text>
          <Text style={styles.linkItem} onPress={() => router.push('/AccountManagement')}>
            Accountbeheer
          </Text>
          <Text style={styles.linkItem} onPress={handleLogout}>
            Logout
          </Text>
        </View>

        <Button onPress={() => router.back()}>
          <ButtonText>Terug</ButtonText>
        </Button>
      </View>
    </GestureDetector>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 20,
  },
  title: {
    fontSize: 20,
    marginBottom: 15,
    fontWeight: 'bold',
  },
  settings: {
    marginBottom: 20,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  settingText: {
    fontSize: 16,
    color: '#333',
  },
  linkItem: {
    fontSize: 16,
    color: '#007BFF',
    marginBottom: 10,
  },
});

export default Profile;


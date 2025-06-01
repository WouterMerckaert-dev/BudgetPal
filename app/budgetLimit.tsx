import React, {useEffect, useState} from 'react'
import {StyleSheet, Text, TextInput, View} from 'react-native'
import {Button, ButtonText} from '@/components/ui/button'
import {useRouter} from 'expo-router'
import { SchedulableTriggerInputTypes } from 'expo-notifications';
import Slider from '@react-native-community/slider'
import firestore from '@react-native-firebase/firestore'
import auth from '@react-native-firebase/auth'
import * as Notifications from 'expo-notifications'
import AsyncStorage from '@react-native-async-storage/async-storage';

const BudgetLimit: React.FC = () => {
  const [monthlyLimit, setMonthlyLimit] = useState('2000')
  const [warningPercentage, setWarningPercentage] = useState(20)
  const router = useRouter()

  useEffect(() => {
    const user = auth().currentUser
    if (user) {
      console.log('Fetching user data for UID:', user.uid);
      firestore()
        .collection('users')
        .doc(user.uid)
        .get()
        .then(doc => {
          console.log('Firestore document exists:', doc.exists);
          if (doc.exists) {
            const data = doc.data();
            console.log('Firestore document data:', data);
            if (data && data.monthlyLimit) {
              console.log('Setting monthly limit to:', data.monthlyLimit);
              setMonthlyLimit(data.monthlyLimit.toString())
              setWarningPercentage(data.warningPercentage ?? 20)
            } else {
              console.log('No monthly limit found in document');
            }
          } else {
            console.log('User document does not exist');
          }
        })
        .catch(error => {
          console.error('Error fetching budget data:', error)
        })
    } else {
      console.log('No authenticated user found');
    }
  }, [])

  const handleSave = async () => {
    const user = auth().currentUser;
    if (user) {
      try {
        const parsedMonthlyLimit = parseFloat(monthlyLimit);
        console.log('Saving budget limit:', parsedMonthlyLimit);

        // Update the user document
        await firestore().collection('users').doc(user.uid).set({
          monthlyLimit: parsedMonthlyLimit,
          warningPercentage: warningPercentage,
        }, { merge: true });

        // Update the family document
        const userDoc = await firestore().collection('users').doc(user.uid).get();
        const familyId = userDoc.data()?.familyId;

        if (familyId) {
          await firestore().collection('families').doc(familyId).update({
            monthlyLimit: parsedMonthlyLimit,
            warningPercentage: warningPercentage,
          });
        }

        console.log('Budget limit saved successfully');

        // Schedule notification
        const notificationsEnabled = await AsyncStorage.getItem('notificationsEnabled');
        if (notificationsEnabled === 'true') {
          await Notifications.scheduleNotificationAsync({
            content: {
              title: "Budget Limit Warning",
              body: `You've reached ${warningPercentage}% of your monthly budget limit of €${parsedMonthlyLimit}.`,
            },
            trigger: {
              type: SchedulableTriggerInputTypes.TIME_INTERVAL,
              seconds: 60 * 60 * 24, // Check daily
              repeats: true,
            },
          });
        }

        alert('Budget limit saved successfully!')
        router.back()
      } catch (error) {
        console.error('Error saving budget limit:', error)
        alert('Failed to save budget limit. Please try again.')
      }
    } else {
      console.log('No authenticated user found when trying to save');
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Budgetlimiet Instellen</Text>

      <Text style={styles.label}>Maandelijks Budgetlimiet</Text>
      <TextInput
        style={styles.input}
        value={monthlyLimit}
        onChangeText={(value: string) => setMonthlyLimit(value)}
        keyboardType="numeric"
        placeholder="Voer bedrag in"
      />

      <Text style={styles.label}>Waarschuwing bij resterend percentage</Text>
      <Slider
        style={styles.slider}
        minimumValue={0}
        maximumValue={100}
        step={1}
        value={warningPercentage}
        onValueChange={(value: number) => setWarningPercentage(value)}
      />
      <Text style={styles.percentageText}>{warningPercentage}%</Text>

      <Text style={styles.description}>
        Je krijgt een melding wanneer je resterende budget {warningPercentage}% of minder is van je maandelijkse limiet.
      </Text>

      <Button onPress={handleSave} style={styles.saveButton}>
        <ButtonText>Opslaan</ButtonText>
      </Button>

      <Button onPress={() => router.back()} style={styles.backButton}>
        <ButtonText>Terug</ButtonText>
      </Button>
    </View>
  )
}

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
  label: {
    fontSize: 16,
    marginBottom: 5,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    padding: 10,
    marginBottom: 20,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  percentageText: {
    textAlign: 'center',
    marginBottom: 10,
  },
  description: {
    marginBottom: 20,
  },
  saveButton: {
    marginBottom: 10,
  },
  backButton: {
    backgroundColor: '#ccc',
  },
})

export default BudgetLimit


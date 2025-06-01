import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Linking, Alert, Modal, TextInput } from 'react-native';
import { Camera, useCameraDevice, useCameraPermission } from 'react-native-vision-camera';
import { Button, ButtonText, ButtonIcon } from '@/components/ui/button';
import { useRouter } from 'expo-router';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { SwitchCamera } from 'lucide-react-native';
import { addExpense } from '@/api/expenseApi';
import { useQueryClient } from '@tanstack/react-query';
import {
  AlertDialog,
  AlertDialogBackdrop,
  AlertDialogBody,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
} from '@/components/ui/alert-dialog';
import { Heading } from '@/components/ui/heading';
import { Picker } from '@react-native-picker/picker';
import { addCategory, getCategories, Category } from '@/api/categoryApi';
import auth from '@react-native-firebase/auth';
import ColorPicker from 'react-native-wheel-color-picker';
import { runOnJS } from 'react-native-reanimated';

interface NoPermissionDialogProps {
  onCancel?: () => void;
  isOpen?: boolean;
}

const NoPermissionDialog: React.FC<NoPermissionDialogProps> = ({ onCancel, isOpen }) => {
  return (
    <AlertDialog isOpen={isOpen} size="md">
      <AlertDialogBackdrop />
      <AlertDialogContent>
        <AlertDialogHeader>
          <Heading className="text-typography-950 font-semibold" size="md">
            Geen toestemming om camera te gebruiken
          </Heading>
        </AlertDialogHeader>
        <AlertDialogBody className="mt-3 mb-4">
          <Text>
            We hebben toestemming nodig om de camera te gebruiken, anders kan de app niet functioneren. Geef ons alstublieft toestemming en probeer het opnieuw.
          </Text>
        </AlertDialogBody>
        <AlertDialogFooter>
          <Button variant="outline" action="secondary" onPress={onCancel} size="sm">
            <ButtonText>Annuleren</ButtonText>
          </Button>
          <Button size="sm" onPress={() => Linking.openSettings()}>
            <ButtonText>Toestemming geven</ButtonText>
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

const Scanner: React.FC = () => {
  const [showCamera, setShowCamera] = useState(false);
  const [cameraType, setCameraType] = useState<'front' | 'back'>('back');
  const router = useRouter();
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const queryClient = useQueryClient();

  const { hasPermission, requestPermission } = useCameraPermission();
  const [haveRequestedCameraPermission, setHaveRequestedCameraPermission] = useState<boolean>(false);

  const [activeCamera, setActiveCamera] = useState<'front' | 'back'>(cameraType);
  const cameraDevice = useCameraDevice(activeCamera);
  const [scanned, setScanned] = useState(false);
  const [scannedData, setScannedData] = useState<string | null>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryColor, setNewCategoryColor] = useState('#000000');
  const [creatingCategory, setCreatingCategory] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [processing, setProcessing] = useState(false);
  const cameraRef = useRef<Camera>(null);

  useEffect(() => {
    const checkPermission = async () => {
      const permission = await requestPermission();
      setHaveRequestedCameraPermission(true);
      setShowCamera(permission);
      if (!permission) {
        Alert.alert(
          "Camera Toestemming",
          "We hebben toestemming nodig om de camera te gebruiken. Ga naar de app-instellingen om dit te wijzigen.",
          [
            { text: "Annuleren", style: "cancel" },
            { text: "Open Instellingen", onPress: () => Linking.openSettings() }
          ]
        );
      }
    };

    checkPermission();

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();

    const fetchCategories = async () => {
      try {
        const fetchedCategories = await getCategories();
        setCategories(fetchedCategories);
      } catch (error) {
        console.error('Error fetching categories:', error);
      }
    };
    fetchCategories();

    return () => {
      setShowCamera(false);
    };
  }, []);

  const swipeGesture = Gesture.Pan()
    .onEnd((event) => {
      if (Math.abs(event.translationX) > 50) {
        runOnJS(router.push)('/(tabs)/home');
      }
    })
    .activeOffsetX([-10,10]);

  const handleTakePhoto = async () => {
    setProcessing(true);
    if (cameraRef.current) {
      try {
        const photo = await cameraRef.current.takePhoto();
        console.log('Photo taken:', photo);

        // Dummy QR code data (replace with actual QR code processing logic)
        const extractedData = {
          amount: (Math.random() * (50 - 0.05) + 0.05),
          currency: 'EUR',
          id: auth().currentUser?.uid,
        };

        setScannedData(JSON.stringify(extractedData));
        setIsModalVisible(true);
      } catch (error) {
        console.error('Error taking photo:', error);
        Alert.alert('Fout', 'Er is een fout opgetreden bij het maken van de foto.');
      } finally {
        setProcessing(false);
      }
    } else {
      console.error('Camera ref is null');
      Alert.alert('Fout', 'Camera is niet beschikbaar.');
      setProcessing(false);
    }
  };

  const handleAddExpense = async () => {
    if (!scannedData) {
      Alert.alert('Fout', 'Geen gescande gegevens beschikbaar.');
      return;
    }

    try {
      const categoryId = selectedCategory || (newCategoryName ? await handleCreateCategory() : null);

      if (!categoryId) {
        Alert.alert('Fout', 'Selecteer of maak een categorie aan.');
        return;
      }

      const parsedScannedData = JSON.parse(scannedData);

      await addExpense({
        amount: parsedScannedData.amount,
        categoryId,
        date: new Date().toISOString(),
        currency: parsedScannedData.currency,
        userId: auth().currentUser?.uid || '',
        userName: auth().currentUser?.displayName || 'Onbekend'
      });
      await queryClient.invalidateQueries(['expenses']);

      alert('Uitgave succesvol toegevoegd!');
      router.back();
      setIsModalVisible(false);
    } catch (error) {
      console.error('Error adding expense:', error);
      Alert.alert('Fout', 'Kon de uitgave niet toevoegen.');
    }
  };

  const handleCreateCategory = async () => {
    if (newCategoryName.trim() === '') {
      Alert.alert('Fout', 'Voer een categorienaam in.');
      return null;
    }

    setCreatingCategory(true);

    try {
      await addCategory(newCategoryName, newCategoryColor);
      const updatedCategories = await getCategories();
      setCategories(updatedCategories);
      setNewCategoryName('');
      setNewCategoryColor('#000000');

      const newCategory = updatedCategories.find(c => c.name === newCategoryName);
      return newCategory?.id || null;
    } catch (error) {
      console.error('Error creating category:', error);
      Alert.alert('Fout', 'Kon de categorie niet aanmaken.');
      return null;
    } finally {
      setCreatingCategory(false);
    }
  };

  if (!hasPermission && haveRequestedCameraPermission) {
    return <NoPermissionDialog isOpen={true} onCancel={() => router.back()} />;
  }

  if (!showCamera) {
    return (
      <View style={styles.container}>
        <Text>Camera wordt geladen...</Text>
      </View>
    );
  }

  if (!cameraDevice) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Geen camera gedetecteerd</Text>
        <Button onPress={() => router.back()} style={styles.backButton}>
          <ButtonText>Terug</ButtonText>
        </Button>
      </View>
    );
  }

  return (
    <GestureDetector gesture={swipeGesture}>
      <View style={styles.container}>
        <Camera
          ref={cameraRef}
          style={StyleSheet.absoluteFill}
          device={cameraDevice}
          isActive={showCamera}
          photo={true}
          enableZoomGesture
        />
        <Modal visible={isModalVisible} animationType="slide" transparent={true}>
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Selecteer Categorie</Text>
              <Picker
                selectedValue={selectedCategory}
                style={styles.picker}
                onValueChange={(itemValue) => setSelectedCategory(itemValue)}
              >
                <Picker.Item label="Selecteer een categorie" value={null} />
                {categories.map((category) => (
                  <Picker.Item key={category.id} label={category.name} value={category.id} />
                ))}
              </Picker>

              <Text style={styles.modalTitle}>Of Maak Nieuwe Categorie</Text>
              <TextInput
                placeholder="Categorienaam"
                value={newCategoryName}
                onChangeText={setNewCategoryName}
                style={styles.input}
              />
              <View style={styles.colorPicker}>
                <ColorPicker
                  color={newCategoryColor}
                  onColorChange={setNewCategoryColor}
                  thumbSize={30}
                  sliderSize={30}
                  noSnap={true}
                  row={false}
                />
              </View>

              <Button
                onPress={handleCreateCategory}
                style={styles.createButton}
                disabled={creatingCategory}
              >
                <ButtonText>
                  {creatingCategory ? 'Aanmaken...' : 'Categorie Toevoegen'}
                </ButtonText>
              </Button>
              <Button onPress={handleAddExpense} style={styles.addButton}>
                <ButtonText>Uitgave Toevoegen</ButtonText>
              </Button>
              <Button onPress={() => {setIsModalVisible(false); setScanned(false);}} style={styles.cancelButton}>
                <ButtonText>Annuleren</ButtonText>
              </Button>
            </View>
          </View>
        </Modal>
        <View style={styles.overlay}>
          <Text style={styles.overlayText}>
            Zorg dat de QR-code volledig zichtbaar is
          </Text>
        </View>
        <Animated.View style={[styles.scanButton, { transform: [{ scale: pulseAnim }] }]}>
          <TouchableOpacity onPress={handleTakePhoto} disabled={processing}>
            <Text style={styles.scanButtonText}>
              {processing ? 'Verwerken...' : 'Scan QR-code'}
            </Text>
          </TouchableOpacity>
        </Animated.View>
        <Button
          size="lg"
          className="rounded-full p-3.5 h-14 w-14 absolute right-8 bottom-8"
          onPress={() => setActiveCamera(activeCamera === 'front' ? 'back' : 'front')}
        >
          <ButtonIcon as={SwitchCamera} size="lg" />
        </Button>
        <Button onPress={() => router.back()} style={styles.backButton}>
          <ButtonText>Terug</ButtonText>
        </Button>
      </View>
    </GestureDetector>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    color: '#FF3B30',
    marginBottom: 20,
  },
  overlay: {
    position: 'absolute',
    top: 50,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  overlayText: {
    fontSize: 18,
    color: 'white',
    backgroundColor: 'rgba(0,0,0,0.6)',
    padding: 10,
    borderRadius: 5,
  },
  scanButton: {
    position: 'absolute',
    bottom: 100,
    alignSelf: 'center',
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 10,
  },
  scanButtonText: {
    fontSize: 18,
    color: 'white',
    fontWeight: 'bold',
  },
  backButton: {
    position: 'absolute',
    bottom: 20,
    alignSelf: 'center',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 10,
    width: '80%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  picker: {
    height: 50,
    width: '100%',
    marginBottom: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    padding: 10,
    marginBottom: 10,
  },
  colorPicker: {
    width: 300,
    height: 400,
    marginBottom: 40,
  },
  createButton: {
    backgroundColor: 'blue',
    marginBottom: 10,
  },
  addButton: {
    backgroundColor: 'green',
    marginBottom: 10,
  },
  cancelButton: {
    backgroundColor: 'red',
  },
});

export default Scanner;


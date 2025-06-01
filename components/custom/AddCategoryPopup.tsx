import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, Modal } from 'react-native';
import { Button, ButtonText } from '@/components/ui/button';
import { addCategory } from '@/api/categoryApi';
import ColorPicker from 'react-native-wheel-color-picker';
import { useQueryClient } from '@tanstack/react-query';


interface AddCategoryPopupProps {
  visible: boolean;
  onClose: () => void;
}

export function AddCategoryPopup({ visible, onClose }: AddCategoryPopupProps) {
  const queryClient = useQueryClient();
  const [categoryName, setCategoryName] = useState('');
  const [categoryColor, setCategoryColor] = useState('#40ff00');

  const handleAddCategory = async () => {
    if (categoryName.trim() === '') {
      alert('Please enter a category name');
      return;
    }

    try {
      await addCategory(categoryName,categoryColor);
      await queryClient.invalidateQueries(['categories']);
      onClose();
      setCategoryName('');
      setCategoryColor('#000000');
    } catch (error) {
      console.error('Error adding category:', error);
      alert('Failed to add category. Please try again.');
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalBackground}>
        <View style={styles.modalContent}>
          <Text style={styles.title}>Add New Category</Text>
          <TextInput
            style={styles.input}
            placeholder="Category Name"
            value={categoryName}
            onChangeText={setCategoryName}
          />
          <View style={styles.colorPickerContainer}>
            <ColorPicker
              color={categoryColor}
              onColorChange={setCategoryColor}
              thumbSize={30}
              sliderSize={30}
              noSnap={true}
              row={false}
            />
          </View>
          <View style={styles.buttonContainer}>
            <Button onPress={handleAddCategory} style={styles.addButton}>
              <ButtonText>Add Category</ButtonText>
            </Button>
            <Button onPress={onClose} style={styles.cancelButton}>
              <ButtonText>Cancel</ButtonText>
            </Button>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalBackground: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 10,
    width: '80%',
    maxHeight: '100%',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 30,
  },
  addButton: {
    flex: 1,
    marginRight: 5,
  },
  cancelButton: {
    flex: 1,
    marginLeft: 5,
    backgroundColor: '#ccc',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    padding: 10,
    marginBottom: 15,
  },
  colorPickerContainer: {
    marginTop: 10,
    marginBottom: 80,
    height: 200,
  },
});
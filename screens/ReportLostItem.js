import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Image,
  ScrollView,
  Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Picker } from '@react-native-picker/picker';
import { Ionicons } from '@expo/vector-icons';

const ReportLostItem = ({ navigation }) => {
  const [hasPhoto, setHasPhoto] = useState(null);
  const [photo, setPhoto] = useState(null);
  const [category, setCategory] = useState('');
  const [additionalDetails, setAdditionalDetails] = useState({});
  const [description, setDescription] = useState('');

  const categories = [
    'Electronics',
    'Bags',
    'Clothing',
    'Accessories',
    'Documents',
    'Others',
  ];

  const pickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert('Permission Required', 'Permission to access camera roll is required!');
      return;
    }

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.5,
    });

    if (!result.canceled && result.assets?.length > 0) {
      setPhoto(result.assets[0].uri);
      setHasPhoto(true);
    }
  };

  const renderAdditionalQuestions = () => {
    switch (category) {
      case 'Electronics':
        return (
          <>
            <Text style={styles.label}>Device Type:</Text>
            <TextInput 
              style={styles.input}
              onChangeText={text => setAdditionalDetails(prev => ({ ...prev, deviceType: text }))}
              placeholder="e.g., Smartphone, Laptop"
            />
            <Text style={styles.label}>Brand:</Text>
            <TextInput 
              style={styles.input}
              onChangeText={text => setAdditionalDetails(prev => ({ ...prev, brand: text }))}
              placeholder="e.g., Apple, Samsung"
            />
          </>
        );
      case 'Bags':
        return (
          <>
            <Text style={styles.label}>Bag Type:</Text>
            <TextInput 
              style={styles.input}
              onChangeText={text => setAdditionalDetails(prev => ({ ...prev, bagType: text }))}
              placeholder="e.g., Backpack, Handbag"
            />
            <Text style={styles.label}>Color:</Text>
            <TextInput 
              style={styles.input}
              onChangeText={text => setAdditionalDetails(prev => ({ ...prev, color: text }))}
              placeholder="e.g., Black, Brown"
            />
          </>
        );
      case 'Clothing':
        return (
          <>
            <Text style={styles.label}>Clothing Type:</Text>
            <TextInput 
              style={styles.input}
              onChangeText={text => setAdditionalDetails(prev => ({ ...prev, clothingType: text }))}
              placeholder="e.g., T-shirt, Jeans"
            />
            <Text style={styles.label}>Size:</Text>
            <TextInput 
              style={styles.input}
              onChangeText={text => setAdditionalDetails(prev => ({ ...prev, size: text }))}
              placeholder="e.g., M, L, XL"
            />
          </>
        );
      default:
        return null;
    }
  };

  const handleSubmit = async () => {
    if (!category) {
      Alert.alert('Error', 'Please select a category.');
      return;
    }

    try {
      const token = 'your-auth-token-here'; // Replace with your actual JWT token
      const formData = new FormData();
      formData.append('category', category);
      formData.append('description', description);
      formData.append('additionalDetails', JSON.stringify(additionalDetails));

      if (photo) {
        formData.append('photo', {
          uri: photo,
          name: `photo.${photo.split('.').pop()}`,
          type: 'image/jpeg',
        });
      }

      const response = await fetch('http://192.168.0.114:5000/report-lost', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        Alert.alert('Error', result.message || 'Failed to report lost item');
        return;
      }

      Alert.alert('Success', 'Lost item reported successfully!', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
      
    } catch (error) {
      console.error('Error submitting report:', error);
      Alert.alert('Error', 'Something went wrong. Please try again.');
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Report Lost Item</Text>

      {hasPhoto === null && (
        <View style={styles.photoPromptContainer}>
          <Text style={styles.label}>Do you have a photo of the lost item?</Text>
          <View style={styles.photoButtonsContainer}>
            <TouchableOpacity style={styles.photoButton} onPress={() => setHasPhoto(true)}>
              <Ionicons name="camera" size={24} color="#fff" />
              <Text style={styles.photoButtonText}>Yes, I have a photo</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.photoButton} onPress={() => setHasPhoto(false)}>
              <Ionicons name="close-circle" size={24} color="#fff" />
              <Text style={styles.photoButtonText}>No photo available</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {hasPhoto === true && (
        <View style={styles.photoContainer}>
          <TouchableOpacity style={styles.choosePhotoButton} onPress={pickImage}>
            <Ionicons name="image" size={24} color="#fff" />
            <Text style={styles.choosePhotoText}>Choose Photo</Text>
          </TouchableOpacity>
          {photo && (
            <View style={styles.imageContainer}>
              <Image source={{ uri: photo }} style={styles.image} />
              <Text style={styles.photoSelectedText}>Photo selected</Text>
            </View>
          )}
        </View>
      )}

      <View style={styles.pickerContainer}>
        <Text style={styles.label}>Category:</Text>
        <View style={styles.pickerWrapper}>
          <Picker
            selectedValue={category}
            onValueChange={(itemValue) => setCategory(itemValue)}
            style={styles.picker}
          >
            <Picker.Item label="Select a category" value="" />
            {categories.map((item, index) => (
              <Picker.Item key={index} label={item} value={item} />
            ))}
          </Picker>
        </View>
      </View>

      {category && renderAdditionalQuestions()}

      <Text style={styles.label}>Description:</Text>
      <TextInput
        style={styles.descriptionInput}
        multiline
        numberOfLines={4}
        onChangeText={setDescription}
        placeholder="Provide a detailed description of the lost item"
      />

      <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
        <Text style={styles.submitButtonText}>SUBMIT REPORT</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginVertical: 20,
    color: '#4a148c',
  },
  photoPromptContainer: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  photoButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  photoButton: {
    backgroundColor: '#4a148c',
    padding: 10,
    borderRadius: 5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    marginHorizontal: 5,
  },
  photoButtonText: {
    color: '#fff',
    marginLeft: 5,
    fontSize: 14,
  },
  photoContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  choosePhotoButton: {
    backgroundColor: '#4a148c',
    padding: 10,
    borderRadius: 5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  choosePhotoText: {
    color: '#fff',
    marginLeft: 5,
    fontSize: 16,
  },
  imageContainer: {
    marginTop: 10,
    alignItems: 'center',
  },
  image: {
    width: 200,
    height: 200,
    borderRadius: 10,
  },
  photoSelectedText: {
    marginTop: 5,
    color: '#4a148c',
    fontWeight: 'bold',
  },
  pickerContainer: {
    marginBottom: 20,
  },
  pickerWrapper: {
    borderWidth: 1,
    borderColor: '#4a148c',
    borderRadius: 5,
    overflow: 'hidden',
  },
  picker: {
    height: 50,
    width: '100%',
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#4a148c',
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#4a148c',
    borderRadius: 5,
    padding: 10,
    marginBottom: 15,
    fontSize: 16,
  },
  descriptionInput: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#4a148c',
    borderRadius: 5,
    padding: 10,
    marginBottom: 20,
    fontSize: 16,
    height: 120,
    textAlignVertical: 'top',
  },
  submitButton: {
    backgroundColor: '#4a148c',
    padding: 15,
    borderRadius: 5,
    alignItems: 'center',
    marginVertical: 10,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default ReportLostItem;


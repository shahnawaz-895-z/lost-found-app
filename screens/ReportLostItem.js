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
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Picker } from '@react-native-picker/picker';

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
            <Text>Device Type:</Text>
            <TextInput onChangeText={text => setAdditionalDetails(prev => ({ ...prev, deviceType: text }))} />
            <Text>Brand:</Text>
            <TextInput onChangeText={text => setAdditionalDetails(prev => ({ ...prev, brand: text }))} />
          </>
        );
      case 'Bags':
        return (
          <>
            <Text>Bag Type:</Text>
            <TextInput onChangeText={text => setAdditionalDetails(prev => ({ ...prev, bagType: text }))} />
            <Text>Color:</Text>
            <TextInput onChangeText={text => setAdditionalDetails(prev => ({ ...prev, color: text }))} />
          </>
        );
      case 'Clothing':
        return (
          <>
            <Text>Clothing Type:</Text>
            <TextInput onChangeText={text => setAdditionalDetails(prev => ({ ...prev, clothingType: text }))} />
            <Text>Size:</Text>
            <TextInput onChangeText={text => setAdditionalDetails(prev => ({ ...prev, size: text }))} />
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
        <View>
          <Text>Do you have a photo of the lost item?</Text>
          <TouchableOpacity onPress={() => setHasPhoto(true)}>
            <Text>Yes, I have a photo</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setHasPhoto(false)}>
            <Text>No photo available</Text>
          </TouchableOpacity>
        </View>
      )}

      {hasPhoto === true && (
        <>
          <TouchableOpacity onPress={pickImage}>
            <Text>Choose Photo</Text>
          </TouchableOpacity>
          {photo && (
            <View style={styles.imageContainer}>
              <Image source={{ uri: photo }} style={styles.image} />
              <Text>Photo selected</Text>
            </View>
          )}
        </>
      )}

      <View style={styles.pickerContainer}>
        <Picker selectedValue={category} onValueChange={(itemValue) => setCategory(itemValue)}>
          {categories.map((item, index) => (
            <Picker.Item key={index} label={item} value={item} />
          ))}
        </Picker>
      </View>

      {category && renderAdditionalQuestions()}

      <Text>Description:</Text>
      <TextInput
        style={styles.descriptionInput}
        multiline
        numberOfLines={4}
        onChangeText={setDescription}
      />

      <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
        <Text style={styles.submitButtonText}>SUBMIT REPORT</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  title: { fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginVertical: 20 },
  descriptionInput: { height: 100, textAlignVertical: 'top' },
  submitButton: { backgroundColor: '#4a148c', padding: 15, borderRadius: 5, alignItems: 'center', marginVertical: 10 },
  submitButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});

export default ReportLostItem;
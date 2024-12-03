import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Platform,
  Image,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import { Picker } from '@react-native-picker/picker';
import axios from 'axios';
import * as FileSystem from 'expo-file-system';

const ReportLostItem = ({ navigation }) => {
  const [time, setTime] = useState(new Date());
  const [contact, setContact] = useState('');
  const [category, setCategory] = useState('');
  const [date, setDate] = useState(new Date());
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [photo, setPhoto] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  const categories = [
    'Electronics',
    'Bags',
    'Clothing',
    'Accessories',
    'Documents',
    'Others',
  ];

  const HUGGING_FACE_API_KEY = 'your_hugging_face_api_key_here'; // Replace with your actual API key

  const pickImage = async () => {
    try {
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
        handleImageUpload(result.assets[0]);
      }
    } catch (error) {
      console.error('Image selection error:', error);
      Alert.alert('Error', 'Failed to select image');
    }
  };

  const handleImageUpload = async (asset) => {
    if (!asset.uri) {
      console.error('No image asset provided');
      return;
    }

    setIsLoading(true);
    const huggingFaceUrl = 'https://api-inference.huggingface.co/models/Salesforce/blip-image-captioning-base';

    try {
      const base64ImageData = await FileSystem.readAsStringAsync(asset.uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const result = await axios.post(
        huggingFaceUrl,
        { inputs: base64ImageData },
        {
          headers: {
            Authorization: `Bearer ${HUGGING_FACE_API_KEY}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (result.data?.[0]?.generated_text) {
        setDescription(result.data[0].generated_text);
      } else {
        setDescription('No description available');
      }
    } catch (error) {
      console.error('Error processing image:', error);
      Alert.alert('Error', 'Failed to process image. Please try again.');
      setDescription('');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = () => {
    if (!contact || !category || !location) {
      Alert.alert('Error', 'Please fill in contact, category, and location fields.');
      return;
    }

    // You can add more robust validation or API submission logic here
    Alert.alert('Success', 'Report Submitted Successfully!', [
      { text: 'OK', onPress: () => navigation.goBack() }
    ]);
  };

  const onChangeDate = (event, selectedDate) => {
    const currentDate = selectedDate || date;
    setShowDatePicker(Platform.OS === 'ios');
    setDate(currentDate);
  };

  const onChangeTime = (event, selectedTime) => {
    const currentTime = selectedTime || time;
    setShowTimePicker(Platform.OS === 'ios');
    setTime(currentTime);
  };

  return (
    <ScrollView style={styles.container}>
      <TouchableOpacity 
        style={styles.backButton} 
        onPress={() => navigation.goBack()}
      >
        <Text style={styles.backButtonText}>← Back</Text>
      </TouchableOpacity>

      <Text style={styles.title}>Report Lost Item</Text>

      <Text style={styles.label}>Time:</Text>
      <TouchableOpacity style={styles.input} onPress={() => setShowTimePicker(true)}>
        <Text>{time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
      </TouchableOpacity>
      {showTimePicker && (
        <DateTimePicker 
          value={time} 
          mode="time" 
          is24Hour 
          display="default" 
          onChange={onChangeTime} 
        />
      )}

      <Text style={styles.label}>Contact Number:</Text>
      <TextInput
        style={styles.input}
        placeholder="Enter contact number"
        keyboardType="phone-pad"
        value={contact}
        onChangeText={setContact}
      />

      <Text style={styles.label}>Item Category:</Text>
      <View style={styles.pickerContainer}>
        <Picker
          selectedValue={category}
          onValueChange={(itemValue) => setCategory(itemValue)}
        >
          <Picker.Item label="Select Category" value="" />
          {categories.map((item, index) => (
            <Picker.Item key={index} label={item} value={item} />
          ))}
        </Picker>
      </View>

      <Text style={styles.label}>Location:</Text>
      <TextInput
        style={styles.input}
        placeholder="Where was the item lost?"
        value={location}
        onChangeText={setLocation}
      />

      <Text style={styles.label}>Upload Photo (Optional):</Text>
      <TouchableOpacity onPress={pickImage} style={styles.uploadButton}>
        <Text style={styles.uploadText}>Choose Photo</Text>
      </TouchableOpacity>
      {photo && (
        <View style={styles.imageContainer}>
          <Image source={{ uri: photo }} style={styles.image} />
          <Text>Photo selected</Text>
        </View>
      )}

      <Text style={styles.label}>Description:</Text>
      {isLoading ? (
        <ActivityIndicator size="large" color="#4a148c" />
      ) : (
        <TextInput
          style={[styles.input, styles.descriptionInput]}
          placeholder="Additional details about the lost item"
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={4}
        />
      )}

      <TouchableOpacity 
        style={styles.submitButton} 
        onPress={handleSubmit}
      >
        <Text style={styles.submitButtonText}>SUBMIT REPORT</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    padding: 20 
  },
  backButton: {
    marginBottom: 15
  },
  backButtonText: {
    fontSize: 16,
    color: '#4a148c'
  },
  title: { 
    fontSize: 24, 
    fontWeight: 'bold', 
    textAlign: 'center', 
    marginVertical: 20 
  },
  label: { 
    fontSize: 16, 
    marginVertical: 5, 
    fontWeight: 'bold' 
  },
  input: { 
    height: 40, 
    borderColor: '#ccc', 
    borderWidth: 1, 
    borderRadius: 5, 
    marginBottom: 15, 
    paddingHorizontal: 10,
    justifyContent: 'center'
  },
  pickerContainer: { 
    borderColor: '#ccc', 
    borderWidth: 1, 
    borderRadius: 5, 
    marginBottom: 15 
  },
  uploadButton: { 
    backgroundColor: '#f0f0f0', 
    padding: 10, 
    borderRadius: 5, 
    alignItems: 'center', 
    marginBottom: 15 
  },
  imageContainer: { 
    alignItems: 'center', 
    marginBottom: 15 
  },
  image: { 
    width: 200, 
    height: 200 
  },
  descriptionInput: { 
    height: 100, 
    textAlignVertical: 'top' 
  },
  submitButton: { 
    backgroundColor: '#4a148c', 
    padding: 15, 
    borderRadius: 5, 
    alignItems: 'center', 
    marginVertical: 10 
  },
  submitButtonText: { 
    color: '#fff', 
    fontSize: 16, 
    fontWeight: 'bold' 
  },
});

export default ReportLostItem;
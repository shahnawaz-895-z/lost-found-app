import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, TextInput, ScrollView, Alert, Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import axios from 'axios';
import * as FileSystem from 'expo-file-system';
import DateTimePicker from '@react-native-community/datetimepicker';
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';

const ReportFoundItem = ({ navigation }) => {
  const [contact, setContact] = useState('');
  const [location, setLocation] = useState(null);
  const [photo, setPhoto] = useState(null);
  const [description, setDescription] = useState('');
  const [time, setTime] = useState(null);
  const [date, setDate] = useState(null);
  const [region, setRegion] = useState(null);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [showMap, setShowMap] = useState(false);
  const [category, setCategory] = useState('');

  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const BACKEND_URL = 'http://192.168.0.114:5000';
  const HUGGING_FACE_API_KEY = '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';

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission to access location was denied');
        return;
      }

      const userLocation = await Location.getCurrentPositionAsync({});
      setRegion({
        latitude: userLocation.coords.latitude,
        longitude: userLocation.coords.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });
    })();
  }, []);

  const pickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permissionResult.granted) {
      Alert.alert('Permission to access camera roll is required!');
      return;
    }

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.5,
      maxWidth: 1000,
      maxHeight: 1000,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setPhoto(result.assets[0].uri);
      handleImageUpload(result.assets[0]);
    } else {
      Alert.alert('Image selection was cancelled or failed');
    }
  };

  const handleMapPress = (event) => {
    const { latitude, longitude } = event.nativeEvent.coordinate;
    setSelectedLocation({ latitude, longitude });
    setLocation(`${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
    setShowMap(false);
  };

  const handleImageUpload = async (asset) => {
    if (!asset || !asset.uri) {
      console.error('No image asset provided');
      return;
    }

    const huggingFaceUrl = 'https://api-inference.huggingface.co/models/Salesforce/blip-image-captioning-base';

    try {
      const base64ImageData = await FileSystem.readAsStringAsync(asset.uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const result = await axios.post(huggingFaceUrl, { inputs: base64ImageData }, {
        headers: {
          'Authorization': `Bearer ${HUGGING_FACE_API_KEY}`,
          'Content-Type': 'application/json',
        },
      });

      if (result.data && result.data[0] && result.data[0].generated_text) {
        setDescription(result.data[0].generated_text);
      } else {
        setDescription('No description available');
      }
    } catch (error) {
      console.error('Error processing image:', error);
      Alert.alert('Error processing the image. Please try again.');
    }
  };

  const submitFoundItem = async () => {
    if (!category || !description || !location) {
      Alert.alert('Missing Information', 'Please fill in all required fields');
      return;
    }

    try {
      const token = await AsyncStorage.getItem('authToken');
      if (!token) {
        Alert.alert('Authentication Error', 'Please log in again');
        return;
      }

      const formData = new FormData();
      formData.append('category', category);
      formData.append('description', description);
      formData.append('location', location);

      const additionalDetails = {
        contact,
        time: time ? time.toLocaleTimeString() : null,
        date: date ? date.toLocaleDateString() : null,
      };
      formData.append('additionalDetails', JSON.stringify(additionalDetails));

      if (photo) {
        const filename = photo.split('/').pop();
        const fileType = filename.split('.').pop();
        formData.append('photo', {
          uri: Platform.OS === 'android' ? photo : photo.replace('file://', ''),
          type: `image/${fileType}`,
          name: filename
        });
      }

      const response = await axios.post(`${BACKEND_URL}/report-found`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${token}`
        }
      });

      Alert.alert('Success', 'Found item reported successfully');
      resetForm();
    } catch (error) {
      console.error('Submission Error:', error.response ? error.response.data : error.message);
      Alert.alert('Submission Failed', error.response?.data?.message || 'Unable to report found item');
    }
  };

  const resetForm = () => {
    setContact('');
    setLocation(null);
    setPhoto(null);
    setDescription('');
    setTime(null);
    setDate(null);
    setCategory('');
    setSelectedLocation(null);
  };

  const categories = [
    'Electronics', 'Bags', 'Clothing', 
    'Accessories', 'Documents', 'Others'
  ];

  return (
    <View style={styles.screenContainer}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.heading}>Report Found Item</Text>

        <View style={styles.categoryContainer}>
          {categories.map((cat) => (
            <TouchableOpacity
              key={cat}
              style={[
                styles.categoryButton,
                category === cat && styles.selectedCategory
              ]}
              onPress={() => setCategory(cat)}
            >
              <Text style={[
                styles.categoryText,
                category === cat && styles.selectedCategoryText
              ]}>
                {cat}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.inputContainer}>
          <Ionicons name="time-outline" size={24} color="#4c033b" style={styles.inputIcon} />
          <TouchableOpacity style={styles.input} onPress={() => setShowTimePicker(true)}>
            <Text style={styles.inputText}>
              {time ? time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Select Time'}
            </Text>
          </TouchableOpacity>
        </View>
        {showTimePicker && (
          <DateTimePicker
            value={time || new Date()}
            mode="time"
            display="default"
            onChange={(event, selectedTime) => {
              setShowTimePicker(false);
              if (selectedTime) setTime(selectedTime);
            }}
          />
        )}

        <View style={styles.inputContainer}>
          <Ionicons name="calendar-outline" size={24} color="#4c033b" style={styles.inputIcon} />
          <TouchableOpacity style={styles.input} onPress={() => setShowDatePicker(true)}>
            <Text style={styles.inputText}>
              {date ? date.toLocaleDateString() : 'Select Date'}
            </Text>
          </TouchableOpacity>
        </View>
        {showDatePicker && (
          <DateTimePicker
            value={date || new Date()}
            mode="date"
            display="default"
            onChange={(event, selectedDate) => {
              setShowDatePicker(false);
              if (selectedDate) setDate(selectedDate);
            }}
          />
        )}

        <View style={styles.inputContainer}>
          <Ionicons name="call-outline" size={24} color="#4c033b" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="Contact"
            value={contact}
            onChangeText={setContact}
            placeholderTextColor="#999"
          />
        </View>

        <View style={styles.inputContainer}>
          <Ionicons name="location-outline" size={24} color="#4c033b" style={styles.inputIcon} />
          <TouchableOpacity style={styles.input} onPress={() => setShowMap(true)}>
            <Text style={styles.inputText}>
              {location ? location : 'Set Location'}
            </Text>
          </TouchableOpacity>
        </View>

        {showMap && region && (
          <MapView
            style={styles.map}
            initialRegion={region}
            onPress={handleMapPress}
          >
            {selectedLocation && (
              <Marker
                coordinate={selectedLocation}
                title="Selected Location"
              />
            )}
          </MapView>
        )}

        <TouchableOpacity style={styles.uploadButton} onPress={pickImage}>
          <Ionicons name="camera-outline" size={24} color="white" />
          <Text style={styles.uploadText}>Upload Photo</Text>
        </TouchableOpacity>

        {photo && <Image source={{ uri: photo }} style={styles.image} />}

        {description !== '' && (
          <View style={styles.descriptionContainer}>
            <Text style={styles.descriptionLabel}>Description:</Text>
            <Text style={styles.descriptionText}>{description}</Text>
          </View>
        )}

        <TouchableOpacity 
          style={styles.submitButton} 
          onPress={submitFoundItem}
        >
          <Text style={styles.submitButtonText}>SUBMIT</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    padding: 20,
  },
  heading: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4c033b',
    marginBottom: 20,
    textAlign: 'center',
  },
  categoryContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginBottom: 20,
  },
  categoryButton: {
    borderWidth: 2,
    borderColor: '#4c033b',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 12,
    margin: 5,
  },
  selectedCategory: {
    backgroundColor: '#4c033b',
  },
  categoryText: {
    color: '#4c033b',
    fontWeight: '600',
  },
  selectedCategoryText: {
    color: 'white',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    height: 50,
    borderColor: '#4c033b',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 15,
    fontSize: 16,
    color: '#333',
  },
  inputText: {
    fontSize: 16,
    color: '#333',
  },
  map: {
    height: 200,
    marginBottom: 15,
    borderRadius: 10,
  },
  uploadButton: {
    backgroundColor: '#4c033b',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
  },
  uploadText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 10,
  },
  image: {
    width: '100%',
    height: 200,
    resizeMode: 'cover',
    borderRadius: 10,
    marginBottom: 15,
  },
  descriptionContainer: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
  },
  descriptionLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4c033b',
    marginBottom: 5,
  },
  descriptionText: {
    fontSize: 16,
    color: '#333',
  },
  submitButton: {
    backgroundColor: '#4c033b',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  submitButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default ReportFoundItem;

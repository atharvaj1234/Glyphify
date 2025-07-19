import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as SecureStore from 'expo-secure-store';
import { GoogleGenAI } from '@google/genai';

import { COLORS } from './constants/colors';

const APP_VERSION = '1.0.2'; // Define your app version

const SettingsScreen = ({ setCurrentScreen, geminiApiKey, setGeminiApiKey, validateGeminiApiKey, setSelectedAIModel, selectedAIModel }) => {
  const [apiKeyInput, setApiKeyInput] = useState(geminiApiKey || '');
  const [isValidating, setIsValidating] = useState(false);
  const [apiKeyError, setApiKeyError] = useState(false);

  const [availableAIModels, setAvailableAIModels] = useState([]);
  const [showModelDropdown, setShowModelDropdown] = useState(false);
  const [fetchingModels, setFetchingModels] = useState(false);

  // Fetch available AI models
  useEffect(() => {
    const fetchModels = async () => {
      if (!geminiApiKey) {
        setAvailableAIModels([]);
        return;
      }
      setFetchingModels(true);
      setAvailableAIModels([]); // Clear previous models while fetching
      try {
const ai = new GoogleGenAI({ apiKey: geminiApiKey });
const response = await ai.models.list();

// --- FIX START ---
const modelList = response?.pageInternal;

if (!Array.isArray(modelList)) {
  console.warn('AI models list response was not an array:', modelList);
  Alert.alert(
    'Error',
    'Failed to retrieve a list of AI models. The API response was unexpected. Please try updating your API Key or contact support.'
  );
  setAvailableAIModels([]);
  return;
}
// --- FIX END ---

const geminiModels = modelList
  .filter(
    (model) =>
      model?.name?.startsWith('models/gemini') &&
      Array.isArray(model.supportedActions) &&
      model.supportedActions.includes('generateContent') &&
      model.version
  )
  .map((model) => model.name.replace('models/', ''));

setAvailableAIModels(geminiModels);

        // Set selected model to the first one available if current is not in list or none selected
        if (!geminiModels.includes(selectedAIModel) && geminiModels.length > 0) {
          setSelectedAIModel(geminiModels[0]);
        } else if (geminiModels.length === 0) {
          setSelectedAIModel('No models available');
        }

      } catch (error) {
        console.error('Failed to fetch AI models:', error);
        setAvailableAIModels([]);
        setSelectedAIModel('Error fetching models');
        let errorMessage = 'Failed to fetch AI models. ';
        if (error.message.includes('API key not valid') || error.message.includes('AUTHENTICATION_ERROR')) {
            errorMessage += 'Please ensure your API key is correct and has the necessary permissions.';
        } else if (error.message.includes('network')) {
            errorMessage += 'Please check your internet connection.';
        } else {
            errorMessage += 'An unknown error occurred.';
        }
        Alert.alert('Error', errorMessage);
      } finally {
        setFetchingModels(false);
      }
    };
    fetchModels();
  }, [geminiApiKey]); // Re-fetch models if API key changes

  const handleUpdateApiKey = async () => {
    if (!apiKeyInput.trim()) {
      Alert.alert('API Key Required', 'Please enter your Gemini API key.');
      setApiKeyError(true);
      return;
    }

    setIsValidating(true);
    setApiKeyError(false);
    try {
      const isValid = await validateGeminiApiKey(apiKeyInput);
      if (isValid) {
        await SecureStore.setItemAsync('gemini_api_key', apiKeyInput);
        setGeminiApiKey(apiKeyInput); // Update API key in App.js state
        Alert.alert('Success', 'Your Gemini API key has been updated and validated!');
        // Trigger model fetch immediately after successful key update
        // The useEffect dependency on geminiApiKey will handle this
      } else {
        Alert.alert('Invalid API Key', 'The entered Gemini API key is not valid. Please check and try again.');
        setApiKeyError(true);
      }
    } catch (error) {
      console.error('Error updating API key:', error);
      Alert.alert('Error', 'An unexpected error occurred during validation. Please try again.');
    } finally {
      setIsValidating(false);
    }
  };

const handleSelectAIModel = async (modelName) => { // Make this function async
    setSelectedAIModel(modelName);
    setShowModelDropdown(false);
    await SecureStore.setItemAsync('selected_ai_model', modelName); // Save selected model to storage
  };

  const handleContactUs = () => {
    Alert.alert('About Us', 'Glyphify is a cutting-edge mobile application designed to revolutionize the way teachers and students handle information. By leveraging intelligent AI, Glyphify effortlessly extracts text from documents, converting handwritten notes and printed materials into editable digital text. Teachers and professors can say goodbye to the tedious task of manually entering handwritten data into spreadsheets, streamlining their workflow and saving valuable time. Students can capture images of whiteboards or even their own incomplete notes, and Glyphify will generate comprehensive and accurate study materials. Glyphify is the ultimate tool for enhanced productivity and efficient learning, bridging the gap between the physical and digital worlds for both educators and learners');
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButtonContainer} onPress={() => setCurrentScreen('Home')}>
          <Ionicons name="arrow-back" size={24} color={COLORS.darkerText} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={styles.backButtonContainer} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollViewContent}>
        {/* AI Model Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>AI Model</Text>
        </View>
        <TouchableOpacity style={styles.modelDropdownTrigger} onPress={() => setShowModelDropdown(true)} disabled={fetchingModels || availableAIModels.length === 0}>
          <Text style={styles.modelDropdownText}>
            {fetchingModels ? 'Fetching models...' : selectedAIModel || 'Select a model'}
          </Text>
          {fetchingModels ? (
            <ActivityIndicator size="small" color={COLORS.inactiveTextSettings} />
          ) : (
            <Ionicons name="chevron-down" size={20} color={COLORS.inactiveTextSettings} />
          )}
        </TouchableOpacity>

        {/* AI Model Dropdown Modal */}
        <Modal
          visible={showModelDropdown}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowModelDropdown(false)}
        >
          <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowModelDropdown(false)}>
            <View style={styles.modelDropdownModal}>
              <ScrollView>
                {availableAIModels.length > 0 ? (
                  availableAIModels.map((model, index) => (
                    <TouchableOpacity
                      key={index}
                      style={styles.modelDropdownItem}
                      onPress={async () => await handleSelectAIModel(model)}
                    >
                      <Text style={styles.modelDropdownItemText}>{model}</Text>
                    </TouchableOpacity>
                  ))
                ) : (
                  <View style={styles.modelDropdownItem}>
                    <Text style={[styles.modelDropdownItemText, { color: COLORS.inactiveIcon }]}>
                      {fetchingModels ? 'Loading models...' : 'No models available. Check API key.'}
                    </Text>
                  </View>
                )}
              </ScrollView>
            </View>
          </TouchableOpacity>
        </Modal>


        {/* API Key Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>API Key</Text>
        </View>
        <View style={[styles.apiKeyInputContainer, apiKeyError && styles.apiKeyInputError]}>
          <TextInput
            style={styles.apiKeyInput}
            placeholder="Enter API Key"
            placeholderTextColor={COLORS.inactiveTextSettings}
            value={apiKeyInput}
            onChangeText={(text) => {
              setApiKeyInput(text);
              setApiKeyError(false); // Clear error on change
            }}
            autoCapitalize="none"
            autoCorrect={false}
            editable={!isValidating}
          />
          {isValidating && (
            <ActivityIndicator size="small" color={COLORS.progressBarFill} style={styles.validationSpinner} />
          )}
        </View>
        <View style={styles.updateButtonRow}>
          <TouchableOpacity
            style={styles.updateButton}
            onPress={handleUpdateApiKey}
            disabled={isValidating || !apiKeyInput.trim()}
          >
            {isValidating ? (
              <ActivityIndicator size="small" color={COLORS.darkerText} />
            ) : (
              <Text style={styles.updateButtonText}>Update API Key</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* About Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>About</Text>
        </View>
        <TouchableOpacity style={styles.aboutItem}>
          <View style={styles.aboutIconContainer}>
            <Ionicons name="document-text-outline" size={24} color={COLORS.darkerText} />
          </View>
          <View>
            <Text style={styles.aboutItemTitle}>Glyphify</Text>
            <Text style={styles.aboutItemVersion}>Version {APP_VERSION}</Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity style={styles.aboutItem} onPress={handleContactUs}>
          <View style={styles.aboutIconContainer}>
            <Ionicons name="help-circle-outline" size={24} color={COLORS.darkerText} />
          </View>
          <Text style={styles.contactUsText}>About Us</Text>
        </TouchableOpacity>
      {/* Developed by */}
      <View style={styles.developedByContainer}>
        <Text style={styles.developedByText}>Developed by Atharva Jagtap</Text>
      </View>
      </ScrollView>

    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.primaryBackground,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    backgroundColor: COLORS.primaryBackground,
  },
  backButtonContainer: {
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontFamily: 'Inter-Bold',
    fontSize: 18,
    lineHeight: 23,
    color: COLORS.darkerText,
    flex: 1,
    textAlign: 'center',
  },
  scrollViewContent: {
    paddingBottom: 95,
  },
  sectionHeader: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  sectionTitle: {
    fontFamily: 'Inter-Bold',
    fontSize: 18,
    lineHeight: 23,
    color: COLORS.darkerText,
  },
  // AI Model Dropdown styles
  modelDropdownTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 15,
    marginHorizontal: 16,
    marginTop: 12,
    height: 56,
    backgroundColor: COLORS.primaryBackground,
    borderWidth: 1,
    borderColor: COLORS.borderColorSettings,
    borderRadius: 12,
  },
  modelDropdownText: {
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    lineHeight: 24,
    color: COLORS.darkerText,
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modelDropdownModal: {
    backgroundColor: COLORS.white,
    borderRadius: 8,
    maxHeight: '50%',
    width: '80%',
    shadowColor: COLORS.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modelDropdownItem: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderColor,
  },
  modelDropdownItemText: {
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    color: COLORS.darkerText,
  },
  // API Key styles
  apiKeyInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 5,
    marginHorizontal: 16,
    marginTop: 12,
    height: 56,
    backgroundColor: COLORS.primaryBackground,
    borderWidth: 1,
    borderColor: COLORS.borderColorSettings,
    borderRadius: 12,
  },
  apiKeyInputError: {
    borderColor: 'red',
  },
  apiKeyInput: {
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    lineHeight: 24,
    color: COLORS.darkerText,
    flex: 1,
    paddingRight: 10,
  },
  validationSpinner: {
    marginLeft: 10,
  },
  updateButtonRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  updateButton: {
    backgroundColor: COLORS.updateButtonBackground,
    borderRadius: 20,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  updateButtonText: {
    fontFamily: 'Inter-Bold',
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
    color: COLORS.darkerText,
  },
  // About section styles
  aboutItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 16,
    minHeight: 72,
  },
  aboutIconContainer: {
    width: 48,
    height: 48,
    backgroundColor: COLORS.lightBlueBackground,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  aboutItemTitle: {
    fontFamily: 'Inter-Medium',
    fontSize: 16,
    lineHeight: 24,
    color: COLORS.darkerText,
  },
  aboutItemVersion: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    lineHeight: 21,
    color: COLORS.inactiveTextSettings,
  },
  contactUsText: {
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    lineHeight: 24,
    color: COLORS.darkerText,
    flex: 1,
  },
  // Developed by
  developedByContainer: {
    marginTop: 'auto',
    paddingTop: 80,
    alignItems: 'center'
  },
  developedByText: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    lineHeight: 24,
    textAlign: 'center',
    color: COLORS.developedByText,
  },
});

export default SettingsScreen;
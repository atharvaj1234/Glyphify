import React, { useEffect, useState, useRef } from 'react';
import { Animated, Easing } from 'react-native';
import { StyleSheet, Text, View, Image, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { GoogleGenAI, createPartFromUri, createUserContent } from '@google/genai';
import * as FileSystem from 'expo-file-system';


import { COLORS } from '../constants/colors';
import { NOTES_PROMPT, EXTRACTION_PROMPT, ADDITIONAL_INSTURCTION_PROMPT } from '../constants/prompts'

const documentPlaceholderImage = require('../../assets/document_placeholder.png');

const ProcessingScreen = ({ setCurrentScreen, selectedFile, setProcessedOutput, geminiApiKey, addDocumentToHistory, setHistoryNeedsRefresh, selectedMode, selectedAIModel, additionalInstructions }) => {
  const scanAnim = useRef(new Animated.Value(0)).current;
  const [processingProgress, setProcessingProgress] = useState(0);
  const [processingStatus, setProcessingStatus] = useState('Processing your document...');
  const [ai, setAi] = useState(null);

  useEffect(() => {
    if (geminiApiKey) {
      try {
        setAi(new GoogleGenAI({ apiKey: geminiApiKey }));
      } catch (error) {
        console.error("Failed to initialize GoogleGenAI:", error);
        Alert.alert(
          'API Key Error',
          'There was an issue initializing the AI with your key. Please check it in settings.'
        );
        setCurrentScreen('Upload');
      }
    } else {
      Alert.alert(
        'API Key Missing',
        'Please enter your Gemini API key in the onboarding or settings to use AI features.'
      );
      setCurrentScreen('Upload');
    }
  }, [geminiApiKey]);

  useEffect(() => {
    if (selectedFile && ai) {
      processDocument();
    } else if (selectedFile && !geminiApiKey) {
        setProcessingStatus('Waiting for valid API Key...');
    }
  }, [selectedFile, ai]);

  useEffect(() => {
    if (processingProgress > 0 && processingProgress < 100) {
      startScanningAnimation();
    } else {
      stopScanningAnimation();
    }
  }, [processingProgress]);

  const startScanningAnimation = () => {
    scanAnim.setValue(0);
    Animated.loop(
      Animated.timing(scanAnim, {
        toValue: 1,
        duration: 2000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();
  };

  const stopScanningAnimation = () => {
    scanAnim.stopAnimation();
  };

  const processDocument = async () => {
    if (!ai) {
        setProcessingStatus('AI not initialized (API Key issue).');
        return;
    }
    try {
      setProcessingProgress(20);
      setProcessingStatus('Uploading file...');

      if (!selectedFile || !selectedFile.uri || !selectedFile.mimeType) {
        throw new Error('No file selected or file details missing.');
      }

      const base64Content = await FileSystem.readAsStringAsync(selectedFile.uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      setProcessingProgress(50);
      setProcessingStatus('Analyzing content with AI...');

      let modelName = selectedAIModel;
      let promptText = '';

      if (selectedMode === 'Generate Notes') {
        promptText = additionalInstructions ? NOTES_PROMPT + ADDITIONAL_INSTURCTION_PROMPT + additionalInstructions : NOTES_PROMPT;
      } else { // 'Extract Text' mode
        promptText = additionalInstructions ? EXTRACTION_PROMPT + ADDITIONAL_INSTURCTION_PROMPT + additionalInstructions : EXTRACTION_PROMPT;
      }


      const contentParts = [
        { text: promptText },
        {
          inlineData: {
            mimeType: selectedFile.mimeType,
            data: base64Content,
          },
        },
      ];

      console.log('Sending to Gemini AI...');
      const response = await ai.models.generateContent({
        model: modelName,
        contents: createUserContent(contentParts),
      });

      let rawExtractedText = response.text; // Get raw text from AI

      setProcessingProgress(100);
      setProcessingStatus('Processing complete!');

      let outputType = 'markdown'; // Default to text
      let cleanedContent = rawExtractedText.trim(); // Start with trimmed raw text

      // Determine output type and clean content based on prefix
      if (cleanedContent.startsWith('```md')) {
        outputType = 'markdown';
        cleanedContent = cleanedContent.substring(6).trim();
      } else if (cleanedContent.startsWith('```csv')) {
        outputType = 'csv';
        cleanedContent = cleanedContent.substring(7).trim();
      } else if (cleanedContent.startsWith('```text')) {
        outputType = 'markdown';
        cleanedContent = cleanedContent.substring(8).trim();
      }
      
      // Remove trailing backticks if present
      if (cleanedContent.endsWith('```')) {
        cleanedContent = cleanedContent.slice(0, -3).trim();
      }

      let outputTitle = selectedFile.name.split('.').slice(0, -1).join('.') || 'Processed Document';

      const newDocumentId = await addDocumentToHistory(
        outputTitle,
        cleanedContent, // Save cleaned content
        outputType,
        selectedFile.uri
      );
      setHistoryNeedsRefresh(true);

      setTimeout(() => {
        setProcessedOutput({
          id: newDocumentId,
          text: cleanedContent, // Pass cleaned content
          type: outputType, // Pass determined type
          title: outputTitle,
        });
        setCurrentScreen('ProcessedOutput');
      }, 1000);

    } catch (error) {
      console.error('Error processing document:', error);
      setProcessingStatus('Error: Failed to process document.');
      setProcessingProgress(0);
      const userMessage = error.message.includes('API key not valid') || error.message.includes('AUTHENTICATION_ERROR')
        ? 'Invalid Gemini API Key. Please check your key.'
        : 'An unexpected error occurred. Please try again.';
      Alert.alert('Processing Error', userMessage);

      setProcessedOutput({
        text: `Error processing document: ${userMessage}`,
        type: 'text',
        title: 'Processing Failed',
      });
      setCurrentScreen('ProcessedOutput');
    }
  };

  const isPdf = selectedFile && selectedFile.mimeType === 'application/pdf';
  const thumbnailSource = isPdf ? documentPlaceholderImage : (selectedFile && selectedFile.uri ? { uri: selectedFile.uri } : documentPlaceholderImage);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButtonContainer} onPress={() => setCurrentScreen('Upload')}>
          <Ionicons name="arrow-back" size={24} color={COLORS.darkText} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Processing</Text>
        <View style={styles.backButtonContainer} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollViewContent}>
        <View style={styles.imageContainer}>
          {isPdf ? (
            <Image source={require('../../assets/document_icon.png')} style={styles.documentImage} resizeMode="contain" />
          ) : (
            <Image source={thumbnailSource} style={styles.documentImage} resizeMode="contain" />
          )}
          {processingProgress > 0 && processingProgress < 100 && (
            <Animated.View
              style={[
                styles.scanLine,
                {
                  transform: [
                    {
                      translateY: scanAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [-styles.documentImage.maxHeight / 2, styles.documentImage.maxHeight / 2], // Adjust based on image height
                      }),
                    },
                  ],
                },
              ]}
            />
          )}
        </View>

        <View style={styles.processingInfoContainer}>
          <Text style={styles.processingText}>{processingStatus}</Text>
          <View style={styles.progressBarBackground}>
            <View style={[styles.progressBarFill, { width: `${processingProgress}%` }]} />
          </View>
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
    color: COLORS.darkText,
    flex: 1,
    textAlign: 'center',
  },
  scrollViewContent: {
    flexGrow: 1,
    justifyContent: 'space-between',
    paddingBottom: 95,
  },
  imageContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    backgroundColor: COLORS.primaryBackground,
  },
  documentImage: {
    width: '100%',
    height: '100%',
    maxHeight: 537,
    borderRadius: 8,
    backgroundColor: 'beige',
  },
  scanLine: {
    position: 'absolute',
    width: '80%',
    height: 2,
    backgroundColor: COLORS.scanLineColor, // You'll need to define this color in colors.js
    borderRadius: 1,
  },
  processingInfoContainer: {
    padding: 16,
    gap: 12,
    alignItems: 'flex-start',
  },
  processingText: {
    fontFamily: 'Inter-Medium',
    fontSize: 16,
    lineHeight: 24,
    color: COLORS.darkText,
    alignSelf: 'stretch',
  },
  progressBarBackground: {
    height: 8,
    backgroundColor: COLORS.progressBarBackground,
    borderRadius: 4,
    width: '100%',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: COLORS.progressBarFill,
    borderRadius: 4,
  },
});

export default ProcessingScreen;
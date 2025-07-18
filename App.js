import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Image,
  TouchableOpacity,
  SafeAreaView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as Font from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as SecureStore from 'expo-secure-store';
import { GoogleGenAI } from '@google/genai';

// Import database functions
import { initDb, addDocumentToHistory, getHistoryDocuments, updateDocumentTitle, deleteDocument } from './database';

// Import screens
import UploadScreen from './UploadScreen';
import ProcessingScreen from './ProcessingScreen';
import ProcessedOutputScreen from './ProcessedOutputScreen';
import OnboardingScreen from './OnboardingScreen';
import HistoryScreen from './HistoryScreen';
import SettingsScreen from './SettingsScreen'; // Import SettingsScreen

// Import COLORS from constants
import { COLORS } from './constants/colors';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

// Placeholder images
const dummyMeetingNotesImage = require('./assets/meeting_notes.png');
const dummyLectureNotesImage = require('./assets/lecture_notes.png');
const uploadCardImage = require('./assets/upload_card.png');
const documentIconPlaceholder = require('./assets/document_icon.png');
const spreadsheetIconPlaceholder = require('./assets/spreadsheet_icon.jpeg');
const markdownIconPlaceholder = require('./assets/markdown_icon.jpeg');


// Function to validate Gemini API Key (already exists, but including for context)
export const validateGeminiApiKey = async (apiKey) => {
  if (!apiKey || apiKey.trim() === '') {
    return false;
  }
  try {
    const aiTest = new GoogleGenAI({ apiKey });
    await aiTest.models.list();
    console.log('API Key validation successful!');
    return true;
  } catch (error) {
    console.error('API Key validation failed:', error.message);
    return false;
  }
};


export default function App() {
  const [appIsReady, setAppIsReady] = useState(false);
  const [onboardingCompleted, setOnboardingCompleted] = useState(false);
  const [currentScreen, setCurrentScreen] = useState('Home'); // 'Home', 'Upload', 'Processing', 'ProcessedOutput', 'Files', 'Settings'
  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedAIModel, setSelectedAIModel] = useState(null);
  const [processedOutput, setProcessedOutput] = useState(null);
  const [activeMode, setActiveMode] = useState('Generate Notes');
  const [geminiApiKey, setGeminiApiKey] = useState(null);
  const [historyNeedsRefresh, setHistoryNeedsRefresh] = useState(false);
  const [recentHistoryItems, setRecentHistoryItems] = useState([]);
  const [additionalInstructions, setAdditionalInstructions] = useState('');

  const getDocumentIcon = (outputType) => {
    switch (outputType) {
      case 'csv':
        return spreadsheetIconPlaceholder;
      case 'markdown':
        return markdownIconPlaceholder;
      case 'text':
      default:
        return documentIconPlaceholder;
    }
  };

  const formatDate = (isoString) => {
    const date = new Date(isoString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  };

  const fetchRecentHistory = useCallback(async () => {
    try {
      const docs = await getHistoryDocuments();
      setRecentHistoryItems(docs.slice(0, 3));
    } catch (error) {
      console.error('Failed to fetch recent history:', error);
    }
  }, []);

  useEffect(() => {
    async function prepare() {
      try {
        await initDb();

        const onboarded = await SecureStore.getItemAsync('hasOnboarded');
        if (onboarded === 'true') {
          setOnboardingCompleted(true);
          const storedApiKey = await SecureStore.getItemAsync('gemini_api_key');
          if (storedApiKey) {
            const isValid = await validateGeminiApiKey(storedApiKey);
            if (isValid) {
              setGeminiApiKey(storedApiKey);
            } else {
              Alert.alert(
                'Invalid API Key',
                'Your saved Gemini API key is invalid. Please update it in the settings or during onboarding.'
              );
              setOnboardingCompleted(false);
              setCurrentScreen('Onboarding');
            }
          } else {
             setOnboardingCompleted(false);
             setCurrentScreen('Onboarding');
          }
        }

        const storedAIModel = await SecureStore.getItemAsync('selected_ai_model');
          if (storedAIModel) {
            setSelectedAIModel(storedAIModel);
          } else {
            // Set a default if nothing is stored initially
            setSelectedAIModel('gemini-2.0-flash'); // Default model name
            await SecureStore.setItemAsync('selected_ai_model', 'gemini-2.0-flash');
          }

        await Font.loadAsync({
          'Inter-Bold': require('./assets/fonts/Inter-Bold.ttf'),
          'Inter-SemiBold': require('./assets/fonts/Inter-SemiBold.ttf'),
          'Inter-Medium': require('./assets/fonts/Inter-Medium.ttf'),
          'Inter-Regular': require('./assets/fonts/Inter-Regular.ttf'),
        });

        if (onboarded === 'true') {
           await fetchRecentHistory();
        }

      } catch (e) {
        console.warn(e);
      } finally {
        setAppIsReady(true);
      }

      
    }
    prepare();
  }, []);

  useEffect(() => {
    if (historyNeedsRefresh) {
      fetchRecentHistory();
      setHistoryNeedsRefresh(false);
    }
  }, [historyNeedsRefresh, fetchRecentHistory, setHistoryNeedsRefresh]);


  const onLayoutRootView = useCallback(async () => {
    if (appIsReady) {
      await SplashScreen.hideAsync();
    }
  }, [appIsReady]);

  if (!appIsReady) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.primaryBackground }}>
        <ActivityIndicator size="large" color={COLORS.progressBarFill} />
      </View>
    );
  }

  const handleOnboardingComplete = () => {
    setOnboardingCompleted(true);
    fetchRecentHistory();
  };


  const renderScreen = () => {
    if (!onboardingCompleted) {
      return (
        <OnboardingScreen
          onFinishOnboarding={handleOnboardingComplete}
          setGeminiApiKey={setGeminiApiKey}
          validateGeminiApiKey={validateGeminiApiKey}
        />
      );
    }

    switch (currentScreen) {
      case 'Home':
        return (
          <>
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.headerTitle}>Glyphify</Text>
              <TouchableOpacity style={styles.settingsIconContainer} onPress={() => setCurrentScreen('Settings')}>
                <Ionicons name="settings-outline" size={24} color={COLORS.darkText} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.scrollViewContent}>
              
              {/* Upload Section (Home Screen specific link) */}
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Upload</Text>
              </View>
              <TouchableOpacity style={styles.uploadCard} onPress={() => setCurrentScreen('Upload')}>
                <Image source={uploadCardImage} style={styles.uploadCardImage} />
                <View style={styles.uploadCardTextContainer}>
                  <Text style={styles.uploadCardTitle}>Upload or Scan</Text>
                  <Text style={styles.uploadCardDescription}>
                    Choose a file from your device or scan with your camera
                  </Text>
                </View>
              </TouchableOpacity>

              {/* Recents Section */}
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Recents</Text>
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.recentNotesScrollContainer}
              >
                {recentHistoryItems.length === 0 ? (
                    <Text style={styles.noRecentsText}>No recent documents. Upload one!</Text>
                ) : (
                  recentHistoryItems.map((note) => (
                    <TouchableOpacity
                      key={note.id}
                      style={styles.recentNoteCard}
                      onPress={() => {
                        setProcessedOutput({
                          id: note.id,
                          text: note.processedContent,
                          type: note.outputType,
                          title: note.title,
                        });
                        setCurrentScreen('ProcessedOutput');
                      }}
                    >
                      <Image source={getDocumentIcon(note.outputType)} style={styles.recentNoteImage} />
                      <View style={styles.recentNoteTextContainer}>
                        <Text style={styles.recentNoteTitle}>{note.title}</Text>
                        <Text style={styles.recentNoteDate}>Processed on {formatDate(note.processedDate)}</Text>
                      </View>
                    </TouchableOpacity>
                  ))
                )}
              </ScrollView>

            </ScrollView>
          </>
        );
      case 'Upload':
        return (
          <UploadScreen
            setCurrentScreen={setCurrentScreen}
            setSelectedFile={setSelectedFile}
            setActiveTab={setActiveMode}
            activeTab={activeMode}
            setAdditionalInstructions={setAdditionalInstructions}
            additionalInstructions={additionalInstructions}
          />
        );
      case 'Processing':
        return (
          <ProcessingScreen
            setCurrentScreen={setCurrentScreen}
            selectedFile={selectedFile}
            setProcessedOutput={setProcessedOutput}
            geminiApiKey={geminiApiKey}
            addDocumentToHistory={addDocumentToHistory}
            setHistoryNeedsRefresh={setHistoryNeedsRefresh}
            selectedMode={activeMode}
            selectedAIModel={selectedAIModel}
            additionalInstructions={additionalInstructions}
          />
        );
      case 'ProcessedOutput':
        return (
          <ProcessedOutputScreen
            setCurrentScreen={setCurrentScreen}
            processedOutput={processedOutput}
            updateDocumentTitle={updateDocumentTitle}
            deleteDocument={deleteDocument}
            setHistoryNeedsRefresh={setHistoryNeedsRefresh}
          />
        );
      case 'Files':
        return (
          <HistoryScreen
            setCurrentScreen={setCurrentScreen}
            getHistoryDocuments={getHistoryDocuments}
            deleteDocument={deleteDocument}
            updateDocumentTitle={updateDocumentTitle}
            setProcessedOutput={setProcessedOutput}
            historyNeedsRefresh={historyNeedsRefresh}
            setHistoryNeedsRefresh={setHistoryNeedsRefresh}
          />
        );
      case 'Settings': // New case for Settings screen
        return (
          <SettingsScreen
            setCurrentScreen={setCurrentScreen}
            geminiApiKey={geminiApiKey}
            setGeminiApiKey={setGeminiApiKey}
            validateGeminiApiKey={validateGeminiApiKey}
            setSelectedAIModel={setSelectedAIModel}
            selectedAIModel={selectedAIModel}
          />
        );
      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} onLayout={onLayoutRootView}>
      <StatusBar style="dark" />
      <View style={styles.container}>
        {renderScreen()}

        {/* Bottom Navigation (only render if onboarding is complete) */}
        {onboardingCompleted && (
          <View style={styles.bottomNavBar}>
            <TouchableOpacity
              style={[styles.navItem, currentScreen === 'Home' && styles.navItemActive]}
              onPress={() => setCurrentScreen('Home')}
            >
              <Ionicons
                name="home"
                size={24}
                color={currentScreen === 'Home' ? COLORS.darkText : COLORS.inactiveIcon}
              />
              <Text
                style={[
                  styles.navItemText,
                  currentScreen === 'Home' && styles.navItemTextActive,
                ]}
              >
                Home
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.navItem, currentScreen === 'Upload' && styles.navItemActive]}
              onPress={() => setCurrentScreen('Upload')}
            >
              <Ionicons
                name="add-circle"
                size={24}
                color={currentScreen === 'Upload' ? COLORS.darkText : COLORS.inactiveIcon}
              />
              <Text
                style={[
                  styles.navItemText,
                  currentScreen === 'Upload' && styles.navItemTextActive,
                ]}
              >
                Upload
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.navItem, currentScreen === 'Files' && styles.navItemActive]}
              onPress={() => setCurrentScreen('Files')}
            >
              <Ionicons
                name="document-text"
                size={24}
                color={currentScreen === 'Files' ? COLORS.darkText : COLORS.inactiveIcon}
              />
              <Text
                style={[
                  styles.navItemText,
                  currentScreen === 'Files' && styles.navItemTextActive,
                ]}
              >
                Files
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.primaryBackground, // Changed to primaryBackground
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.primaryBackground, // Changed to primaryBackground
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    backgroundColor: COLORS.primaryBackground, // Changed to primaryBackground
  },
  headerTitle: {
    fontFamily: 'Inter-Bold',
    fontSize: 18,
    lineHeight: 23,
    color: COLORS.darkText,
    flex: 1,
    textAlign: 'center',
    marginLeft: 48,
    marginRight: 24,
  },
  settingsIconContainer: {
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollViewContent: {
    paddingBottom: 95,
  },
  sectionHeader: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 12,
  },
  sectionTitle: {
    fontFamily: 'Inter-Bold',
    fontSize: 22,
    lineHeight: 28,
    color: COLORS.darkText,
  },
  recentNotesScrollContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 12,
  },
  recentNoteCard: {
    width: 160,
    height: 221,
    borderRadius: 8,
    gap: 16,
    backgroundColor: COLORS.white,
    overflow: 'hidden',
  },
  recentNoteImage: {
    width: 160,
    height: 160,
    borderRadius: 12,
    resizeMode: 'contain',
    backgroundColor: '#DDCBAA',
    justifyContent: 'center',
    alignItems: 'center',
  },
  recentNoteTextContainer: {
    paddingHorizontal: 0,
    gap: 4,
    paddingLeft: 8,
    paddingRight: 8,
  },
  recentNoteTitle: {
    fontFamily: 'Inter-Medium',
    fontSize: 16,
    lineHeight: 24,
    color: COLORS.darkText,
  },
  recentNoteDate: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    lineHeight: 21,
    color: COLORS.inactiveIcon,
  },
  noRecentsText: {
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    color: COLORS.inactiveIcon,
    textAlign: 'center',
    width: '100%',
    paddingHorizontal: 20,
    marginTop: 20,
  },
  uploadCard: {
    marginHorizontal: 16,
    borderRadius: 12,
    backgroundColor: COLORS.white,
    overflow: 'hidden',
  },
  uploadCardImage: {
    width: '100%',
    height: 201,
    borderRadius: 12,
    resizeMode: 'cover',
  },
  uploadCardTextContainer: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 4,
  },
  uploadCardTitle: {
    fontFamily: 'Inter-Bold',
    fontSize: 18,
    lineHeight: 23,
    color: COLORS.darkText,
  },
  uploadCardDescription: {
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    lineHeight: 24,
    color: COLORS.inactiveIcon,
  },
  bottomNavBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-start',
    paddingTop: 8,
    paddingHorizontal: 16,
    paddingBottom: Platform.OS === 'ios' ? 34 : 12,
    backgroundColor: COLORS.primaryBackground, // Changed to primaryBackground
    borderTopWidth: 1,
    borderColor: COLORS.borderColor,
    height: 95,
  },
  navItem: {
    flex: 1,
    flexDirection: 'column',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 4,
    height: 54,
  },
  navItemText: {
    fontFamily: 'Inter-Medium',
    fontSize: 12,
    lineHeight: 18,
    color: COLORS.inactiveIcon,
  },
  navItemTextActive: {
    color: COLORS.darkText,
  },
});
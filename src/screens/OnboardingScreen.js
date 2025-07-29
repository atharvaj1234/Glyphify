import React, { useState, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Image,
  TouchableOpacity,
  Dimensions,
  TextInput,
  Alert,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as SecureStore from 'expo-secure-store';

import { COLORS } from '../constants/colors';

const { width } = Dimensions.get('window');

const OnboardingScreen = ({ onFinishOnboarding, setGeminiApiKey, validateGeminiApiKey }) => {
  const [currentPage, setCurrentPage] = useState(0);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [apiKeyError, setApiKeyError] = useState(false);
  const scrollViewRef = useRef(null);

  // Mock asset requires. Replace with your actual assets.
  const onboardingImages = {
    slide1: require('../../assets/onboarding_1.png'),
    slide2: require('../../assets/onboarding_2.png'),
    slide3: require('../../assets/onboarding_3.png'),
    slide4: require('../../assets/onboarding_4.png'),
  };

  const slides = [
    {
      image: onboardingImages.slide1,
      title: 'Transform Your Handwritten Notes with AI',
      description:
        'Unlock the power of your handwritten notes with our AI-driven app. Seamlessly convert your notes into digital text, extract tabular data, and structure your thoughts effortlessly.',
      type: 'intro',
    },
    {
      image: onboardingImages.slide2,
      title: 'Key Features',
      // Note: This slide has a null description, as the features list below serves as the content.
      description: null,
      type: 'features',
      features: [
        {
          icon: 'pencil-sharp',
          title: 'AI-Powered OCR',
          description: 'Convert handwritten notes into digital text with unparalleled accuracy.',
        },
        {
          icon: 'document-text-outline',
          title: 'Structured Note Generation',
          description: 'Automatically structure your notes for better organization and readability.',
        },
        {
          icon: 'grid-outline',
          title: 'Tabular Data Extraction',
          description: 'Extract data from tables in your notes with precision and ease.',
        },
      ],
    },
    {
      image: onboardingImages.slide3,
      title: 'Enhance Your Experience',
      description:
        'For enhanced processing or customized features, you can use your own Gemini AI API key. This is optional but recommended for higher processing limits and specific model access.',
      type: 'apiKeyInput',
    },
    {
      image: onboardingImages.slide4,
      title: 'Get Started',
      description:
        'Upload your documents or scan your notes directly within the app. Follow our simple guide to begin transforming your handwritten content.',
      type: 'final',
    },
  ];

  const handleScroll = (event) => {
    const contentOffsetX = event.nativeEvent.contentOffset.x;
    const newPage = Math.round(contentOffsetX / width);
    setCurrentPage(newPage);
    if (newPage !== slides.findIndex(slide => slide.type === 'apiKeyInput')) {
      setApiKeyError(false);
    }
  };

  const scrollToPage = (pageIndex) => {
    scrollViewRef.current?.scrollTo({ x: pageIndex * width, animated: true });
  };

  const handleNext = async () => {
    if (currentPage === slides.findIndex(slide => slide.type === 'apiKeyInput')) {
      if (!apiKeyInput.trim()) {
        Alert.alert('API Key Required', 'Please enter your Gemini API key to proceed.');
        setApiKeyError(true);
        return;
      }

      setIsValidating(true);
      setApiKeyError(false);
      const isValid = await validateGeminiApiKey(apiKeyInput);
      setIsValidating(false);

      if (isValid) {
        await SecureStore.setItemAsync('gemini_api_key', apiKeyInput);
        setGeminiApiKey(apiKeyInput);
        Alert.alert('Success', 'Your Gemini API key is valid and saved!');
        scrollToPage(currentPage + 1);
      } else {
        Alert.alert('Invalid API Key', 'The entered Gemini API key is not valid. Please check and try again.');
        setApiKeyError(true);
      }
    } else if (currentPage < slides.length - 1) {
      scrollToPage(currentPage + 1);
    } else {
      const storedKey = await SecureStore.getItemAsync('gemini_api_key');
      if (!storedKey || !(await validateGeminiApiKey(storedKey))) {
          Alert.alert('API Key Missing or Invalid', 'Please go back and enter a valid Gemini API key.');
          scrollToPage(slides.findIndex(slide => slide.type === 'apiKeyInput'));
          return;
      }
      await SecureStore.setItemAsync('hasOnboarded', 'true');
      onFinishOnboarding();
    }
  };

  const handleChangeApiKey = async () => {
    scrollToPage(slides.findIndex(slide => slide.type === 'apiKeyInput'));
  };

  const isNextButtonDisabled = () => {
    if (currentPage === slides.findIndex(slide => slide.type === 'apiKeyInput')) {
      return !apiKeyInput.trim() || isValidating;
    }
    return isValidating;
  };

  return (
    <ScrollView>
      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        style={styles.scrollView}
        keyboardShouldPersistTaps="handled"
      >
        {slides.map((slide, index) => (
          <View key={index} style={styles.slide}>
            <Image source={slide.image} style={styles.slideImage} resizeMode="cover" />
            <View style={styles.textContainer}>
              <Text style={styles.slideTitle}>{slide.title}</Text>
              {slide.description && (
                <Text style={styles.slideDescription}>{slide.description}</Text>
              )}
              {slide.type === 'features' && (
                <View style={styles.featuresList}>
                  {slide.features.map((feature, featIndex) => (
                    <View key={featIndex} style={styles.featureItem}>
                      <View style={styles.featureIconContainer}>
                        <Ionicons name={feature.icon} size={24} color={COLORS.darkText} />
                      </View>
                      <View style={styles.featureTextContainer}>
                        <Text style={styles.featureTitle}>{feature.title}</Text>
                        <Text style={styles.featureDescription}>{feature.description}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}
              {slide.type === 'apiKeyInput' && (
                <View style={styles.apiKeyInputContainer}>
                  <View style={[styles.textInputWrapper, apiKeyError && styles.textInputError]}>
                    <TextInput
                      style={styles.apiKeyInput}
                      placeholder="Enter your API key"
                      placeholderTextColor={COLORS.inactiveIcon}
                      value={apiKeyInput}
                      onChangeText={(text) => {
                        setApiKeyInput(text);
                        setApiKeyError(false);
                      }}
                      autoCapitalize="none"
                      autoCorrect={false}
                      editable={!isValidating}
                    />
                    {isValidating && (
                      <ActivityIndicator size="small" color={COLORS.progressBarFill} style={styles.validationSpinner} />
                    )}
                  </View>
                  {apiKeyError && (
                    <Text style={styles.errorMessage}>Invalid API Key. Please check it.</Text>
                  )}
                  <TouchableOpacity onPress={() => Alert.alert('API Key Help', 'Visit aistudio.google.com to get your Gemini API key.')}>
                    <Text style={styles.helpText}>Need help obtaining or using an API key?</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        ))}
      </ScrollView>
      <View style={styles.bottomControls}>
        <View style={styles.paginationDots}>
          {slides.map((_, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.dot,
                currentPage === index ? styles.activeDot : styles.inactiveDot,
              ]}
              onPress={() => scrollToPage(index)}
            />
          ))}
        </View>
        {slides[currentPage].type === 'final' ? (
          <View style={styles.finalButtonsContainer}>
            <TouchableOpacity
                style={styles.getStartedButton}
                onPress={handleNext}
                disabled={isNextButtonDisabled()}
            >
              {isValidating ? (
                <ActivityIndicator color={COLORS.blueButtonText} />
              ) : (
                <Text style={styles.getStartedButtonText}>Get Started</Text>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
              style={styles.nextButton}
              onPress={handleNext}
              disabled={isNextButtonDisabled()}
          >
            {isValidating ? (
              <ActivityIndicator color={COLORS.blueButtonText} />
            ) : (
              <Text style={styles.nextButtonText}>Next</Text>
            )}
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.primaryBackground,
  },
  scrollView: {
    flex: 1,
  },
  slide: {
    width: width,
    alignItems: 'center',
    paddingBottom: 20, // Provides spacing at the bottom of slide content
  },
  slideImage: {
    width: width,
    height: 320,
    backgroundColor: COLORS.primaryBackground,
  },
  // This is the corrected style for textContainer
  textContainer: {
    width: '100%',
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  slideTitle: {
    // Using system fonts for compatibility
    fontWeight: 'bold',
    fontSize: 32,
    lineHeight: 40,
    textAlign: 'center',
    color: COLORS.darkText,
    marginTop: 24,
    marginBottom: 12,
  },
  slideDescription: {
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
    color: COLORS.darkText,
    marginBottom: 12,
  },
  featuresList: {
    width: '100%',
    marginTop: 12,
    marginBottom: 12,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    gap: 16,
    minHeight: 72,
  },
  featureIconContainer: {
    width: 48,
    height: 48,
    backgroundColor: COLORS.lightBlueBackground,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  featureTextContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  featureTitle: {
    fontWeight: '500',
    fontSize: 16,
    lineHeight: 24,
    color: COLORS.darkText,
  },
  featureDescription: {
    fontSize: 14,
    lineHeight: 21,
    color: COLORS.inactiveIcon,
  },
  apiKeyInputContainer: {
    width: '100%',
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 12,
  },
  textInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    height: 56,
    borderWidth: 1,
    borderColor: COLORS.dashedBorder,
    borderRadius: 12,
    backgroundColor: COLORS.primaryBackground,
    paddingHorizontal: 15,
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  textInputError: {
    borderColor: 'red',
  },
  apiKeyInput: {
    fontSize: 16,
    lineHeight: 24,
    color: COLORS.darkText,
    flex: 1,
    paddingRight: 10,
  },
  validationSpinner: {
    marginLeft: 10,
  },
  errorMessage: {
    fontSize: 14,
    color: 'red',
    marginBottom: 8,
    textAlign: 'center',
    width: '100%',
  },
  helpText: {
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
    color: COLORS.inactiveIcon,
    marginBottom: 12,
  },
  bottomControls: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: COLORS.primaryBackground,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20, // Added extra padding for Android notch safety
  },
  paginationDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingVertical: 20,
    gap: 12,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  activeDot: {
    backgroundColor: COLORS.onboardingBlue,
  },
  inactiveDot: {
    backgroundColor: COLORS.progressBarBackground,
  },
  nextButton: {
    backgroundColor: COLORS.onboardingBlue,
    borderRadius: 24,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 20,
    marginTop: 12,
  },
  nextButtonText: {
    fontWeight: 'bold',
    fontSize: 16,
    lineHeight: 24,
    color: COLORS.blueButtonText,
  },
  finalButtonsContainer: {
    width: '100%',
    alignItems: 'center',
    marginTop: 12,
    gap: 12,
  },
  getStartedButton: {
    backgroundColor: COLORS.onboardingBlue,
    borderRadius: 24,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 20,
  },
  getStartedButtonText: {
    fontWeight: 'bold',
    fontSize: 16,
    lineHeight: 24,
    color: COLORS.blueButtonText,
  },
  changeApiKeyButton: {
    backgroundColor: COLORS.lightBlueBackground,
    borderRadius: 24,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 20,
  },
  changeApiKeyButtonText: {
    fontWeight: 'bold',
    fontSize: 16,
    lineHeight: 24,
    color: COLORS.darkText,
  },
});

export default OnboardingScreen;
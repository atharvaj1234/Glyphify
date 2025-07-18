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
  ActivityIndicator, // Added for loading state
  Platform, // Added for platform-specific padding
  KeyboardAvoidingView
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { COLORS } from './constants/colors';

const { width } = Dimensions.get('window');

const OnboardingScreen = ({ onFinishOnboarding, setGeminiApiKey, validateGeminiApiKey }) => {
  const [currentPage, setCurrentPage] = useState(0);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [apiKeyError, setApiKeyError] = useState(false);
  const scrollViewRef = useRef(null);

  const onboardingImages = {
    slide1: require('./assets/onboarding_1.png'),
    slide2: require('./assets/onboarding_2.png'),
    slide3: require('./assets/onboarding_3.png'),
    slide4: require('./assets/onboarding_4.png'),
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
    // Reset API key error when scrolling away from the API key slide
    if (newPage !== slides.findIndex(slide => slide.type === 'apiKeyInput')) {
      setApiKeyError(false);
    }
  };

  const scrollToPage = (pageIndex) => {
    scrollViewRef.current?.scrollTo({ x: pageIndex * width, animated: true });
  };

  const handleNext = async () => {
    if (currentPage === slides.findIndex(slide => slide.type === 'apiKeyInput')) {
      // If on API key input slide, validate the key first
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
        await AsyncStorage.setItem('gemini_api_key', apiKeyInput);
        setGeminiApiKey(apiKeyInput); // Update API key in App.js state
        Alert.alert('Success', 'Your Gemini API key is valid and saved!');
        scrollToPage(currentPage + 1);
      } else {
        Alert.alert('Invalid API Key', 'The entered Gemini API key is not valid. Please check and try again.');
        setApiKeyError(true);
        return;
      }
    } else if (currentPage < slides.length - 1) {
      scrollToPage(currentPage + 1);
    } else {
      // On the final slide, "Get Started"
      // Check if API key is already set (it should be validated and set by now)
      const storedKey = await AsyncStorage.getItem('gemini_api_key');
      if (!storedKey || !(await validateGeminiApiKey(storedKey))) {
          Alert.alert('API Key Missing or Invalid', 'Please go back to "Enhance Your Experience" and enter a valid Gemini API key.');
          scrollToPage(slides.findIndex(slide => slide.type === 'apiKeyInput')); // Go back to API key input
          return;
      }
      await AsyncStorage.setItem('hasOnboarded', 'true');
      onFinishOnboarding();
    }
  };

  const handleChangeApiKey = async () => {
    scrollToPage(slides.findIndex(slide => slide.type === 'apiKeyInput'));
  };

  const isNextButtonDisabled = () => {
    if (currentPage === slides.findIndex(slide => slide.type === 'apiKeyInput')) {
      return !apiKeyInput.trim() || isValidating; // Disable if empty or validating
    }
    return isValidating; // Disable only if validating on other slides (shouldn't happen)
  };


  return (
    <View style={styles.container}>
            <KeyboardAvoidingView
        style={styles.keyboardAvoidingContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} // 'padding' for iOS, 'height' or 'position' for Android
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0} // Adjust offset if header is fixed
      >
      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollViewContent}
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
                        setApiKeyError(false); // Clear error on text change
                      }}
                      autoCapitalize="none"
                      autoCorrect={false}
                      editable={!isValidating} // Disable input while validating
                    />
                    {isValidating && (
                      <ActivityIndicator size="small" color={COLORS.progressBarFill} style={styles.validationSpinner} />
                    )}
                  </View>
                  {apiKeyError && (
                    <Text style={styles.errorMessage}>Invalid API Key. Please check it.</Text>
                  )}
                  <TouchableOpacity onPress={() => Alert.alert('API Key Help', 'Visit https://aistudio.google.com/app/apikey to get your Gemini API key.')}>
                    <Text style={styles.helpText}>Need help obtaining or using an API key?</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        ))}
      </ScrollView>
      </KeyboardAvoidingView>

      {/* Bottom Navigation / Controls */}
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
                disabled={isNextButtonDisabled()} // Disable if validating
            >
              {isValidating ? (
                <ActivityIndicator color={COLORS.blueButtonText} />
              ) : (
                <Text style={styles.getStartedButtonText}>Get Started</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity style={styles.changeApiKeyButton} onPress={handleChangeApiKey}>
              <Text style={styles.changeApiKeyButtonText}>Change API Key</Text>
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
    </View>
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
  scrollViewContent: {
    // Width is determined by the `width` of each `slide` component multiplied by slide count
  },
  slide: {
    width: width,
    alignItems: 'center',
    paddingBottom: 20,
  },
  slideImage: {
    width: width,
    height: 320,
    backgroundColor: COLORS.primaryBackground,
  },
  textContainer: {
    width: '100%',
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  slideTitle: {
    fontFamily: 'Inter-Bold',
    fontSize: 32,
    lineHeight: 40,
    textAlign: 'center',
    color: COLORS.darkText,
    marginTop: 24,
    marginBottom: 12,
  },
  slideDescription: {
    fontFamily: 'Inter-Regular',
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
    fontFamily: 'Inter-Medium',
    fontSize: 16,
    lineHeight: 24,
    color: COLORS.darkText,
  },
  featureDescription: {
    fontFamily: 'Inter-Regular',
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
    flexDirection: 'row', // To align input and spinner
    alignItems: 'center',
    width: '100%',
    height: 56,
    borderWidth: 1,
    borderColor: COLORS.dashedBorder,
    borderRadius: 12,
    backgroundColor: COLORS.primaryBackground,
    paddingHorizontal: 15,
    justifyContent: 'space-between', // Push spinner to end
    marginBottom: 16,
  },
  textInputError: {
    borderColor: 'red', // Highlight border in red on error
  },
  apiKeyInput: {
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    lineHeight: 24,
    color: COLORS.darkText,
    flex: 1, // Allow input to take most space
    paddingRight: 10, // Space for spinner
  },
  validationSpinner: {
    marginLeft: 10,
  },
  errorMessage: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: 'red',
    marginBottom: 8,
    textAlign: 'center',
    width: '100%',
  },
  helpText: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
    color: COLORS.inactiveIcon,
    marginBottom: 12,
  },
  bottomControls: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: COLORS.primaryBackground,
    paddingBottom: Platform.OS === 'ios' ? 34 : 12,
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
    fontFamily: 'Inter-Bold',
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
    fontFamily: 'Inter-Bold',
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
    fontFamily: 'Inter-Bold',
    fontSize: 16,
    lineHeight: 24,
    color: COLORS.darkText,
  },
});

export default OnboardingScreen;
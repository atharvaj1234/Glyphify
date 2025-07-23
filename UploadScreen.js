import React, { useState, useEffect } from "react";
import { Image } from "react-native";
import { SvgUri } from 'react-native-svg';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Platform,
  Alert,
  TextInput,
  KeyboardAvoidingView,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import * as DocumentPicker from "expo-document-picker"; // Import DocumentPicker
import { COLORS } from "./constants/colors";

const UploadScreen = ({
  setCurrentScreen,
  setSelectedFile,
  selectedFile,
  setActiveTab,
  activeTab,
  setAdditionalInstructions,
  additionalInstructions,
}) => {

    const [fileSelected, setFileSelected] = useState(false); // State for the toggle button

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["application/pdf", "image/jpeg", "image/png"], // Accepted formats
        copyToCacheDirectory: true, // Important for accessing the file URI
      });

      if (result.canceled) {
        console.log("Document picking cancelled.");
        return;
      }

      const file = result.assets[0]; // Access the first selected asset
      console.log("Selected file:", file);

      // Set the selected file state
      setSelectedFile(file);
      setFileSelected(file);
    } catch (err) {
      console.error("Error picking document:", err);
      Alert.alert("Error", "Failed to pick document. Please try again.");
    }
  };

  const handleNext = async () => {
      setCurrentScreen("Processing");
  }
  return (
    <ScrollView contentContainerStyle={styles.scrollViewContent}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButtonContainer}
            onPress={() => setCurrentScreen("Home")}
          >
            <Ionicons name="arrow-back" size={24} color={COLORS.darkText} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Upload</Text>
          {/* Placeholder for right-side alignment or empty space */}
          <View style={styles.backButtonContainer} />
        </View>
        <KeyboardAvoidingView
          style={styles.keyboardAvoidingContainer}
          behavior={Platform.OS === "ios" ? "padding" : "height"} // 'padding' for iOS, 'height' or 'position' for Android
          keyboardVerticalOffset={Platform.OS === "ios" ? 10 : 10} // Adjust offset if header is fixed
        >
          <ScrollView contentContainerStyle={styles.scrollViewContent}>
            {/* Main Title */}
            <View style={styles.mainTitleContainer}>
              <Text style={styles.mainTitle}>Upload your notes</Text>
            </View>

            {/* Description */}
            <View style={styles.descriptionContainer}>
              <Text style={styles.description}>
                Upload your handwritten notes or documents for precise OCR.
              </Text>
            </View>

            {/* Toggle Button (Generate Notes / Extract Text) */}
            <View style={styles.toggleContainer}>
              <View style={styles.toggleBackground}>
                <TouchableOpacity
                  style={[
                    styles.toggleButton,
                    activeTab === "Generate Notes" && styles.toggleButtonActive,
                  ]}
                  onPress={() => setActiveTab("Generate Notes")}
                >
                  <Text
                    style={[
                      styles.toggleButtonText,
                      activeTab === "Generate Notes" &&
                        styles.toggleButtonTextActive,
                    ]}
                  >
                    Generate Notes
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.toggleButton,
                    activeTab === "Extract Text" && styles.toggleButtonActive,
                  ]}
                  onPress={() => setActiveTab("Extract Text")}
                >
                  <Text
                    style={[
                      styles.toggleButtonText,
                      activeTab === "Extract Text" &&
                        styles.toggleButtonTextActive,
                    ]}
                  >
                    Extract Text
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Drag and Drop Area */}
            <View style={styles.uploadAreaContainer}>
              <View style={styles.dashedBorderBox}>
              {fileSelected ? (
                <View style={styles.filePreviewContainer}>
                  {fileSelected.mimeType === "application/pdf" ? (
                    <Image
                      source={require("./assets/document_icon.png")}
                      style={styles.fileIcon}
                    />
                  ) : (
                    <Image
                      source={{ uri: fileSelected.uri }}
                      style={styles.filePreviewImage}
                    />
                  )}
                  <Text style={styles.fileNameText} numberOfLines={1} ellipsizeMode="middle">
                    {fileSelected.name}
                  </Text>
                  <TouchableOpacity
                    style={styles.changeFileButton}
                    onPress={pickDocument}
                  >
                    <Text style={styles.changeFileButtonText}>Change File</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <>
                  <View style={styles.uploadTextContainer}>
                    <Text style={styles.uploadTextTitle}>
                      Drag and drop files here
                    </Text>
                    <Text style={styles.uploadTextOr}>Or</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.browseFilesButton}
                    onPress={pickDocument}
                  >
                    <Text style={styles.browseFilesButtonText}>Browse Files</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
            </View>

            {/* Accepted Formats Info */}
            <View style={styles.formatsInfoContainer}>
              <Text style={styles.formatsInfoText}>
                Accepted formats: PDF, JPG, PNG | Max size: 10MB
              </Text>
            </View>

            {/* Additional Instructions Text Box */}
            <View style={styles.instructionsContainer}>
              <Text style={styles.instructionsTitle}>
                Additional Instructions (Optional)
              </Text>
              <TextInput
                style={styles.instructionsInput}
                multiline
                placeholder="e.g., 'Extract names and marks', 'Focus on chapter 3', 'Ignore images'"
                placeholderTextColor={COLORS.inactiveIcon}
                value={additionalInstructions}
                onChangeText={setAdditionalInstructions}
              />
                  <TouchableOpacity
                      style={styles.nextButton}
                      onPress={handleNext}
                  >
                      <Text style={styles.nextButtonText}>Start</Text>
                  </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.primaryBackground,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    backgroundColor: COLORS.primaryBackground,
  },
  backButtonContainer: {
    width: 48,
    height: 48,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontFamily: "Inter-Bold",
    fontSize: 18,
    lineHeight: 23,
    color: COLORS.darkText,
    flex: 1,
    textAlign: "center",
  },
  scrollViewContent: {
    paddingBottom: 95, // Account for the bottom navigation bar
  },
  mainTitleContainer: {
    alignItems: "center",
    paddingTop: 20,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  mainTitle: {
    fontFamily: "Inter-Bold",
    fontSize: 28,
    lineHeight: 35,
    textAlign: "center",
    color: COLORS.darkText,
  },
  descriptionContainer: {
    alignItems: "center",
    paddingTop: 4,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  description: {
    fontFamily: "Inter-Regular",
    fontSize: 16,
    lineHeight: 24,
    textAlign: "center",
    color: COLORS.darkText,
  },
  toggleContainer: {
    flexDirection: "row",
    justifyContent: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  toggleBackground: {
    flexDirection: "row",
    backgroundColor: COLORS.lightBlueBackground,
    borderRadius: 8,
    padding: 4,
    flex: 1,
  },
  toggleButton: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  toggleButtonActive: {
    backgroundColor: COLORS.primaryBackground,
    shadowColor: COLORS.shadowColor,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  toggleButtonText: {
    fontFamily: "Inter-Medium",
    fontSize: 14,
    lineHeight: 21,
    color: COLORS.inactiveIcon,
  },
  toggleButtonTextActive: {
    color: COLORS.darkText,
  },
  uploadAreaContainer: {
    padding: 16,
  },
  dashedBorderBox: {
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: COLORS.dashedBorder,
    borderRadius: 8,
    alignItems: "center",
    paddingVertical: 56,
    paddingHorizontal: 24,
    gap: 24,
  },
  uploadTextContainer: {
    alignItems: "center",
    gap: 8,
  },
  uploadTextTitle: {
    fontFamily: "Inter-Bold",
    fontSize: 18,
    lineHeight: 23,
    textAlign: "center",
    color: COLORS.darkText,
  },
  uploadTextOr: {
    fontFamily: "Inter-Regular",
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
    color: COLORS.darkText,
  },
  browseFilesButton: {
    backgroundColor: COLORS.lightBlueBackground,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    justifyContent: "center",
    alignItems: "center",
    minWidth: 84,
    height: 40,
  },
  browseFilesButtonText: {
    fontFamily: "Inter-Bold",
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
    color: COLORS.darkText,
  },
  formatsInfoContainer: {
    alignItems: "center",
    paddingTop: 4,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  formatsInfoText: {
    fontFamily: "Inter-Regular",
    fontSize: 16,
    lineHeight: 24,
    textAlign: "center",
    color: COLORS.darkText,
  },
  instructionsContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    display:'flex',
    alignItems: 'center'
  },
  instructionsTitle: {
    fontFamily: "Inter-Bold",
    fontSize: 16,
    lineHeight: 24,
    color: COLORS.darkText,
    marginBottom: 8,
  },
  instructionsInput: {
    minHeight: 100, // Make it a multiline text area
    borderWidth: 1,
    borderColor: COLORS.dashedBorder,
    borderRadius: 8,
    padding: 12,
    fontFamily: "Inter-Regular",
    fontSize: 16,
    lineHeight: 24,
    color: COLORS.darkText,
    backgroundColor: COLORS.primaryBackground,
    textAlignVertical: "top", // Aligns text to the top for multiline input
  },
  filePreviewContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 20,
  },
  fileIcon: {
    width: 80,
    height: 80,
    resizeMode: 'contain',
  },
  filePreviewImage: {
    width: 150,
    height: 150,
    resizeMode: 'contain',
    borderRadius: 8,
  },
  fileNameText: {
    fontFamily: "Inter-Medium",
    fontSize: 16,
    color: COLORS.darkText,
    maxWidth: '80%',
  },
  changeFileButton: {
    backgroundColor: COLORS.lightBlueBackground,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 84,
    height: 40,
    marginTop: 10,
  },
  changeFileButtonText: {
    fontFamily: "Inter-Bold",
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
    color: COLORS.darkText,
  },
  nextButton: {
    backgroundColor: COLORS.onboardingBlue,
    borderRadius: 24,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    width: '70%',
    paddingHorizontal: 20,
    margin: 12,
  },
  nextButtonText: {
    fontWeight: 'bold',
    fontSize: 16,
    lineHeight: 24,
    color: COLORS.blueButtonText,
  },
});

export default UploadScreen;

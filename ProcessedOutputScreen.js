import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  Dimensions,
  Platform,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import Markdown from 'react-native-markdown-display';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';

import { Remarkable } from 'remarkable'; // Import Remarkable parser <--- NEW IMPORT

import { COLORS } from './constants/colors';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// Initialize Remarkable parser once outside the component to avoid re-creation on every render
const md = new Remarkable();

const ProcessedOutputScreen = ({
  setCurrentScreen,
  processedOutput,
  updateDocumentTitle,
  deleteDocument,
  setHistoryNeedsRefresh,
}) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editableTitle, setEditableTitle] = useState(processedOutput?.title || 'Untitled Document');

  const outputText = processedOutput?.text || 'No content to display.';
  const outputType = processedOutput?.type || 'text';
  const documentId = processedOutput?.id;

  const handleSaveEditedTitle = async () => {
    if (!editableTitle.trim()) {
      Alert.alert('Error', 'Title cannot be empty.');
      return;
    }
    if (documentId && editableTitle.trim() !== processedOutput.title) {
      try {
        await updateDocumentTitle(documentId, editableTitle.trim());
        Alert.alert('Success', 'Title updated in history!');
        setHistoryNeedsRefresh(true);
        setIsEditingTitle(false);
      } catch (error) {
        console.error('Error updating title in DB:', error);
        Alert.alert('Error', 'Failed to update title.');
      }
    } else {
      setIsEditingTitle(false);
    }
  };

  const handleDelete = async () => {
    setShowDropdown(false);
    if (!documentId) {
      Alert.alert('Error', 'Cannot delete: Document ID not found.');
      return;
    }
    Alert.alert(
      'Confirm Delete',
      'Are you sure you want to delete this document from history?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          onPress: async () => {
            try {
              await deleteDocument(documentId);
              Alert.alert('Success', 'Document deleted.');
              setHistoryNeedsRefresh(true);
              setCurrentScreen('Files');
            } catch (error) {
              console.error('Error deleting document:', error);
              Alert.alert('Error', 'Failed to delete document.');
            }
          },
        },
      ]
    );
  };

  // Helper function to generate HTML for PDF
  const generateHtmlForPdf = (content, type) => {
    let htmlContent = '';
    const titleHtml = `<h1 style="font-family: 'Inter-Bold'; font-size: 24px; color: ${COLORS.darkText}; margin-bottom: 15px;">${editableTitle}</h1>`;

    const basicHtmlStyles = `
      <style>
        @font-face {
          font-family: 'Inter-Regular';
          src: url('Inter-Regular.ttf'); /* Placeholder - fonts aren't directly embedded in HTML for print easily */
        }
        @font-face {
          font-family: 'Inter-Bold';
          src: url('Inter-Bold.ttf'); /* Placeholder */
        }
        body { font-family: 'Inter-Regular', sans-serif; font-size: 16px; line-height: 1.5; color: ${COLORS.darkText}; padding: 20px; }
        h1, h2, h3, h4, h5, h6 { font-family: 'Inter-Bold', sans-serif; color: ${COLORS.darkText}; margin-top: 1em; margin-bottom: 0.5em;}
        h1 { font-size: 2em; }
        h2 { font-size: 1.5em; }
        h3 { font-size: 1.2em; }
        ul { margin-left: 20px; }
        pre { background-color: #f8f8f8; border: 1px solid #ddd; padding: 10px; border-radius: 5px; overflow-x: auto; white-space: pre-wrap; word-wrap: break-word; }
        code { background-color: #eee; padding: 2px 4px; border-radius: 3px; }
        table { width: 100%; border-collapse: collapse; margin-top: 15px; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; vertical-align: top; }
        th { background-color: ${COLORS.lightBlueBackground}; font-family: 'Inter-Bold'; }
      </style>
    `;

    if (type === 'markdown') {
      htmlContent = md.render(content); // Use Remarkable to convert Markdown to HTML <--- KEY CHANGE
    } else if (type === 'csv') {
      const rows = content.split('\n').map((row) => row.split(','));
      let tableHtml = '<table>';
      rows.forEach((row, rowIndex) => {
        tableHtml += '<tr>';
        row.forEach((cell) => {
          tableHtml += rowIndex === 0 ? `<th>${cell.trim()}</th>` : `<td>${cell.trim()}</td>`;
        });
        tableHtml += '</tr>';
      });
      tableHtml += '</table>';
      htmlContent = tableHtml;
    } else {
      htmlContent = `<p>${content.replace(/\n/g, '<br/>')}</p>`;
    }

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>${editableTitle}</title>
        ${basicHtmlStyles}
      </head>
      <body>
        ${titleHtml}
        ${htmlContent}
      </body>
      </html>
    `;
  };

  const exportFile = async (format) => {
    setShowDropdown(false);
    try {
      let fileUri = '';
      let filename = editableTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase();
      let mimeType = '';
      let contentToSave = outputText; // This is the content for direct file saving

      if (format === 'pdf') {
        const html = generateHtmlForPdf(outputText, outputType);
        const { uri } = await Print.printToFileAsync({ html });
        fileUri = uri;
        filename = `${filename}.pdf`;
        mimeType = 'application/pdf';
      } else if (format === 'markdown') {
        fileUri = `${FileSystem.documentDirectory}${filename}.md`;
        await FileSystem.writeAsStringAsync(fileUri, outputText);
        filename = `${filename}.md`;
        mimeType = 'text/markdown';
      } else if (format === 'csv') {
        fileUri = `${FileSystem.documentDirectory}${filename}.csv`;
        await FileSystem.writeAsStringAsync(fileUri, outputText);
        filename = `${filename}.csv`;
        mimeType = 'text/csv';
      } else if (format === 'text') {
        fileUri = `${FileSystem.documentDirectory}${filename}.txt`;
        await FileSystem.writeAsStringAsync(fileUri, outputText);
        filename = `${filename}.txt`;
        mimeType = 'text/plain';
      } else if (format === 'excel') {
        fileUri = `${FileSystem.documentDirectory}${filename}.csv`; // Excel compatibility via CSV
        await FileSystem.writeAsStringAsync(fileUri, outputText);
        filename = `${filename}.csv`;
        mimeType = 'application/vnd.ms-excel';
        Alert.alert('Export to Excel', 'Exporting as CSV. You can open this file directly in Excel.');
      } else {
        Alert.alert('Error', 'Unsupported export format.');
        return;
      }

      if (!(await Sharing.isAvailableAsync())) {
        Alert.alert('Error', "Sharing is not available on your device.");
        return;
      }

      await Sharing.shareAsync(fileUri, {
        mimeType,
        dialogTitle: `Export ${filename}`,
        UTI: Platform.OS === 'ios' ? filename.split('.').pop() : undefined,
      });

    } catch (error) {
      console.error('Error exporting file:', error);
      Alert.alert('Export Error', `Failed to export file: ${error.message}`);
    }
  };

  const getExportButtonDetails = () => {
    switch (outputType) {
      case 'markdown':
        return {
          mainButtonText: 'Export PDF',
          mainButtonAction: () => exportFile('pdf'),
          dropdownOptions: [
            { label: 'Export Markdown', action: () => exportFile('markdown') },
          ],
        };
      case 'csv':
        return {
          mainButtonText: 'Export Excel Sheet',
          mainButtonAction: () => exportFile('excel'),
          dropdownOptions: [
            { label: 'Export CSV', action: () => exportFile('csv') },
            { label: 'Export PDF', action: () => exportFile('pdf') },
          ],
        };
      case 'text':
      default:
        return {
          mainButtonText: 'Export as Text',
          mainButtonAction: () => exportFile('text'),
          dropdownOptions: [
            { label: 'Export PDF', action: () => exportFile('pdf') },
          ],
        };
    }
  };

  const { mainButtonText, mainButtonAction, dropdownOptions } = getExportButtonDetails();

  const renderContent = () => {
    if (outputType === 'markdown') {
      return (
        <ScrollView horizontal contentContainerStyle={styles.markdownScrollContent}>
          <Markdown style={markdownStyles}>{outputText}</Markdown>
        </ScrollView>
      );
    } else if (outputType === 'csv') {
      const rows = outputText.split('\n').map((row) => row.split(','));

      const numColumns = rows[0] ? rows[0].length : 0;
      const calculatedColumnWidths = Array(numColumns).fill(0);

      rows.forEach((row) => {
        row.forEach((cellContent, colIndex) => {
          const charWidthPx = 8;
          const cellPaddingPx = 16;
          const estimatedWidth = (cellContent ? cellContent.trim().length : 0) * charWidthPx + cellPaddingPx;

          if (estimatedWidth > calculatedColumnWidths[colIndex]) {
            calculatedColumnWidths[colIndex] = estimatedWidth;
          }
        });
      });

      const minColWidth = 80;
      for (let i = 0; i < numColumns; i++) {
        if (calculatedColumnWidths[i] < minColWidth) {
          calculatedColumnWidths[i] = minColWidth;
        }
      }

      return (
        <ScrollView horizontal contentContainerStyle={styles.csvScrollContent}>
          <View style={styles.csvTable}>
            {rows.map((row, rowIndex) => (
              <View key={rowIndex} style={styles.csvRow}>
                {row.map((cell, cellIndex) => (
                  <Text
                    key={cellIndex}
                    style={[
                      rowIndex === 0 ? styles.csvHeaderCell : styles.csvCell,
                      { width: calculatedColumnWidths[cellIndex] || minColWidth },
                    ]}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                  >
                    {cell.trim()}
                  </Text>
                ))}
              </View>
            ))}
          </View>
        </ScrollView>
      );
    } else {
      return (
        <ScrollView horizontal contentContainerStyle={styles.textScrollContent}>
          <Text style={styles.contentText}>{outputText}</Text>
        </ScrollView>
      );
    }
  };

  const handleEditTitleInDropdown = () => {
    setShowDropdown(false);
    setIsEditingTitle(true);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButtonContainer} onPress={() => setCurrentScreen('Home')}>
          <Ionicons name="arrow-back" size={24} color={COLORS.darkText} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Processed Output</Text>
        {/* Dropdown for More Options */}
        <View style={styles.dropdownContainer}>
          <TouchableOpacity onPress={() => setShowDropdown(!showDropdown)}>
            <Ionicons name="ellipsis-vertical" size={24} color={COLORS.darkText} />
          </TouchableOpacity>
          {showDropdown && (
            <View style={styles.dropdownMenu}>
              {/* Existing Edit/Delete options */}
              <TouchableOpacity style={styles.dropdownItem} onPress={handleEditTitleInDropdown}>
                <Text style={styles.dropdownItemText}>Edit Title</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.dropdownItem} onPress={handleDelete}>
                <Text style={styles.dropdownItemText}>Delete</Text>
              </TouchableOpacity>
              {/* New Export options in dropdown */}
              {dropdownOptions.map((option, index) => (
                <TouchableOpacity
                  key={option.label} // Use label as key for stability
                  style={[styles.dropdownItem, index === dropdownOptions.length - 1 ? styles.lastDropdownItem : {}]}
                  onPress={option.action}
                >
                  <Text style={styles.dropdownItemText}>{option.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollViewContent}>
        {/* Document Title */}
        <View style={styles.documentTitleContainer}>
          <Text style={styles.documentTitle}>{editableTitle}</Text>
        </View>

        {/* Extracted Content */}
        <View style={styles.contentContainer}>
          {renderContent()}
        </View>

        {/* Main Export Button */}
        <View style={styles.saveButtonRow}>
          <TouchableOpacity style={styles.saveButton} onPress={mainButtonAction}>
            <Text style={styles.saveButtonText}>{mainButtonText}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Edit Title Modal */}
      <Modal
        visible={isEditingTitle}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsEditingTitle(false)}
      >
        <TouchableOpacity
          style={styles.modalBackground}
          activeOpacity={1}
          onPress={() => setIsEditingTitle(false)}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Edit Title</Text>
            <TextInput
              style={styles.modalTextInput}
              value={editableTitle}
              onChangeText={setEditableTitle}
              placeholder="Enter new title"
              autoFocus
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.modalButtonCancel} onPress={() => setIsEditingTitle(false)}>
                <Text style={styles.modalButtonTextCancel}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalButtonSave} onPress={handleSaveEditedTitle}>
                <Text style={styles.modalButtonTextSave}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

// Styles for Markdown rendering
const markdownStyles = StyleSheet.create({
  body: {
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    lineHeight: 24,
    color: COLORS.darkText,
    width: screenWidth - 32,
    flexShrink: 0,
  },
  heading1: {
    fontFamily: 'Inter-Bold',
    fontSize: 28,
    lineHeight: 35,
    marginTop: 20,
    marginBottom: 10,
    color: COLORS.darkText,
  },
  heading2: {
    fontFamily: 'Inter-Bold',
    fontSize: 22,
    lineHeight: 28,
    marginTop: 18,
    marginBottom: 8,
    color: COLORS.darkText,
  },
  heading3: {
    fontFamily: 'Inter-Medium',
    fontSize: 18,
    lineHeight: 23,
    marginTop: 16,
    marginBottom: 6,
    color: COLORS.darkText,
  },
  bullet_list: {
    marginBottom: 5,
  },
  list_item: {
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    lineHeight: 24,
    color: COLORS.darkText,
  },
  code_inline: {
    fontFamily: 'monospace',
    backgroundColor: '#eee',
    paddingHorizontal: 4,
    borderRadius: 3,
  },
  code_block: {
    fontFamily: 'monospace',
    backgroundColor: '#f8f8f8',
    padding: 10,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#ddd',
    marginTop: 10,
    marginBottom: 10,
    minWidth: '100%',
  },
});

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
  dropdownContainer: {
    position: 'relative',
    width: 48,
    alignItems: 'flex-end',
    paddingRight: 8,
  },
  dropdownMenu: {
    position: 'absolute',
    top: 40,
    right: 0,
    backgroundColor: COLORS.white,
    borderRadius: 8,
    shadowColor: COLORS.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    zIndex: 100,
    minWidth: 160,
  },
  dropdownItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderColor,
  },
  lastDropdownItem: {
    borderBottomWidth: 0,
  },
  dropdownItemText: {
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    color: COLORS.darkText,
  },
  scrollViewContent: {
    paddingBottom: 95,
    flexGrow: 1,
  },
  documentTitleContainer: {
    paddingTop: 20,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  documentTitle: {
    fontFamily: 'Inter-Bold',
    fontSize: 22,
    lineHeight: 28,
    color: COLORS.darkText,
  },
  contentContainer: {
    paddingTop: 4,
    paddingBottom: 12,
  },
  markdownScrollContent: {
    flexGrow: 1,
    padding: 16,
  },
  csvScrollContent: {
    flexGrow: 1,
    padding: 4,
  },
  textScrollContent: {
    flexGrow: 1,
  },
  contentText: {
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    lineHeight: 24,
    color: COLORS.darkText,
    width: screenWidth - 32,
    flexShrink: 0,
  },
  // CSV Specific Styles
  csvTable: {
    borderWidth: 1,
    borderColor: COLORS.borderColor,
    borderRadius: 8,
    backgroundColor: COLORS.white,
    overflow: 'hidden',
  },
  csvRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderColor,
    minHeight: 40,
    alignItems: 'stretch',
  },
  csvHeaderCell: {
    padding: 8,
    fontFamily: 'Inter-Bold',
    fontSize: 14,
    color: COLORS.darkText,
    textAlign: 'center',
    backgroundColor: COLORS.lightBlueBackground,
    borderRightWidth: 1,
    borderColor: COLORS.borderColor,
    flexShrink: 0,
    justifyContent: 'center',
  },
  csvCell: {
    padding: 8,
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: COLORS.darkText,
    textAlign: 'center',
    borderRightWidth: 1,
    borderColor: COLORS.borderColor,
    flexShrink: 0,
    justifyContent: 'center',
  },
  saveButtonRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginTop: 'auto',
  },
  saveButton: {
    backgroundColor: COLORS.blueButton,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    justifyContent: 'center',
    alignItems: 'center',
    height: 40,
    minWidth: 84,
  },
  saveButtonText: {
    fontFamily: 'Inter-Bold',
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
    color: COLORS.blueButtonText,
  },
  modalBackground: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 20,
    width: '80%',
    alignItems: 'center',
  },
  modalTitle: {
    fontFamily: 'Inter-Bold',
    fontSize: 20,
    marginBottom: 15,
    color: COLORS.darkText,
  },
  modalTextInput: {
    borderWidth: 1,
    borderColor: COLORS.borderColor,
    borderRadius: 8,
    padding: 12,
    width: '100%',
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    color: COLORS.darkText,
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
  },
  modalButtonCancel: {
    backgroundColor: COLORS.lightBlueBackground,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  modalButtonSave: {
    backgroundColor: COLORS.blueButton,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  modalButtonTextCancel: {
    fontFamily: 'Inter-Medium',
    color: COLORS.darkText,
  },
  modalButtonTextSave: {
    fontFamily: 'Inter-Medium',
    color: COLORS.white,
  },
});

export default ProcessedOutputScreen;
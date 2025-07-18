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
import MarkdownIt from 'markdown-it'; // ✅ New dependency

import { COLORS } from './constants/colors';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// Initialize pure‑JS markdown converter
const mdParser = new MarkdownIt();

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
    if (!documentId) return Alert.alert('Error', 'Document ID not found.');
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

  // Prepare HTML for PDF export
  const generateHtmlForPdf = (content, type) => {
    const titleHtml = `<h1 style="font-family:'Inter-Bold'; font-size:24px; color:${COLORS.darkText}; margin-bottom:15px;">${editableTitle}</h1>`;
    const basicStyles = `
      <style>
        body { font-family:'Inter-Regular'; font-size:16px; color:${COLORS.darkText}; padding:20px; line-height:1.5; }
        h1,h2,h3,h4,h5,h6 { font-family:'Inter-Bold'; color:${COLORS.darkText}; margin-top:1em; margin-bottom:0.5em; }
        pre { background:#f8f8f8; padding:10px; border:1px solid #ddd; border-radius:5px; overflow-x:auto; }
        code { background:#eee; padding:2px 4px; border-radius:3px; }
      </style>
    `;
    let htmlContent = '';
    if (type === 'markdown') {
      htmlContent = mdParser.render(content);
    } else if (type === 'csv') {
      const rows = content.split('\n').map(r => r.split(','));
      htmlContent = '<table style="border-collapse:collapse;width:100%;">' +
        rows.map((row, i) => '<tr>' +
          row.map(cell => `<${i===0?'th':'td'} style="border:1px solid #ddd;padding:8px;text-align:left;">${cell.trim()}</${i===0?'th':'td'}>`).join('') +
        '</tr>').join('') + '</table>';
    } else {
      htmlContent = `<p>${content.replace(/\n/g,'<br/>')}</p>`;
    }
    return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${editableTitle}</title>${basicStyles}</head><body>${titleHtml}${htmlContent}</body></html>`;
  };

  const exportFile = async (format) => {
    setShowDropdown(false);
    try {
      let uri, filename = editableTitle.replace(/[^a-z0-9]/gi,'_').toLowerCase(), mime;
      if (format === 'pdf') {
        const html = generateHtmlForPdf(outputText, outputType);
        const result = await Print.printToFileAsync({ html });
        uri = result.uri; filename += '.pdf'; mime = 'application/pdf';
      } else {
        const ext = format === 'excel' ? 'csv' : format;
        uri = `${FileSystem.documentDirectory}${filename}.${ext}`;
        await FileSystem.writeAsStringAsync(uri, outputText);
        mime = format === 'markdown' ? 'text/markdown' : format === 'csv' || format==='excel' ? 'text/csv' : 'text/plain';
        filename += `.${ext}`;
        if (format === 'excel') Alert.alert('Export to Excel','Saved as CSV—compatible with Excel.');
      }
      if (!(await Sharing.isAvailableAsync())) return Alert.alert('Error','Sharing not available.');
      await Sharing.shareAsync(uri, { mimeType: mime, dialogTitle: `Export ${filename}`, UTI: Platform.OS === 'ios' ? filename.split('.').pop() : undefined });
    } catch (err) {
      console.error('Export error:', err);
      Alert.alert('Export Error', err.message);
    }
  };

  const getExportButtonDetails = () => {
    switch (outputType) {
      case 'markdown': return { mainButtonText:'Export PDF', mainButtonAction:() => exportFile('pdf'), dropdownOptions:[{label:'Export Markdown',action:()=>exportFile('markdown')}] };
      case 'csv': return { mainButtonText:'Export Excel Sheet', mainButtonAction:() => exportFile('excel'), dropdownOptions:[{label:'Export CSV',action:()=>exportFile('csv')},{label:'Export PDF',action:()=>exportFile('pdf')}] };
      default: return { mainButtonText:'Export as Text', mainButtonAction:() => exportFile('text'), dropdownOptions:[{label:'Export PDF',action:()=>exportFile('pdf')}] };
    }
  };

  const { mainButtonText, mainButtonAction, dropdownOptions } = getExportButtonDetails();

  const renderContent = () => {
    if (outputType === 'markdown') {
      return <ScrollView horizontal contentContainerStyle={styles.markdownScrollContent}><Markdown style={markdownStyles}>{outputText}</Markdown></ScrollView>;
    }
    if (outputType === 'csv') {
      const rows = outputText.split('\n').map(r=>r.split(','));
      const colCount = rows[0]?.length || 0;
      const widths = rows.reduce((w,row)=>row.map((cell,i)=>Math.max(w[i]||0, cell.trim().length*8 + 16)), Array(colCount).fill(0));
      const minW=80; for (let i=0;i<widths.length;i++) widths[i]=Math.max(widths[i],minW);
      return <ScrollView horizontal contentContainerStyle={styles.csvScrollContent}><View style={styles.csvTable}>{rows.map((row,ri)=><View key={ri} style={styles.csvRow}>{row.map((cell,ci)=><Text key={ci} style={[ri===0?styles.csvHeaderCell:styles.csvCell,{width:widths[ci]}]} numberOfLines={1} ellipsizeMode="tail">{cell.trim()}</Text>)}</View>)}</View></ScrollView>;
    }
    return <ScrollView horizontal contentContainerStyle={styles.textScrollContent}><Text style={styles.contentText}>{outputText}</Text></ScrollView>;
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButtonContainer} onPress={() => setCurrentScreen('Home')}>
          <Ionicons name="arrow-back" size={24} color={COLORS.darkText} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Processed Output</Text>
        <View style={styles.dropdownContainer}>
          <TouchableOpacity onPress={() => setShowDropdown(!showDropdown)}>
            <Ionicons name="ellipsis-vertical" size={24} color={COLORS.darkText} />
          </TouchableOpacity>
          {showDropdown && (
            <View style={styles.dropdownMenu}>
              <TouchableOpacity style={styles.dropdownItem} onPress={() => { setShowDropdown(false); setIsEditingTitle(true); }}>
                <Text style={styles.dropdownItemText}>Edit Title</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.dropdownItem} onPress={handleDelete}>
                <Text style={styles.dropdownItemText}>Delete</Text>
              </TouchableOpacity>
              {dropdownOptions.map(opt=>(
                <TouchableOpacity key={opt.label} style={styles.dropdownItem} onPress={opt.action}>
                  <Text style={styles.dropdownItemText}>{opt.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </View>
      <ScrollView contentContainerStyle={styles.scrollViewContent}>
        <View style={styles.documentTitleContainer}>
          <Text style={styles.documentTitle}>{editableTitle}</Text>
        </View>
        <View style={styles.contentContainer}>{renderContent()}</View>
        <View style={styles.saveButtonRow}>
          <TouchableOpacity style={styles.saveButton} onPress={mainButtonAction}>
            <Text style={styles.saveButtonText}>{mainButtonText}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
      <Modal visible={isEditingTitle} transparent animationType="fade" onRequestClose={() => setIsEditingTitle(false)}>
        <TouchableOpacity style={styles.modalBackground} activeOpacity={1} onPress={() => setIsEditingTitle(false)}>
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
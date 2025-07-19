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
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import MarkdownIt from 'markdown-it';
import MarkdownItKatex from 'markdown-it-katex';

// ✅ Import WebView for in-app math rendering
import WebView from 'react-native-webview';

import { COLORS } from './constants/colors';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// Initialize pure‑JS markdown converter with KaTeX plugin
const mdParser = new MarkdownIt().use(MarkdownItKatex);

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
  const [markdownHtmlForWebView, setMarkdownHtmlForWebView] = useState('');

  const outputText = processedOutput?.text || 'No content to display.';
  const outputType = processedOutput?.type || 'text';
  const documentId = processedOutput?.id;

  // Generate HTML for WebView and PDF
  const getFullMarkdownHtml = (content, type, title) => {
    const titleHtml = `<h1 style="font-family:'Inter-Bold'; font-size:24px; color:${COLORS.darkText}; margin-bottom:15px;">${title}</h1>`;
    const vsCodeMarkdownCss = `
      <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css">
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe WPC", "Segoe UI", system-ui, "Ubuntu", "Droid Sans", sans-serif;
          font-size: 16px;
          line-height: 1.6;
          color: #24292e;
          padding: 20px;
          margin: 0 auto;
        }
        h1, h2, h3, h4, h5, h6 {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe WPC", "Segoe UI", system-ui, "Ubuntu", "Droid Sans", sans-serif;
          color: #000;
          margin-top: 1.5em;
          margin-bottom: 0.5em;
          font-weight: 600;
        }
        h1 { font-size: 2.2em; border-bottom: 1px solid #eaecef; padding-bottom: 0.3em; }
        h2 { font-size: 1.8em; border-bottom: 1px solid #eaecef; padding-bottom: 0.3em; }
        h3 { font-size: 1.4em; }
        h4 { font-size: 1.2em; }
        h5 { font-size: 1.1em; }
        h6 { font-size: 1em; color: #586069; }

        p { margin-bottom: 1em; }

        a { color: #0366d6; text-decoration: none; }
        a:hover { text-decoration: underline; }

        strong { font-weight: 700; }
        em { font-style: italic; }

        ul, ol {
          margin-top: 0;
          margin-bottom: 1em;
          padding-left: 2em;
        }
        li { margin-bottom: 0.5em; }

        blockquote {
          color: #586069;
          margin: 1em 0;
          padding: 0 1em;
          border-left: 0.25em solid #dfe2e5;
          background-color: #f6f8fa;
        }

        pre {
          background-color: #f6f8fa;
          padding: 12px;
          border-radius: 6px;
          overflow-x: auto;
          font-family: SFMono-Regular, Consolas, "Liberation Mono", Menlo, Courier, monospace;
          font-size: 0.9em;
          line-height: 1.4;
          white-space: pre-wrap;
          word-break: break-all;
        }
        code {
          font-family: SFMono-Regular, Consolas, "Liberation Mono", Menlo, Courier, monospace;
          background-color: rgba(27,31,35,.05);
          padding: 0.2em 0.4em;
          border-radius: 3px;
        }
        pre code {
          background-color: transparent;
          padding: 0;
          border-radius: 0;
          white-space: pre;
        }

        table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 1em;
        }
        th, td {
          border: 1px solid #dfe2e5;
          padding: 8px;
          text-align: left;
        }
        th {
          background-color: #f6f8fa;
          font-weight: 600;
        }

        img {
          max-width: 100%;
          box-sizing: border-box;
        }

        hr {
          height: 0.25em;
          padding: 0;
          margin: 24px 0;
          background-color: #e1e4e8;
          border: 0;
        }

        /* KaTeX specific styling */
        .katex { font-size: 1.1em; }
        .katex-display {
          margin: 1em;
          overflow-x: auto;
          overflow-y: hidden;
          text-align: left;
        }
        .katex-html {
          white-space: nowrap;
          padding: 0.7em;
        }
        
        .katex .script, .katex .scriptstyle {
          font-size: 0.7em !important; /* Smaller size for basic scripts */
          line-height: 1.2 !important; /* Adjust line height for better vertical alignment */
          margin: 0em;
          padding: 0em;
        }
        .katex .script.scriptstyle {
          font-size: 0.5em !important; /* Even smaller for nested scripts */
          padding: 0em;
          margin: 0em;
        }
        .katex .frac-line {
          border-bottom-width: 1px !important;
          border-color: currentColor !important;
          padding: 0em;
          margin: 0em;
        }
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

    return `<!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>${title}</title>
                ${vsCodeMarkdownCss}
            </head>
            <body>
                ${titleHtml}
                ${htmlContent}
                <script src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js"></script>
                <script src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/contrib/auto-render.min.js"></script>
                <script>
                    document.addEventListener("DOMContentLoaded", function() {
                        renderMathInElement(document.body, {
                            delimiters: [
                                {left: '$$', right: '$$', display: true},
                                {left: '$', right: '$', display: false},
                                {left: '\\(', right: '\\)', display: false},
                                {left: '\\[', right: '\\]', display: true}
                            ],
                            throwOnError : false
                        });
                    });
                </script>
            </body>
            </html>`;
  };

  React.useEffect(() => {
    if (outputType === 'markdown') {
      // Pass outputType to getFullMarkdownHtml as well
      setMarkdownHtmlForWebView(getFullMarkdownHtml(outputText, outputType, editableTitle));
    }
  }, [outputText, editableTitle, outputType]);

  const generateHtmlForPdf = (content, type, title) => {
    return getFullMarkdownHtml(content, type, title);
  };

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

  const exportFile = async (format) => {
    setShowDropdown(false);
    try {
      let uri, filename = editableTitle.replace(/[^a-z0-9]/gi,'_').toLowerCase(), mime;
      if (format === 'pdf') {
        const html = generateHtmlForPdf(outputText, outputType, editableTitle);
        const result = await Print.printToFileAsync({ html });
        uri = result.uri; filename += '.pdf'; mime = 'application/pdf';
      } else {
        const ext = format === 'excel' ? 'csv' : format;
        uri = `${FileSystem.documentDirectory}${filename}.${ext}`;
        await FileSystem.writeAsStringAsync(uri, outputText);
        mime = format === 'markdown' ? 'text/markdown' : (format === 'csv' || format === 'excel' ? 'text/csv' : 'text/plain');
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
      return (
        <View style={styles.webViewContainer}>
          {markdownHtmlForWebView ? (
            <WebView
              originWhitelist={['*']}
              source={{ html: markdownHtmlForWebView }}
              style={styles.webView}
              scalesPageToFit={Platform.OS === 'android'}
              scrollEnabled={true}
              javaScriptEnabled={true} // Explicitly ensure JS is enabled
              domStorageEnabled={true} // Enable DOM storage
              // ✅ Add debugging props for WebView
              onLoadEnd={() => console.log('WebView finished loading HTML')}
              onError={(syntheticEvent) => {
                const { nativeEvent } = syntheticEvent;
                console.warn('WebView error: ', nativeEvent.code, nativeEvent.description, nativeEvent.url);
              }}
              onHttpError={(syntheticEvent) => {
                const { nativeEvent } = syntheticEvent;
                console.warn('WebView HTTP error: ', nativeEvent.statusCode, nativeEvent.description, nativeEvent.url);
              }}
              // This is useful for catching console.log from the WebView's JS context
              onMessage={(event) => {
                try {
                  const message = JSON.parse(event.nativeEvent.data);
                  console.log('WebView Console:', message);
                } catch (e) {
                  console.log('WebView Raw Message:', event.nativeEvent.data);
                }
              }}
              // Inject a script to capture console.log from the WebView
              injectedJavaScript={`
                (function() {
                  var originalLog = console.log;
                  console.log = function(message) {
                    window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'log', message: message }));
                    originalLog.apply(console, arguments);
                  };
                  var originalError = console.error;
                  console.error = function(message) {
                    window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'error', message: message }));
                    originalError.apply(console, arguments);
                  };
                })();
                // Also, trigger math rendering explicitly just in case DOMContentLoaded fires too early in some cases
                if (window.renderMathInElement) {
                    renderMathInElement(document.body, {
                        delimiters: [
                            {left: '$$', right: '$$', display: true},
                            {left: '$', right: '$', display: false},
                            {left: '\\(', right: '\\)', display: false},
                            {left: '\\[', right: '\\]', display: true}
                        ],
                        throwOnError : false
                    });
                } else {
                    window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'debug', message: 'renderMathInElement not found' }));
                }
              `}
              renderLoading={() => <Text style={styles.contentText}>Loading Markdown Preview...</Text>}
              startInLoadingState={true}
            />
          ) : (
            <Text style={styles.contentText}>Preparing Markdown Preview...</Text>
          )}
        </View>
      );
    }
if (outputType === 'csv') {
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

// markdownStyles are not directly used anymore since WebView renders full HTML/CSS
const markdownStyles = StyleSheet.create({ /* ... */ });

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
    flex: 1,
  },
  webViewContainer: {
    flex: 1,
    minHeight: screenHeight * 0.5,
    paddingHorizontal: 16,
  },
  webView: {
    flex: 1,
    backgroundColor: COLORS.primaryBackground,
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
    padding:15,
    flexShrink: 0,
  },
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
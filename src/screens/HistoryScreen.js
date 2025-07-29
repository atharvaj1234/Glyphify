// HistoryScreen.js
import React, { useState, useEffect, useCallback } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  RefreshControl,
  Image, // For document icons
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { COLORS } from "../constants/colors";

// Helper for image placeholders (you might want more specific icons based on outputType)
const documentIconPlaceholder = require("../../assets/document_icon.png"); // You need this image
const spreadsheetIconPlaceholder = require("../../assets/spreadsheet_icon.jpeg"); // You need this image
const markdownIconPlaceholder = require("../../assets/markdown_icon.jpeg"); // You need this image

const HistoryScreen = ({
  setCurrentScreen,
  getHistoryDocuments,
  deleteDocument,
  updateDocumentTitle,
  setProcessedOutput,
  historyNeedsRefresh,
  setHistoryNeedsRefresh,
}) => {
  const [historyItems, setHistoryItems] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [currentEditItem, setCurrentEditItem] = useState(null);
  const [newTitle, setNewTitle] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [dropdownItemId, setDropdownItemId] = useState(null);

  const fetchHistory = useCallback(async () => {
    setRefreshing(true);
    try {
      const docs = await getHistoryDocuments();
      setHistoryItems(docs);
    } catch (error) {
      console.error("Failed to fetch history:", error);
      Alert.alert("Error", "Failed to load history documents.");
    } finally {
      setRefreshing(false);
      setHistoryNeedsRefresh(false); // Reset refresh trigger
    }
  }, [getHistoryDocuments, setHistoryNeedsRefresh]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  useEffect(() => {
    if (historyNeedsRefresh) {
      fetchHistory();
    }
  }, [historyNeedsRefresh, fetchHistory]);

  const handleDelete = async (id) => {
    setShowDropdown(false);
    Alert.alert(
      "Confirm Delete",
      "Are you sure you want to delete this document from history?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          onPress: async () => {
            try {
              await deleteDocument(id);
              Alert.alert("Success", "Document deleted.");
              fetchHistory(); // Refresh the list
            } catch (error) {
              console.error("Error deleting document:", error);
              Alert.alert("Error", "Failed to delete document.");
            }
          },
        },
      ]
    );
  };

  const handleEditTitle = (item) => {
    setShowDropdown(false);
    setCurrentEditItem(item);
    setNewTitle(item.title);
    setIsEditingTitle(true);
  };

  const handleSaveTitle = async () => {
    if (!newTitle.trim()) {
      Alert.alert("Error", "Title cannot be empty.");
      return;
    }
    if (currentEditItem && newTitle.trim() !== currentEditItem.title) {
      try {
        await updateDocumentTitle(currentEditItem.id, newTitle.trim());
        Alert.alert("Success", "Title updated.");
        fetchHistory(); // Refresh the list
        setIsEditingTitle(false);
        setCurrentEditItem(null);
      } catch (error) {
        console.error("Error updating title:", error);
        Alert.alert("Error", "Failed to update title.");
      }
    } else {
      setIsEditingTitle(false);
      setCurrentEditItem(null);
    }
  };

  const handleViewContent = (item) => {
    setShowDropdown(false);
    setProcessedOutput({
      id: item.id,
      text: item.processedContent,
      type: item.outputType,
      title: item.title,
    });
    setCurrentScreen("ProcessedOutput");
  };

  const getDocumentIcon = (outputType) => {
    switch (outputType) {
      case "csv":
        return spreadsheetIconPlaceholder;
      case "markdown":
        return markdownIconPlaceholder;
      case "text":
      default:
        return documentIconPlaceholder;
    }
  };

  const formatDate = (isoString) => {
    const date = new Date(isoString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>History</Text>
        <TouchableOpacity style={styles.listIconContainer}>
          <Ionicons name="list" size={24} color={COLORS.darkText} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollViewContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={fetchHistory} />
        }
      >
        {historyItems.length === 0 ? (
          <Text style={styles.emptyHistoryText}>
            No processed documents yet.
          </Text>
        ) : (
          historyItems.map((item) => (
            // Add a wrapper View for each history item to act as a relative parent
            <View key={item.id} style={styles.historyItemWrapper}>
              {/* This TouchableOpacity now contains only the visible row content */}
              <TouchableOpacity
                style={styles.historyItem} // These styles will now apply to this TouchableOpacity
                onPress={() => handleViewContent(item)}
              >
                <Image
                  source={getDocumentIcon(item.outputType)}
                  style={styles.documentIcon}
                />
                <View style={styles.itemTextContainer}>
                  <Text style={styles.itemTitle}>{item.title}</Text>
                  <Text style={styles.itemDate}>
                    Processed on {formatDate(item.processedDate)}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.moreOptionsButton}
                  onPress={() => {
                    // Toggle the dropdown for this specific item
                    setDropdownItemId(
                      dropdownItemId === item.id ? null : item.id
                    );
                  }}
                >
                  <Ionicons
                    name="ellipsis-horizontal"
                    size={24}
                    color={COLORS.darkText}
                  />
                </TouchableOpacity>
              </TouchableOpacity>

              {/* The dropdown menu is now a sibling to the TouchableOpacity */}
              {dropdownItemId === item.id && (
                <View style={styles.dropdownMenu}>
                  {/* Ensure clicking a dropdown item closes the dropdown */}
                  <TouchableOpacity
                    style={styles.dropdownItem}
                    onPress={() => handleViewContent(item)}
                  >
                    <Text style={styles.dropdownItemText}>View</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.dropdownItem}
                    onPress={() => handleEditTitle(item)}
                  >
                    <Text style={styles.dropdownItemText}>Edit Title</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.dropdownItem}
                    onPress={() => handleDelete(item.id)}
                  >
                    <Text style={styles.dropdownItemText}>Delete</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          ))
        )}
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
          onPress={() => setIsEditingTitle(false)} // Dismiss modal on background press
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Edit Title</Text>
            <TextInput
              style={styles.modalTextInput}
              value={newTitle}
              onChangeText={setNewTitle}
              placeholder="Enter new title"
              autoFocus
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalButtonCancel}
                onPress={() => setIsEditingTitle(false)}
              >
                <Text style={styles.modalButtonTextCancel}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalButtonSave}
                onPress={handleSaveTitle}
              >
                <Text style={styles.modalButtonTextSave}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
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
  headerTitle: {
    fontFamily: "Inter-Bold",
    fontSize: 18,
    lineHeight: 23,
    color: COLORS.darkText,
    flex: 1, // Allows title to center if list icon is on the right
    textAlign: "center",
    marginLeft: 48, // Offset for potential left icon if needed
    marginRight: 24, // Matches right icon width roughly
  },
  listIconContainer: {
    width: 48,
    height: 48,
    justifyContent: "center",
    alignItems: "center",
  },
  scrollViewContent: {
    paddingBottom: 95, // Space for bottom nav bar
  },
  emptyHistoryText: {
    fontFamily: "Inter-Regular",
    fontSize: 16,
    color: COLORS.inactiveIcon,
    textAlign: "center",
    marginTop: 50,
  },
  historyItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderColor,
    minHeight: 72,
    gap: 16,
  },
  documentIcon: {
    width: 56,
    height: 56,
    borderRadius: 8,
    backgroundColor: "#DDCBAA", // A light beige/orange background as seen in Figma for document icons
    justifyContent: "center",
    alignItems: "center",
    resizeMode: "contain", // Ensure icon fits
  },
  itemTextContainer: {
    flex: 1, // Take available space
    justifyContent: "center",
  },
  itemTitle: {
    fontFamily: "Inter-Medium",
    fontSize: 16,
    lineHeight: 24,
    color: COLORS.darkText,
  },
  itemDate: {
    fontFamily: "Inter-Regular",
    fontSize: 14,
    lineHeight: 21,
    color: COLORS.inactiveIcon,
  },
  moreOptionsButton: {
    width: 28, // Figma size for ellipsis container
    height: 28,
    justifyContent: "center",
    alignItems: "center",
    position: "relative", // For dropdown positioning
  },
  dropdownMenu: {
    position: "absolute",
    top: 30, // Position below the ellipsis icon
    right: 0,
    backgroundColor: COLORS.white,
    borderRadius: 8,
    shadowColor: COLORS.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    zIndex: 100,
    minWidth: 120,
  },
  dropdownItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderColor,
  },
  dropdownItemText: {
    fontFamily: "Inter-Regular",
    fontSize: 16,
    color: COLORS.darkText,
  },
  modalBackground: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)", // Dim background
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 20,
    width: "80%",
    alignItems: "center",
  },
  modalTitle: {
    fontFamily: "Inter-Bold",
    fontSize: 20,
    marginBottom: 15,
    color: COLORS.darkText,
  },
  modalTextInput: {
    borderWidth: 1,
    borderColor: COLORS.borderColor,
    borderRadius: 8,
    padding: 12,
    width: "100%",
    fontFamily: "Inter-Regular",
    fontSize: 16,
    color: COLORS.darkText,
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-around",
    width: "100%",
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
    fontFamily: "Inter-Medium",
    color: COLORS.darkText,
  },
  modalButtonTextSave: {
    fontFamily: "Inter-Medium",
    color: COLORS.white,
  },
});

export default HistoryScreen;

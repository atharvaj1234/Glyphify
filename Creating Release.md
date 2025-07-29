# Building Production Builds for Expo Apps (Android & iOS)

This document outlines the processes for generating production-ready builds for your Expo application, targeting both Android and iOS platforms. We cover two methods:

*   **EAS Build (Recommended):** Leveraging Expo Application Services (EAS) Build, a streamlined and powerful cloud-based solution for creating optimized builds. This method offers flexibility and integrates seamlessly with the Expo ecosystem.

*   **Local Build (Without EAS):**  For scenarios where you need to build locally, this guide provides steps for generating builds without relying on EAS Build.  **Note:** Local iOS builds require macOS.

## Method 1: EAS Build (Recommended)

Expo has transitioned to **EAS Build** as the preferred method for creating production builds. EAS Build is a robust service that simplifies the process of generating Android App Bundles (.aab) or APKs (.apk) for Android, and `.ipa` files for iOS.

### Prerequisites

*   An Expo project.
*   A free Expo account ([https://expo.dev/](https://expo.dev/)).
*   An Apple Developer Program membership for iOS builds.
*   For iOS Builds: Xcode installed on a macOS system (required for code signing and provisioning profile management).  You do not need to use Xcode directly, but its command-line tools are necessary.

### Steps

1.  **Install the EAS CLI:**

    Install the EAS Command Line Interface (CLI) globally:

    ```bash
    npm install -g eas-cli
    ```

2.  **Log in to your Expo Account:**

    Authenticate with your Expo account:

    ```bash
    eas login
    ```

3.  **Configure EAS Build in your Project:**

    Initialize EAS Build in your project. This creates the essential `eas.json` configuration file:

    ```bash
    eas build:configure
    ```

    Follow the prompts to complete the initial setup. Choose the appropriate options for Android and iOS.

4.  **Configure `eas.json` for Build Types:**

    Open your `eas.json` file and modify the `production` profile for both Android and iOS.

    *   **Android: (Optional - defaults to AAB):** To force APK creation, add an `android` object within the `production` profile and set `buildType` to `"apk"`. If omitted, it will build .aab
    *   **iOS: (Recommended):** No specific setting is needed for `.ipa` creation. EAS Build will automatically generate an `.ipa` file.

    ```json
    {
      "cli": {
        "version": ">= 7.6.0"
      },
      "build": {
        "development": {
          "developmentClient": true,
          "distribution": "internal"
        },
        "preview": {
          "distribution": "internal"
        },
        "production": {
          "android": { // Optional, only for APK builds
            "buildType": "apk"
          },
          "ios": {
            "buildConfiguration": "Release"
          }
        }
      },
      "submit": {
        "production": {}
      }
    }
    ```

5.  **Run the Production Build:**

    Execute the following commands to start the build processes for Android and iOS:

    *   **Android:**

        ```bash
        eas build --profile production --platform android
        ```

    *   **iOS:**

        ```bash
        eas build --profile production --platform ios
        ```

    These commands upload your project, queue the builds on EAS servers, and generate the builds. Upon completion, you will receive download URLs for your APK (if configured), AAB (Android default), and IPA (iOS) files.

6.  **(Optional) Submit to the App Stores:**

    *   **Google Play Store (Android):** While the preferred method is to upload an `.aab` you can upload the generated APK file.
        You'll need a Google Play Developer account (paid).  EAS provides automated submission capabilities via `eas submit`. To use this:
        *   Create a Google Service Account Key.
        *   Configure the `submit` profile in `eas.json` with the path to your service account key.

    *   **Apple App Store (iOS):** You'll need an active Apple Developer Program membership and associated certificates and provisioning profiles.  EAS Submit can automate this process. Refer to Expo documentation.

### Important Considerations for EAS Build

*   **AAB vs. APK (Android):** EAS Build defaults to generating an Android App Bundle (.aab), which is optimized for the Google Play Store.  Use APK generation only when necessary.
*   **Credentials and Provisioning (iOS):**  EAS Build will handle the management of your Apple credentials. You can configure the credentials using the `eas credentials` command.
*   **Development Client:**  `developmentClient: true` enables live reloading during development.
*   **Google Play Console (Android):** To publish, you'll usually upload the .aab file to the Google Play Console (though you can upload the `.apk`).
*   **App Store Connect (iOS):**  To publish, you'll upload the `.ipa` file to App Store Connect.

## Method 2: Building Locally (Without EAS)

This method is useful if you need to create builds locally and do not want to use EAS. This is considered the more complicated and less common approach.

### Prerequisites

*   Node.js and npm installed.
*   **Android:**
    *   Android SDK properly configured (including setting the `ANDROID_HOME` environment variable).  Download and install Android Studio for the easiest setup.
    *   Java Development Kit (JDK) installed.
*   **iOS:**
    *   macOS is required.
    *   Xcode is required.
    *   CocoaPods installed.

### Steps

1.  **Install Expo Dev Client:**

    ```bash
    npx expo install expo-dev-client
    ```

2.  **Expo Prebuild:**

    Generate the native project folders:

    ```bash
    npx expo prebuild --platform android,ios
    ```

3.  **Android Build Configuration (Android Only):**

    *   **Configure Keystore:**

        Generate a keystore for signing your APK.  **IMPORTANT:** Protect this keystore!

        ```bash
        keytool -genkey -v -keystore my-release-key.keystore -alias alias_name -keyalg RSA -keysize 2048 -validity 10000
        ```

        **Note:** Replace `my-release-key.keystore` and `alias_name` with your desired keystore file name and alias.  Remember the password you set.

    *   **Configure Gradle:**

        Modify your `android/gradle.properties` file to include the keystore information.  Add the following lines (replace with your actual values):

        ```gradle
        MYAPP_RELEASE_STORE_FILE=my-release-key.keystore
        MYAPP_RELEASE_KEY_ALIAS=alias_name
        MYAPP_RELEASE_STORE_PASSWORD=your_keystore_password
        MYAPP_RELEASE_KEY_PASSWORD=your_key_password
        ```

        **Security Warning:** Storing passwords directly in `gradle.properties` is generally discouraged for production.  Consider using environment variables or a more secure method for managing sensitive information.

        Next, modify the `android/app/build.gradle` to enable signing config. Add the following inside the `android` block in your `android/app/build.gradle` file:

        ```gradle
        signingConfigs {
            release {
                storeFile file(MYAPP_RELEASE_STORE_FILE)
                storePassword MYAPP_RELEASE_STORE_PASSWORD
                keyAlias MYAPP_RELEASE_KEY_ALIAS
                keyPassword MYAPP_RELEASE_KEY_PASSWORD
            }
        }

        buildTypes {
            release {
                signingConfig signingConfigs.release
                minifyEnabled true // Recommended for release builds
                proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'

            }
        }
        ```

4.  **Build the Applications:**

    *   **Android:**

        Navigate to the `android` directory and use Gradle to assemble the release APK:

        ```bash
        cd android
        ./gradlew assembleRelease
        ```

        The APK will be located in `android/app/build/outputs/apk/release/app-release.apk`.

    *   **iOS:**

        1.  Navigate to the `ios` directory:

            ```bash
            cd ios
            ```

        2.  Install CocoaPods dependencies (if not already installed):

            ```bash
            pod install
            ```

        3.  Open the `.xcworkspace` file in Xcode.

            ```bash
            open YourAppName.xcworkspace
            ```

        4.  In Xcode:

            *   Configure signing and capabilities for your target (you'll need an Apple Developer account).
            *   Select "Product" -> "Archive".
            *   Once the archive is created, use the Xcode Organizer to distribute the app for testing (Ad Hoc) or submission to the App Store.  You can export an `.ipa` file for distribution.

### Important Considerations for Local Builds

*   **Keystore Security (Android):** Protect your keystore file and passwords. Loss of the keystore will prevent you from updating your app on the Google Play Store.
*   **SDK Configuration (Android):**  Ensure the Android SDK is correctly configured.  Android Studio provides the easiest way to manage this.
*   **Security (Android):** Hardcoding credentials is a security risk. Consider using environment variables or a more secure method for storing your keys.
*   **Code Signing (iOS):**  Correctly configure code signing in Xcode. This involves setting up certificates, identifiers, and provisioning profiles.
*   **Dependencies**: Make sure your `build.gradle` (Android) and `Podfile` (iOS) dependencies are compatible.

If you encounter issues during either method, consult the Expo documentation and community resources for troubleshooting.  EAS Build is strongly recommended for ease of use and integration with the Expo ecosystem.
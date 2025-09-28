# Android Release: Sukuu Parent

This guide helps you build a signed Android App Bundle (AAB) and publish to Google Play.

## 1) Set package name and app name

- Package: `com.sukuu.parent` (set in `android/app/build.gradle` and namespace)
- App label: "Sukuu Parent" (set in `android/app/src/main/AndroidManifest.xml`)

## 2) Generate signing keystore

Create a secure keystore (one time):

```powershell
keytool -genkey -v -keystore c:\\keys\\sukuuparent.jks -keyalg RSA -keysize 2048 -validity 10000 -alias sukuu_parent
```

Remember the passwords you set. Keep this file private and backed up.

## 3) Create `android/key.properties`

Create a file `mobile/parent_app/android/key.properties` with:

```properties
storeFile=c:\\keys\\sukuuparent.jks
storePassword=YOUR_STORE_PASSWORD
keyAlias=sukuu_parent
keyPassword=YOUR_KEY_PASSWORD
```

This file is ignored by Git via `android/.gitignore`.

## 4) Generate launcher icons

Place your icon `school_icon.png` in the project root (`mobile/parent_app/`) and run:

```powershell
flutter pub get
flutter pub run flutter_launcher_icons:main
```

## 5) Build a release App Bundle (AAB)

```powershell
flutter build appbundle --release --dart-define=API_BASE_URL=https://sukuu1.vercel.app
```

The bundle will be at `build/app/outputs/bundle/release/app-release.aab`.

## 6) Test locally

Optionally install a release APK:

```powershell
flutter build apk --release --dart-define=API_BASE_URL=https://sukuu1.vercel.app
```

## 7) Play Console

1. Create a Developer account and a new app
2. Upload the AAB (Production or Internal testing)
3. Fill Store listing (title, description, screenshots, category, privacy policy)
4. App content (Data safety, ads, target audience, permissions)
5. Submit for review

## 8) Versioning

Increment `version: x.y.z+code` in `pubspec.yaml` for each upload.

## 9) Troubleshooting

- If Play warns about cleartext traffic, ensure `android:usesCleartextTraffic` is removed (we did) and your API uses HTTPS.
- If package name conflicts, change `com.sukuu.parent` to another unique id and update the `kotlin` package path.

/// Central place for runtime configuration of the mobile app.
///
/// The API base URL can be injected at build time using:
///   flutter run --dart-define=API_BASE_URL=http://192.168.1.55:3000
/// If not provided, we default to the LAN IP below so physical devices on the
/// same Wi‑Fi can reach your dev server without adb reverse.
const String kDefaultApiBaseUrl = String.fromEnvironment(
  'API_BASE_URL',
  defaultValue: 'https://sukuu1.vercel.app',
);

import 'package:flutter/material.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class ThemeController extends ChangeNotifier {
  ThemeMode _mode = ThemeMode.system;
  ThemeMode get mode => _mode;

  ThemeController._internal();
  static final ThemeController instance = ThemeController._internal();

  static const FlutterSecureStorage _storage = FlutterSecureStorage();
  static const String _key = 'themeMode'; // 'system' | 'light' | 'dark'

  Future<void> load() async {
    try {
      final v = await _storage.read(key: _key);
      _mode = _fromString(v);
    } catch (_) {
      _mode = ThemeMode.system;
    }
    notifyListeners();
  }

  Future<void> set(ThemeMode mode) async {
    _mode = mode;
    notifyListeners();
    try {
      await _storage.write(key: _key, value: _toString(mode));
    } catch (_) {}
  }

  static ThemeMode _fromString(String? v) {
    switch (v) {
      case 'light':
        return ThemeMode.light;
      case 'dark':
        return ThemeMode.dark;
      default:
        return ThemeMode.system;
    }
  }

  static String _toString(ThemeMode m) {
    switch (m) {
      case ThemeMode.light:
        return 'light';
      case ThemeMode.dark:
        return 'dark';
      case ThemeMode.system:
      default:
        return 'system';
    }
  }
}

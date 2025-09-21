import 'package:flutter/material.dart';

final ColorScheme _lightScheme = ColorScheme.fromSeed(
  seedColor: const Color(0xFF4F46E5), // Indigo-600 vibe
  brightness: Brightness.light,
);

final ColorScheme _darkScheme = ColorScheme.fromSeed(
  seedColor: const Color(0xFF4F46E5),
  brightness: Brightness.dark,
);

ThemeData buildLightTheme() {
  final base = ThemeData(
    colorScheme: _lightScheme,
    useMaterial3: true,
  );
  return base.copyWith(
    scaffoldBackgroundColor: const Color(0xFFF7F8FC),
    appBarTheme: AppBarTheme(
      backgroundColor: base.colorScheme.surface,
      foregroundColor: base.colorScheme.onSurface,
      elevation: 0,
      centerTitle: false,
      titleTextStyle: TextStyle(
        color: base.colorScheme.onSurface,
        fontWeight: FontWeight.w700,
        fontSize: 20,
      ),
    ),
    cardTheme: CardTheme(
      elevation: 0,
      color: Colors.white,
      surfaceTintColor: Colors.transparent,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
      margin: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: Colors.white,
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: BorderSide(color: Colors.grey.shade300),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: BorderSide(color: Colors.grey.shade300),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: BorderSide(color: _lightScheme.primary, width: 2),
      ),
      contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
      labelStyle: TextStyle(color: Colors.grey.shade700),
    ),
    textTheme: _textTheme(base.textTheme, base.colorScheme.onSurface),
    listTileTheme: ListTileThemeData(
      contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 2),
      iconColor: base.colorScheme.primary,
      titleTextStyle: TextStyle(
        color: base.colorScheme.onSurface,
        fontWeight: FontWeight.w600,
      ),
      subtitleTextStyle: TextStyle(color: Colors.grey.shade600),
    ),
    navigationBarTheme: NavigationBarThemeData(
      backgroundColor: Colors.white,
      indicatorColor: _lightScheme.primary.withOpacity(0.12),
      surfaceTintColor: Colors.transparent,
      height: 64,
      labelTextStyle: MaterialStateProperty.all(const TextStyle(
        fontWeight: FontWeight.w600,
      )),
    ),
    chipTheme: base.chipTheme.copyWith(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(999)),
      labelStyle: const TextStyle(fontWeight: FontWeight.w600),
      backgroundColor: _lightScheme.primary.withOpacity(0.08),
      selectedColor: _lightScheme.primary,
    ),
    dividerColor: Colors.grey.shade200,
  );
}

ThemeData buildDarkTheme() {
  final base = ThemeData(
    colorScheme: _darkScheme,
    useMaterial3: true,
  );
  return base.copyWith(
    scaffoldBackgroundColor: const Color(0xFF0B1220),
    appBarTheme: AppBarTheme(
      backgroundColor: base.colorScheme.surface,
      foregroundColor: base.colorScheme.onSurface,
      elevation: 0,
      centerTitle: false,
      titleTextStyle: const TextStyle(
        color: Colors.white,
        fontWeight: FontWeight.w700,
        fontSize: 20,
      ),
    ),
    cardTheme: CardTheme(
      elevation: 0,
      color: const Color(0xFF0F172A),
      surfaceTintColor: Colors.transparent,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
      margin: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: const Color(0xFF111827),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: BorderSide(color: Colors.grey.shade800),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: BorderSide(color: Colors.grey.shade800),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: BorderSide(color: _darkScheme.primary, width: 2),
      ),
      contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
      labelStyle: TextStyle(color: Colors.grey.shade400),
    ),
    textTheme: _textTheme(base.textTheme, Colors.white),
    listTileTheme: const ListTileThemeData(
      contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 2),
      iconColor: Colors.white,
      titleTextStyle: TextStyle(
        color: Colors.white,
        fontWeight: FontWeight.w600,
      ),
      subtitleTextStyle: TextStyle(color: Colors.white70),
    ),
    navigationBarTheme: NavigationBarThemeData(
      backgroundColor: const Color(0xFF0F172A),
      indicatorColor: _darkScheme.primary.withOpacity(0.2),
      surfaceTintColor: Colors.transparent,
      height: 64,
      labelTextStyle: MaterialStateProperty.all(const TextStyle(
        fontWeight: FontWeight.w600,
      )),
    ),
    chipTheme: base.chipTheme.copyWith(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(999)),
      labelStyle: const TextStyle(fontWeight: FontWeight.w600),
      backgroundColor: _darkScheme.primary.withOpacity(0.2),
      selectedColor: _darkScheme.primary,
    ),
    dividerColor: Colors.white10,
  );
}

TextTheme _textTheme(TextTheme base, Color color) {
  return base.copyWith(
    titleLarge: base.titleLarge?.copyWith(fontWeight: FontWeight.w700),
    bodyMedium: base.bodyMedium?.copyWith(color: color.withOpacity(0.9)),
    labelLarge: base.labelLarge?.copyWith(fontWeight: FontWeight.w700),
  );
}

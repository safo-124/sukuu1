import 'package:flutter/material.dart';

final ColorScheme _lightScheme = ColorScheme.fromSeed(
  seedColor: const Color(0xFF6366F1), // Enhanced indigo
  brightness: Brightness.light,
).copyWith(
  primary: const Color(0xFF4F46E5), // Stronger indigo
  secondary: const Color(0xFF0891B2), // Stronger cyan
  tertiary: const Color(0xFF059669), // Stronger emerald
  surface: const Color(0xFFFFFFFF),
  surfaceVariant: const Color(0xFFF8FAFC),
  background: const Color(0xFFFCFCFC),
  onPrimary: const Color(0xFFFFFFFF),
  onSecondary: const Color(0xFFFFFFFF),
  onSurface: const Color(0xFF1F2937),
  onSurfaceVariant: const Color(0xFF64748B),
  primaryContainer: const Color(0xFFEEF2FF),
  onPrimaryContainer: const Color(0xFF312E81),
  secondaryContainer: const Color(0xFFE0F7FA),
  onSecondaryContainer: const Color(0xFF0E7490),
  outline: const Color(0xFFE2E8F0),
);

final ColorScheme _darkScheme = ColorScheme.fromSeed(
  seedColor: const Color(0xFF6366F1),
  brightness: Brightness.dark,
).copyWith(
  primary: const Color(0xFF818CF8), // Lighter indigo for dark mode
  secondary: const Color(0xFF22D3EE), // Bright cyan
  tertiary: const Color(0xFF34D399), // Bright emerald
  surface: const Color(0xFF1E293B), // Slate-800
  surfaceVariant: const Color(0xFF334155), // Slate-700
  background: const Color(0xFF0F172A), // Slate-900
  onPrimary: const Color(0xFF1E1B4B),
  onSecondary: const Color(0xFF0C4A6E),
  onSurface: const Color(0xFFE2E8F0),
  onSurfaceVariant: const Color(0xFF94A3B8),
  primaryContainer: const Color(0xFF312E81),
  onPrimaryContainer: const Color(0xFFDDD6FE),
  secondaryContainer: const Color(0xFF0E7490),
  onSecondaryContainer: const Color(0xFFCFFAFE),
  outline: const Color(0xFF475569),
);

ThemeData buildLightTheme() {
  final base = ThemeData(
    colorScheme: _lightScheme,
    useMaterial3: true,
  );
  return base.copyWith(
    scaffoldBackgroundColor: const Color(0xFFF8FAFC),
    appBarTheme: AppBarTheme(
      backgroundColor: Colors.transparent,
      foregroundColor: base.colorScheme.onSurface,
      elevation: 0,
      centerTitle: false,
      titleTextStyle: TextStyle(
        color: base.colorScheme.onSurface,
        fontWeight: FontWeight.w700,
        fontSize: 22,
        letterSpacing: -0.5,
      ),
    ),
    cardTheme: CardThemeData(
      elevation: 0,
      color: Colors.white,
      surfaceTintColor: Colors.transparent,
      shadowColor: Colors.black.withOpacity(0.08),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: Colors.white.withOpacity(0.9),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(16),
        borderSide: BorderSide(color: Colors.grey.shade200),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(16),
        borderSide: BorderSide(color: Colors.grey.shade200),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(16),
        borderSide: BorderSide(color: _lightScheme.primary, width: 2.5),
      ),
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
      labelStyle: TextStyle(color: Colors.grey.shade600, fontWeight: FontWeight.w500),
    ),
    textTheme: _textTheme(base.textTheme, base.colorScheme.onSurface),
    listTileTheme: ListTileThemeData(
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
      iconColor: base.colorScheme.primary,
      titleTextStyle: TextStyle(
        color: base.colorScheme.onSurface,
        fontWeight: FontWeight.w600,
        fontSize: 16,
      ),
      subtitleTextStyle: TextStyle(color: Colors.grey.shade600, fontSize: 14),
    ),
    navigationBarTheme: NavigationBarThemeData(
      backgroundColor: Colors.white.withOpacity(0.9),
      indicatorColor: _lightScheme.primary.withOpacity(0.15),
      surfaceTintColor: Colors.transparent,
      height: 70,
      labelTextStyle: MaterialStateProperty.resolveWith<TextStyle?>(
        (states) {
          if (states.contains(MaterialState.selected)) {
            return TextStyle(
              fontWeight: FontWeight.w700,
              fontSize: 12,
              color: _lightScheme.primary,
            );
          }
          return const TextStyle(
            fontWeight: FontWeight.w500,
            fontSize: 12,
          );
        },
      ),
      iconTheme: MaterialStateProperty.resolveWith<IconThemeData?>(
        (states) {
          if (states.contains(MaterialState.selected)) {
            return IconThemeData(color: _lightScheme.primary, size: 24);
          }
          return const IconThemeData(size: 24);
        },
      ),
    ),
    chipTheme: base.chipTheme.copyWith(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      labelStyle: const TextStyle(fontWeight: FontWeight.w600),
      backgroundColor: _lightScheme.primary.withOpacity(0.10),
      selectedColor: _lightScheme.primary,
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
    ),
    elevatedButtonTheme: ElevatedButtonThemeData(
      style: ElevatedButton.styleFrom(
        backgroundColor: _lightScheme.primary,
        foregroundColor: Colors.white,
        elevation: 0,
        shadowColor: _lightScheme.primary.withOpacity(0.3),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
        textStyle: const TextStyle(fontWeight: FontWeight.w700, fontSize: 16),
      ),
    ),
    filledButtonTheme: FilledButtonThemeData(
      style: FilledButton.styleFrom(
        backgroundColor: _lightScheme.primary,
        foregroundColor: Colors.white,
        elevation: 0,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 18),
        textStyle: const TextStyle(fontWeight: FontWeight.w700, fontSize: 16),
      ),
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
    scaffoldBackgroundColor: const Color(0xFF0F172A),
    appBarTheme: AppBarTheme(
      backgroundColor: Colors.transparent,
      foregroundColor: base.colorScheme.onSurface,
      elevation: 0,
      centerTitle: false,
      titleTextStyle: TextStyle(
        color: base.colorScheme.onSurface,
        fontWeight: FontWeight.w700,
        fontSize: 22,
        letterSpacing: -0.5,
      ),
    ),
    cardTheme: CardThemeData(
      elevation: 0,
      color: const Color(0xFF1E293B),
      surfaceTintColor: Colors.transparent,
      shadowColor: Colors.black.withOpacity(0.3),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: const Color(0xFF334155),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(16),
        borderSide: const BorderSide(color: Color(0xFF475569)),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(16),
        borderSide: const BorderSide(color: Color(0xFF475569)),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(16),
        borderSide: BorderSide(color: _darkScheme.primary, width: 2.5),
      ),
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
      labelStyle: TextStyle(color: Colors.grey.shade300, fontWeight: FontWeight.w500),
    ),
    textTheme: _textTheme(base.textTheme, Colors.white),
    listTileTheme: ListTileThemeData(
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
      iconColor: _darkScheme.primary,
      titleTextStyle: const TextStyle(
        color: Colors.white,
        fontWeight: FontWeight.w600,
        fontSize: 16,
      ),
      subtitleTextStyle: const TextStyle(color: Colors.white70, fontSize: 14),
    ),
    navigationBarTheme: NavigationBarThemeData(
      backgroundColor: const Color(0xFF0F172A).withOpacity(0.9),
      indicatorColor: _darkScheme.primary.withOpacity(0.25),
      surfaceTintColor: Colors.transparent,
      height: 70,
      labelTextStyle: MaterialStateProperty.resolveWith<TextStyle?>(
        (states) {
          if (states.contains(MaterialState.selected)) {
            return TextStyle(
              fontWeight: FontWeight.w700,
              fontSize: 12,
              color: _darkScheme.primary,
            );
          }
          return const TextStyle(
            fontWeight: FontWeight.w500,
            fontSize: 12,
            color: Colors.white70,
          );
        },
      ),
      iconTheme: MaterialStateProperty.resolveWith<IconThemeData?>(
        (states) {
          if (states.contains(MaterialState.selected)) {
            return IconThemeData(color: _darkScheme.primary, size: 24);
          }
          return const IconThemeData(color: Colors.white70, size: 24);
        },
      ),
    ),
    chipTheme: base.chipTheme.copyWith(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      labelStyle: const TextStyle(fontWeight: FontWeight.w600, color: Colors.white),
      backgroundColor: _darkScheme.primary.withOpacity(0.25),
      selectedColor: _darkScheme.primary,
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
    ),
    elevatedButtonTheme: ElevatedButtonThemeData(
      style: ElevatedButton.styleFrom(
        backgroundColor: _darkScheme.primary,
        foregroundColor: Colors.white,
        elevation: 0,
        shadowColor: _darkScheme.primary.withOpacity(0.3),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
        textStyle: const TextStyle(fontWeight: FontWeight.w700, fontSize: 16),
      ),
    ),
    filledButtonTheme: FilledButtonThemeData(
      style: FilledButton.styleFrom(
        backgroundColor: _darkScheme.primary,
        foregroundColor: Colors.white,
        elevation: 0,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 18),
        textStyle: const TextStyle(fontWeight: FontWeight.w700, fontSize: 16),
      ),
    ),
    dividerColor: Colors.white12,
  );
}

TextTheme _textTheme(TextTheme base, Color color) {
  return base.copyWith(
    displayLarge: base.displayLarge?.copyWith(
      fontWeight: FontWeight.w800,
      letterSpacing: -1.0,
    ),
    displayMedium: base.displayMedium?.copyWith(
      fontWeight: FontWeight.w700,
      letterSpacing: -0.8,
    ),
    displaySmall: base.displaySmall?.copyWith(
      fontWeight: FontWeight.w700,
      letterSpacing: -0.6,
    ),
    headlineLarge: base.headlineLarge?.copyWith(
      fontWeight: FontWeight.w700,
      letterSpacing: -0.5,
    ),
    headlineMedium: base.headlineMedium?.copyWith(
      fontWeight: FontWeight.w700,
      letterSpacing: -0.4,
    ),
    headlineSmall: base.headlineSmall?.copyWith(
      fontWeight: FontWeight.w600,
      letterSpacing: -0.3,
    ),
    titleLarge: base.titleLarge?.copyWith(
      fontWeight: FontWeight.w700,
      letterSpacing: -0.2,
    ),
    titleMedium: base.titleMedium?.copyWith(
      fontWeight: FontWeight.w600,
      letterSpacing: 0.0,
    ),
    titleSmall: base.titleSmall?.copyWith(
      fontWeight: FontWeight.w600,
      letterSpacing: 0.1,
    ),
    bodyLarge: base.bodyLarge?.copyWith(
      color: color.withOpacity(0.9),
      fontWeight: FontWeight.w500,
    ),
    bodyMedium: base.bodyMedium?.copyWith(
      color: color.withOpacity(0.87),
      fontWeight: FontWeight.w400,
    ),
    bodySmall: base.bodySmall?.copyWith(
      color: color.withOpacity(0.75),
      fontWeight: FontWeight.w400,
    ),
    labelLarge: base.labelLarge?.copyWith(
      fontWeight: FontWeight.w700,
      letterSpacing: 0.1,
    ),
    labelMedium: base.labelMedium?.copyWith(
      fontWeight: FontWeight.w600,
      letterSpacing: 0.5,
    ),
    labelSmall: base.labelSmall?.copyWith(
      fontWeight: FontWeight.w500,
      letterSpacing: 0.5,
    ),
  );
}

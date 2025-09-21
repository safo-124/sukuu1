import 'package:flutter/material.dart';
import 'pages/landing_page.dart';
import 'theme.dart';
import 'theme_controller.dart';

class ParentApp extends StatefulWidget {
  const ParentApp({super.key});

  @override
  State<ParentApp> createState() => _ParentAppState();
}

class _ParentAppState extends State<ParentApp> {
  @override
  void initState() {
    super.initState();
    // Load saved theme preference
    ThemeController.instance.load();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: ThemeController.instance,
      builder: (context, _) {
        return MaterialApp(
          title: 'Sukuu Parent',
          debugShowCheckedModeBanner: false,
          themeMode: ThemeController.instance.mode,
          theme: buildLightTheme(),
          darkTheme: buildDarkTheme(),
          home: const LandingPage(),
        );
      },
    );
  }
}

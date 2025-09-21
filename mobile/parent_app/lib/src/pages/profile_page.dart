import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:http/http.dart' as http;
import 'landing_page.dart';
import '../config.dart';
import '../theme_controller.dart';

class ProfilePage extends StatefulWidget {
  const ProfilePage({super.key});

  @override
  State<ProfilePage> createState() => _ProfilePageState();
}

class _ProfilePageState extends State<ProfilePage> {
  final _storage = const FlutterSecureStorage();
  bool _loading = true;
  String? _error;
  Map<String, dynamic>? _profile;

  final _baseUrlController = TextEditingController();
  bool _rememberEmail = true;
  String? _subdomain;

  @override
  void initState() {
    super.initState();
    _bootstrap();
  }

  Future<void> _bootstrap() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      // load device settings
      final savedBaseUrl = await _storage.read(key: 'baseUrl');
      _baseUrlController.text = savedBaseUrl == null || savedBaseUrl.isEmpty
          ? kDefaultApiBaseUrl
          : savedBaseUrl;
      _subdomain = await _storage.read(key: 'subdomain');
      final remember = await _storage.read(key: 'rememberEmail');
      _rememberEmail = remember != 'false';

      await _fetchProfile();
    } catch (e) {
      _error = e.toString();
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _fetchProfile() async {
    final baseUrl = await _storage.read(key: 'baseUrl');
    final token = await _storage.read(key: 'token');
    final schoolId = await _storage.read(key: 'schoolId');
    if (baseUrl == null || token == null || schoolId == null) {
      throw Exception('Missing auth');
    }
    final meRes = await http.get(
      Uri.parse('$baseUrl/api/schools/$schoolId/parents/me'),
      headers: {
        'Authorization': 'Bearer $token',
        'Accept': 'application/json',
      },
    );
    if (meRes.statusCode != 200) {
      throw Exception('Profile failed (${meRes.statusCode})');
    }
    _profile = jsonDecode(meRes.body) as Map<String, dynamic>;
  }

  Future<void> _saveSettings() async {
    // sanitize base URL
    String baseUrl =
        _baseUrlController.text.trim().replaceAll(RegExp(r"/+\s*$"), "");
    if (!baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) {
      baseUrl = 'http://$baseUrl';
    }
    await _storage.write(key: 'baseUrl', value: baseUrl);
    await _storage.write(
        key: 'rememberEmail', value: _rememberEmail.toString());
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Settings saved')),
    );
  }

  Future<void> _resetBaseUrl() async {
    _baseUrlController.text = kDefaultApiBaseUrl;
    await _storage.write(key: 'baseUrl', value: kDefaultApiBaseUrl);
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Base URL reset to default')),
    );
  }

  Future<void> _logout() async {
    // Clear only auth-critical keys, keep baseUrl/subdomain for convenience
    await _storage.delete(key: 'token');
    await _storage.delete(key: 'schoolId');
    if (!mounted) return;
    Navigator.of(context).pushAndRemoveUntil(
      MaterialPageRoute(builder: (_) => const LandingPage()),
      (route) => false,
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Profile & Settings'),
        actions: [
          IconButton(
            tooltip: 'Logout',
            icon: const Icon(Icons.logout),
            onPressed: _logout,
          )
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? Center(
                  child:
                      Text(_error!, style: const TextStyle(color: Colors.red)))
              : RefreshIndicator(
                  onRefresh: _bootstrap,
                  child: ListView(
                    padding: const EdgeInsets.all(16),
                    children: [
                      // Profile summary
                      Card(
                        child: Padding(
                          padding: const EdgeInsets.all(16.0),
                          child: Row(
                            children: [
                              CircleAvatar(
                                radius: 28,
                                child: Text(
                                  (_profile?['user']?['firstName'] ?? 'P')
                                      .toString()
                                      .substring(0, 1)
                                      .toUpperCase(),
                                ),
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      '${_profile?['user']?['firstName'] ?? ''} ${_profile?['user']?['lastName'] ?? ''}'
                                          .trim(),
                                      style: const TextStyle(
                                          fontSize: 18,
                                          fontWeight: FontWeight.w600),
                                    ),
                                    const SizedBox(height: 4),
                                    Text(
                                      _profile?['user']?['email'] ?? '',
                                      style: const TextStyle(
                                          color: Colors.black54),
                                    ),
                                    if (_subdomain != null &&
                                        _subdomain!.isNotEmpty)
                                      Text('Subdomain: $_subdomain',
                                          style: const TextStyle(
                                              color: Colors.black54)),
                                  ],
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),

                      const SizedBox(height: 16),

                      // App settings
                      Card(
                        child: Padding(
                          padding: const EdgeInsets.all(16.0),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text('App Settings',
                                  style: TextStyle(
                                      fontSize: 16,
                                      fontWeight: FontWeight.w600)),
                              const SizedBox(height: 12),
                              TextFormField(
                                controller: _baseUrlController,
                                decoration: const InputDecoration(
                                  labelText: 'Base URL',
                                  prefixIcon: Icon(Icons.link_outlined),
                                ),
                              ),
                              const SizedBox(height: 8),
                              Row(
                                children: [
                                  FilledButton.tonal(
                                    onPressed: _resetBaseUrl,
                                    child: const Text('Reset to default'),
                                  ),
                                  const SizedBox(width: 8),
                                  FilledButton(
                                    onPressed: _saveSettings,
                                    child: const Text('Save settings'),
                                  ),
                                ],
                              ),
                              const Divider(height: 24),
                              SwitchListTile(
                                contentPadding: EdgeInsets.zero,
                                title:
                                    const Text('Remember email on this device'),
                                value: _rememberEmail,
                                onChanged: (v) =>
                                    setState(() => _rememberEmail = v),
                              ),
                              const Divider(height: 24),
                              const Text('Theme',
                                  style: TextStyle(
                                      fontSize: 16,
                                      fontWeight: FontWeight.w600)),
                              const SizedBox(height: 12),
                              _ThemeSelector(),
                            ],
                          ),
                        ),
                      ),

                      const SizedBox(height: 16),

                      // Danger zone
                      Card(
                        color: Colors.red.shade50,
                        child: Padding(
                          padding: const EdgeInsets.all(16.0),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text('Account',
                                  style: TextStyle(
                                      fontSize: 16,
                                      fontWeight: FontWeight.w600,
                                      color: Colors.red.shade900)),
                              const SizedBox(height: 12),
                              SizedBox(
                                width: double.infinity,
                                child: FilledButton.tonal(
                                  style: FilledButton.styleFrom(
                                      foregroundColor: Colors.white,
                                      backgroundColor: Colors.red),
                                  onPressed: _logout,
                                  child: const Text('Logout'),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
    );
  }
}

class _ThemeSelector extends StatefulWidget {
  @override
  State<_ThemeSelector> createState() => _ThemeSelectorState();
}

class _ThemeSelectorState extends State<_ThemeSelector> {
  ThemeMode _mode = ThemeController.instance.mode;

  @override
  void initState() {
    super.initState();
    // Sync with controller updates
    ThemeController.instance.addListener(_onChanged);
  }

  @override
  void dispose() {
    ThemeController.instance.removeListener(_onChanged);
    super.dispose();
  }

  void _onChanged() {
    if (mounted) setState(() => _mode = ThemeController.instance.mode);
  }

  @override
  Widget build(BuildContext context) {
    final isLight = _mode == ThemeMode.light;
    final isSystem = _mode == ThemeMode.system;

    return LayoutBuilder(
      builder: (context, constraints) {
        return SegmentedButton<String>(
          segments: const [
            ButtonSegment(
                value: 'system',
                label: Text('System'),
                icon: Icon(Icons.settings_suggest_outlined)),
            ButtonSegment(
                value: 'light',
                label: Text('Light'),
                icon: Icon(Icons.light_mode_outlined)),
            ButtonSegment(
                value: 'dark',
                label: Text('Dark'),
                icon: Icon(Icons.dark_mode_outlined)),
          ],
          selected: {
            if (isSystem) 'system' else if (isLight) 'light' else 'dark'
          },
          onSelectionChanged: (s) {
            final v = s.first;
            if (v == 'system') {
              ThemeController.instance.set(ThemeMode.system);
            } else if (v == 'light') {
              ThemeController.instance.set(ThemeMode.light);
            } else {
              ThemeController.instance.set(ThemeMode.dark);
            }
          },
        );
      },
    );
  }
}

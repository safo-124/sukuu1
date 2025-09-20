import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:http/http.dart' as http;
import 'main_tabs_page.dart';
import '../config.dart';

class LoginPage extends StatefulWidget {
  const LoginPage({super.key});

  @override
  State<LoginPage> createState() => _LoginPageState();
}

class _LoginPageState extends State<LoginPage> {
  final _formKey = GlobalKey<FormState>();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  final _subdomainController = TextEditingController();
  final _baseUrlController = TextEditingController(text: kDefaultApiBaseUrl);
  bool _loading = false;
  String? _error;
  bool _obscurePassword = true;
  bool _rememberEmail = true;
  bool _showAdvanced = false;

  final _storage = const FlutterSecureStorage();

  static const _kBaseUrlKey = 'baseUrl';
  static const _kSubdomainKey = 'subdomain';
  static const _kEmailKey = 'lastEmail';
  static const _kRememberKey = 'rememberEmail';

  @override
  void initState() {
    super.initState();
    _loadSaved();
  }

  Future<void> _loadSaved() async {
    try {
      final savedBaseUrl = await _storage.read(key: _kBaseUrlKey);
      final savedSub = await _storage.read(key: _kSubdomainKey);
      final savedEmail = await _storage.read(key: _kEmailKey);
      final remember = await _storage.read(key: _kRememberKey);
      // Prefer runtime-provided base URL over an old emulator-only value
      // If a user previously saved 10.0.2.2 (emulator), override with kDefaultApiBaseUrl
      if (savedBaseUrl == null || savedBaseUrl.isEmpty) {
        _baseUrlController.text = kDefaultApiBaseUrl;
      } else if (savedBaseUrl.contains('10.0.2.2') &&
          savedBaseUrl != kDefaultApiBaseUrl) {
        _baseUrlController.text = kDefaultApiBaseUrl;
        // Persist the safer default so subsequent launches use it
        await _storage.write(key: _kBaseUrlKey, value: kDefaultApiBaseUrl);
      } else {
        _baseUrlController.text = savedBaseUrl;
      }
      if (savedSub != null && savedSub.isNotEmpty) {
        _subdomainController.text = savedSub;
      }
      if (remember == 'false') {
        _rememberEmail = false;
      }
      if (_rememberEmail && savedEmail != null && savedEmail.isNotEmpty) {
        _emailController.text = savedEmail;
      }
      setState(() {});
    } catch (_) {
      // ignore load errors
    }
  }

  Future<void> _login() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() {
      _loading = true;
      _error = null;
    });

    final email = _emailController.text.trim();
    final password = _passwordController.text;
    final subdomain = _subdomainController.text.trim().toLowerCase();
    // sanitize base URL by removing trailing slashes and whitespace
    String baseUrl =
        _baseUrlController.text.trim().replaceAll(RegExp(r"/+\s*$"), "");
    if (!baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) {
      baseUrl = 'http://$baseUrl';
    }

    try {
      final res = await http.post(
        Uri.parse('$baseUrl/api/auth/mobile-login'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode(
            {'email': email, 'password': password, 'subdomain': subdomain}),
      );
      if (res.statusCode != 200) {
        setState(() {
          _error = 'Login failed: ${res.body}';
        });
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text(_error ?? 'Login failed')),
          );
        }
        return;
      }
      final json = jsonDecode(res.body) as Map<String, dynamic>;
      final token = json['token'] as String;
      final user = json['user'] as Map<String, dynamic>;

      await _storage.write(key: 'token', value: token);
      await _storage.write(key: 'schoolId', value: user['schoolId']);
      await _storage.write(
          key: _kSubdomainKey, value: user['schoolSubdomain'] ?? subdomain);
      await _storage.write(key: _kBaseUrlKey, value: baseUrl);
      // Remember email preference
      await _storage.write(
          key: _kRememberKey, value: _rememberEmail.toString());
      if (_rememberEmail) {
        await _storage.write(key: _kEmailKey, value: email);
      } else {
        await _storage.delete(key: _kEmailKey);
      }

      if (!mounted) return;
      Navigator.of(context).pushReplacement(
        MaterialPageRoute(builder: (_) => const MainTabsPage()),
      );
    } catch (e) {
      setState(() {
        _error = 'Error: $e';
      });
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(_error ?? 'Error')),
        );
      }
    } finally {
      if (mounted)
        setState(() {
          _loading = false;
        });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            colors: [Color(0xFFEEF2FF), Color(0xFFE0E7FF)],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
        ),
        child: SafeArea(
          child: Center(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(16),
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 440),
                child: Card(
                  elevation: 6,
                  clipBehavior: Clip.antiAlias,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: Padding(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 20, vertical: 24),
                    child: Form(
                      key: _formKey,
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          // Header
                          Column(
                            children: const [
                              SizedBox(height: 8),
                              Icon(Icons.school,
                                  size: 56, color: Colors.indigo),
                              SizedBox(height: 12),
                              Text('Sukuu Parent',
                                  style: TextStyle(
                                      fontSize: 22,
                                      fontWeight: FontWeight.w700)),
                              SizedBox(height: 6),
                              Text('Sign in to view your child\'s progress',
                                  style: TextStyle(color: Colors.black54)),
                              SizedBox(height: 16),
                            ],
                          ),

                          // Subdomain and email
                          TextFormField(
                            controller: _subdomainController,
                            decoration: const InputDecoration(
                              labelText: 'School Subdomain',
                              hintText: 'e.g., myschool',
                              prefixIcon: Icon(Icons.apartment_outlined),
                            ),
                            textInputAction: TextInputAction.next,
                            validator: (v) => (v == null || v.isEmpty)
                                ? 'Subdomain required'
                                : null,
                          ),
                          const SizedBox(height: 12),
                          TextFormField(
                            controller: _emailController,
                            decoration: const InputDecoration(
                              labelText: 'Email',
                              prefixIcon: Icon(Icons.email_outlined),
                            ),
                            keyboardType: TextInputType.emailAddress,
                            textInputAction: TextInputAction.next,
                            validator: (v) => (v == null || v.isEmpty)
                                ? 'Email required'
                                : null,
                          ),
                          const SizedBox(height: 12),
                          TextFormField(
                            controller: _passwordController,
                            decoration: InputDecoration(
                              labelText: 'Password',
                              prefixIcon: const Icon(Icons.lock_outline),
                              suffixIcon: IconButton(
                                onPressed: () => setState(
                                    () => _obscurePassword = !_obscurePassword),
                                icon: Icon(_obscurePassword
                                    ? Icons.visibility
                                    : Icons.visibility_off),
                              ),
                            ),
                            obscureText: _obscurePassword,
                            textInputAction: TextInputAction.done,
                            validator: (v) => (v == null || v.isEmpty)
                                ? 'Password required'
                                : null,
                          ),

                          const SizedBox(height: 8),
                          Row(
                            children: [
                              Checkbox(
                                value: _rememberEmail,
                                onChanged: (v) =>
                                    setState(() => _rememberEmail = v ?? true),
                              ),
                              const SizedBox(width: 4),
                              const Expanded(
                                child: Text(
                                  'Remember email on this device',
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ),
                              TextButton(
                                onPressed: () {},
                                child: const Text('Forgot password?'),
                              ),
                            ],
                          ),

                          // Advanced settings (Base URL)
                          const SizedBox(height: 4),
                          InkWell(
                            onTap: () =>
                                setState(() => _showAdvanced = !_showAdvanced),
                            child: Padding(
                              padding: const EdgeInsets.symmetric(vertical: 6),
                              child: Row(
                                children: [
                                  Icon(
                                      _showAdvanced
                                          ? Icons.expand_less
                                          : Icons.expand_more,
                                      color: Colors.indigo),
                                  const SizedBox(width: 6),
                                  const Text('Advanced settings',
                                      style: TextStyle(
                                          color: Colors.indigo,
                                          fontWeight: FontWeight.w600)),
                                ],
                              ),
                            ),
                          ),
                          AnimatedCrossFade(
                            crossFadeState: _showAdvanced
                                ? CrossFadeState.showFirst
                                : CrossFadeState.showSecond,
                            duration: const Duration(milliseconds: 200),
                            firstChild: Column(
                              children: [
                                const SizedBox(height: 8),
                                TextFormField(
                                  controller: _baseUrlController,
                                  decoration: const InputDecoration(
                                    labelText: 'Base URL',
                                    hintText:
                                        'e.g., $kDefaultApiBaseUrl or http://192.168.x.x:3000',
                                    prefixIcon: Icon(Icons.link_outlined),
                                  ),
                                  validator: (v) => (v == null || v.isEmpty)
                                      ? 'Base URL required'
                                      : null,
                                ),
                                const SizedBox(height: 8),
                                Align(
                                  alignment: Alignment.centerRight,
                                  child: TextButton.icon(
                                    onPressed: () async {
                                      _baseUrlController.text =
                                          kDefaultApiBaseUrl;
                                      await _storage.write(
                                          key: _kBaseUrlKey,
                                          value: kDefaultApiBaseUrl);
                                      if (mounted) {
                                        ScaffoldMessenger.of(context)
                                            .showSnackBar(
                                          const SnackBar(
                                              content: Text(
                                                  'Base URL reset to default')),
                                        );
                                      }
                                    },
                                    icon:
                                        const Icon(Icons.restart_alt, size: 18),
                                    label: const Text('Reset to default'),
                                  ),
                                ),
                              ],
                            ),
                            secondChild: const SizedBox.shrink(),
                          ),

                          const SizedBox(height: 12),
                          if (_error != null)
                            Padding(
                              padding: const EdgeInsets.only(bottom: 8),
                              child: Text(_error!,
                                  style: const TextStyle(color: Colors.red)),
                            ),
                          SizedBox(
                            width: double.infinity,
                            child: FilledButton.icon(
                              icon: _loading
                                  ? const SizedBox(
                                      height: 18,
                                      width: 18,
                                      child: CircularProgressIndicator(
                                          strokeWidth: 2, color: Colors.white))
                                  : const Icon(Icons.login),
                              label: Text(_loading ? 'Signing in…' : 'Sign In'),
                              onPressed: _loading ? null : _login,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

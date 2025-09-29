import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:http/http.dart' as http;
import 'main_tabs_page.dart';
import '../config.dart';
import '../ui/enhanced_components.dart';

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
      body: AnimatedGradientBackground(
        child: Stack(
          fit: StackFit.expand,
          children: [
            // Floating particles for ambiance
            Positioned.fill(
              child: FloatingParticles(
                numberOfParticles: 30,
                particleColor: Theme.of(context).primaryColor.withOpacity(0.3),
                maxParticleSize: 2.5,
              ),
            ),
            
            SafeArea(
              child: Center(
                child: SingleChildScrollView(
                  padding: const EdgeInsets.all(16),
                  child: ConstrainedBox(
                    constraints: const BoxConstraints(maxWidth: 440),
                    child: TweenAnimationBuilder<double>(
                      tween: Tween(begin: 0, end: 1),
                      duration: const Duration(milliseconds: 800),
                      curve: Curves.easeOutBack,
                      builder: (context, value, child) {
                        return Transform.scale(
                          scale: 0.8 + (0.2 * value),
                          child: Opacity(
                            opacity: value,
                            child: EnhancedCard(
                              child: Padding(
                                padding: const EdgeInsets.all(24),
                                child: Form(
                                  key: _formKey,
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.stretch,
                                    children: [
                                      // Enhanced Header with gradient text
                                      Column(
                                        children: [
                                          const SizedBox(height: 8),
                                          Container(
                                            padding: const EdgeInsets.all(16),
                                            decoration: BoxDecoration(
                                              gradient: LinearGradient(
                                                colors: [
                                                  Theme.of(context).colorScheme.primary.withOpacity(0.1),
                                                  Theme.of(context).colorScheme.secondary.withOpacity(0.1),
                                                ],
                                              ),
                                              shape: BoxShape.circle,
                                            ),
                                            child: Icon(
                                              Icons.school,
                                              size: 56,
                                              color: Theme.of(context).colorScheme.primary,
                                            ),
                                          ),
                                          const SizedBox(height: 16),
                                          ShaderMask(
                                            shaderCallback: (bounds) => LinearGradient(
                                              colors: [
                                                Theme.of(context).colorScheme.primary,
                                                Theme.of(context).colorScheme.secondary,
                                              ],
                                            ).createShader(bounds),
                                            child: const Text(
                                              'Sukuu Parent',
                                              style: TextStyle(
                                                fontSize: 28,
                                                fontWeight: FontWeight.w700,
                                                color: Colors.white,
                                              ),
                                            ),
                                          ),
                                          const SizedBox(height: 8),
                                          Text(
                                            'Sign in to view your child\'s progress',
                                            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                                              color: Theme.of(context).colorScheme.onSurfaceVariant,
                                            ),
                                            textAlign: TextAlign.center,
                                          ),
                                          const SizedBox(height: 24),
                                        ],
                                      ),

                                      // Enhanced form fields
                                      _buildEnhancedTextField(
                                        controller: _subdomainController,
                                        label: 'School Subdomain',
                                        hint: 'e.g., myschool',
                                        icon: Icons.apartment_outlined,
                                        validator: (v) => (v == null || v.isEmpty) ? 'Subdomain required' : null,
                                        textInputAction: TextInputAction.next,
                                      ),
                                      const SizedBox(height: 16),
                                      _buildEnhancedTextField(
                                        controller: _emailController,
                                        label: 'Email',
                                        icon: Icons.email_outlined,
                                        keyboardType: TextInputType.emailAddress,
                                        validator: (v) => (v == null || v.isEmpty) ? 'Email required' : null,
                                        textInputAction: TextInputAction.next,
                                      ),
                                      const SizedBox(height: 16),
                                      _buildEnhancedTextField(
                                        controller: _passwordController,
                                        label: 'Password',
                                        icon: Icons.lock_outline,
                                        obscureText: _obscurePassword,
                                        suffixIcon: IconButton(
                                          onPressed: () => setState(() => _obscurePassword = !_obscurePassword),
                                          icon: Icon(_obscurePassword ? Icons.visibility : Icons.visibility_off),
                                        ),
                                        validator: (v) => (v == null || v.isEmpty) ? 'Password required' : null,
                                        textInputAction: TextInputAction.done,
                                      ),

                                      const SizedBox(height: 16),
                                      
                                      // Enhanced options row
                                      Row(
                                        children: [
                                          Transform.scale(
                                            scale: 1.2,
                                            child: Checkbox(
                                              value: _rememberEmail,
                                              onChanged: (v) => setState(() => _rememberEmail = v ?? true),
                                              shape: RoundedRectangleBorder(
                                                borderRadius: BorderRadius.circular(4),
                                              ),
                                            ),
                                          ),
                                          const SizedBox(width: 8),
                                          Expanded(
                                            child: Text(
                                              'Remember email',
                                              style: Theme.of(context).textTheme.bodyMedium,
                                            ),
                                          ),
                                          TextButton(
                                            onPressed: () {},
                                            child: const Text('Forgot password?'),
                                          ),
                                        ],
                                      ),

                                      // Enhanced Advanced settings
                                      const SizedBox(height: 8),
                                      InkWell(
                                        onTap: () => setState(() => _showAdvanced = !_showAdvanced),
                                        borderRadius: BorderRadius.circular(8),
                                        child: Container(
                                          padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 4),
                                          child: Row(
                                            children: [
                                              Icon(
                                                _showAdvanced ? Icons.expand_less : Icons.expand_more,
                                                color: Theme.of(context).colorScheme.primary,
                                              ),
                                              const SizedBox(width: 6),
                                              Text(
                                                'Advanced settings',
                                                style: TextStyle(
                                                  color: Theme.of(context).colorScheme.primary,
                                                  fontWeight: FontWeight.w600,
                                                ),
                                              ),
                                            ],
                                          ),
                                        ),
                                      ),
                                      
                                      AnimatedSize(
                                        duration: const Duration(milliseconds: 300),
                                        curve: Curves.easeInOut,
                                        child: _showAdvanced
                                            ? Column(
                                                children: [
                                                  const SizedBox(height: 16),
                                                  _buildEnhancedTextField(
                                                    controller: _baseUrlController,
                                                    label: 'Base URL',
                                                    hint: 'e.g., $kDefaultApiBaseUrl',
                                                    icon: Icons.link_outlined,
                                                    validator: (v) => (v == null || v.isEmpty) ? 'Base URL required' : null,
                                                  ),
                                                  const SizedBox(height: 12),
                                                  Align(
                                                    alignment: Alignment.centerRight,
                                                    child: TextButton.icon(
                                                      onPressed: () async {
                                                        _baseUrlController.text = kDefaultApiBaseUrl;
                                                        await _storage.write(key: _kBaseUrlKey, value: kDefaultApiBaseUrl);
                                                        if (mounted) {
                                                          ScaffoldMessenger.of(context).showSnackBar(
                                                            const SnackBar(content: Text('Base URL reset to default')),
                                                          );
                                                        }
                                                      },
                                                      icon: const Icon(Icons.restart_alt, size: 18),
                                                      label: const Text('Reset to default'),
                                                    ),
                                                  ),
                                                ],
                                              )
                                            : const SizedBox.shrink(),
                                      ),

                                      const SizedBox(height: 24),
                                      
                                      // Error message
                                      if (_error != null)
                                        Container(
                                          margin: const EdgeInsets.only(bottom: 16),
                                          padding: const EdgeInsets.all(12),
                                          decoration: BoxDecoration(
                                            color: Theme.of(context).colorScheme.errorContainer,
                                            borderRadius: BorderRadius.circular(8),
                                          ),
                                          child: Row(
                                            children: [
                                              Icon(
                                                Icons.error_outline,
                                                color: Theme.of(context).colorScheme.onErrorContainer,
                                                size: 20,
                                              ),
                                              const SizedBox(width: 8),
                                              Expanded(
                                                child: Text(
                                                  _error!,
                                                  style: TextStyle(
                                                    color: Theme.of(context).colorScheme.onErrorContainer,
                                                  ),
                                                ),
                                              ),
                                            ],
                                          ),
                                        ),
                                      
                                      // Enhanced sign in button
                                      Container(
                                        width: double.infinity,
                                        height: 56,
                                        decoration: BoxDecoration(
                                          gradient: _loading
                                              ? null
                                              : LinearGradient(
                                                  colors: [
                                                    Theme.of(context).colorScheme.primary,
                                                    Theme.of(context).colorScheme.secondary,
                                                  ],
                                                ),
                                          borderRadius: BorderRadius.circular(12),
                                          boxShadow: _loading
                                              ? null
                                              : [
                                                  BoxShadow(
                                                    color: Theme.of(context).colorScheme.primary.withOpacity(0.3),
                                                    blurRadius: 12,
                                                    offset: const Offset(0, 6),
                                                  ),
                                                ],
                                        ),
                                        child: FilledButton.icon(
                                          onPressed: _loading ? null : _login,
                                          style: FilledButton.styleFrom(
                                            backgroundColor: _loading ? null : Colors.transparent,
                                            shape: RoundedRectangleBorder(
                                              borderRadius: BorderRadius.circular(12),
                                            ),
                                          ),
                                          icon: _loading
                                              ? const SizedBox(
                                                  height: 20,
                                                  width: 20,
                                                  child: CircularProgressIndicator(
                                                    strokeWidth: 2,
                                                    color: Colors.white,
                                                  ),
                                                )
                                              : const Icon(Icons.login),
                                          label: Text(
                                            _loading ? 'Signing in...' : 'Sign In',
                                            style: const TextStyle(
                                              fontSize: 16,
                                              fontWeight: FontWeight.w600,
                                            ),
                                          ),
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ),
                            ),
                          ),
                        );
                      },
                    ),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildEnhancedTextField({
    required TextEditingController controller,
    required String label,
    String? hint,
    required IconData icon,
    TextInputType? keyboardType,
    bool obscureText = false,
    Widget? suffixIcon,
    String? Function(String?)? validator,
    TextInputAction? textInputAction,
  }) {
    return Container(
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(12),
        gradient: LinearGradient(
          colors: [
            Theme.of(context).colorScheme.surfaceVariant.withOpacity(0.3),
            Theme.of(context).colorScheme.surface.withOpacity(0.8),
          ],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
      ),
      child: TextFormField(
        controller: controller,
        keyboardType: keyboardType,
        obscureText: obscureText,
        textInputAction: textInputAction,
        validator: validator,
        decoration: InputDecoration(
          labelText: label,
          hintText: hint,
          prefixIcon: Icon(icon),
          suffixIcon: suffixIcon,
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: BorderSide.none,
          ),
          filled: true,
          fillColor: Colors.transparent,
        ),
      ),
    );
  }
}

import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'children_page.dart';
import 'login_page.dart';

class LandingPage extends StatefulWidget {
  const LandingPage({super.key});

  @override
  State<LandingPage> createState() => _LandingPageState();
}

class _LandingPageState extends State<LandingPage> {
  final _storage = const FlutterSecureStorage();
  bool _checking = true;

  @override
  void initState() {
    super.initState();
    _autoRoute();
  }

  Future<void> _autoRoute() async {
    try {
      final token = await _storage.read(key: 'token');
      final baseUrl = await _storage.read(key: 'baseUrl');
      final schoolId = await _storage.read(key: 'schoolId');
      if (token != null &&
          token.isNotEmpty &&
          baseUrl != null &&
          schoolId != null) {
        if (!mounted) return;
        Navigator.of(context).pushReplacement(
          MaterialPageRoute(builder: (_) => const ChildrenPage()),
        );
        return;
      }
    } catch (_) {
      // ignore errors and show landing
    }
    if (mounted) setState(() => _checking = false);
  }

  void _goToLogin() {
    Navigator.of(context).pushReplacement(
      MaterialPageRoute(builder: (_) => const LoginPage()),
    );
  }

  @override
  Widget build(BuildContext context) {
    final size = MediaQuery.of(context).size;
    return Scaffold(
      body: Stack(
        fit: StackFit.expand,
        children: [
          // Animated gradient background
          TweenAnimationBuilder<double>(
            tween: Tween(begin: 0, end: 1),
            duration: const Duration(seconds: 2),
            curve: Curves.easeInOut,
            builder: (context, value, child) {
              return Container(
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    colors: [
                      const Color(0xFFEEF2FF),
                      Color.lerp(const Color(0xFFE0E7FF),
                          const Color(0xFFDBEAFE), value)!,
                    ],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                ),
              );
            },
          ),

          // Decorative blobs
          Positioned(
            top: -size.width * 0.2,
            left: -size.width * 0.1,
            child: _BlobCircle(
                diameter: size.width * 0.6,
                colors: const [Color(0xFF6366F1), Color(0xFF818CF8)]),
          ),
          Positioned(
            bottom: -size.width * 0.15,
            right: -size.width * 0.2,
            child: _BlobCircle(
                diameter: size.width * 0.7,
                colors: const [Color(0xFF22C55E), Color(0xFF86EFAC)]),
          ),

          // Content
          SafeArea(
            child: Center(
              child: AnimatedSwitcher(
                duration: const Duration(milliseconds: 250),
                child: _checking
                    ? const SizedBox(
                        key: ValueKey('loading'),
                        height: 64,
                        width: 64,
                        child: CircularProgressIndicator(),
                      )
                    : Padding(
                        padding: const EdgeInsets.all(16),
                        child: ConstrainedBox(
                          key: const ValueKey('content'),
                          constraints: const BoxConstraints(maxWidth: 520),
                          child: _GlassCard(
                            child: Column(
                              mainAxisSize: MainAxisSize.min,
                              crossAxisAlignment: CrossAxisAlignment.center,
                              children: [
                                // Logo + Gradient Title
                                const Icon(Icons.school,
                                    size: 64, color: Colors.indigo),
                                const SizedBox(height: 12),
                                _GradientText(
                                  'Welcome to Sukuu',
                                  gradient: const LinearGradient(
                                    colors: [
                                      Color(0xFF4338CA),
                                      Color(0xFF2563EB)
                                    ],
                                  ),
                                  style: const TextStyle(
                                      fontSize: 28,
                                      fontWeight: FontWeight.bold),
                                ),
                                const SizedBox(height: 8),
                                const Text(
                                  'Parent portal for attendance, grades, remarks and more.',
                                  textAlign: TextAlign.center,
                                  style: TextStyle(color: Colors.black54),
                                ),
                                const SizedBox(height: 16),

                                // Feature bullets
                                LayoutBuilder(
                                  builder: (context, c) {
                                    return Wrap(
                                      alignment: WrapAlignment.center,
                                      spacing: 12,
                                      runSpacing: 8,
                                      children: const [
                                        _FeatureChip(
                                            icon: Icons.leaderboard_outlined,
                                            label: 'Grades & Reports'),
                                        _FeatureChip(
                                            icon: Icons.chat_bubble_outline,
                                            label: 'Teacher Remarks'),
                                        _FeatureChip(
                                            icon: Icons.calendar_month_outlined,
                                            label: 'Schedules'),
                                      ],
                                    );
                                  },
                                ),

                                const SizedBox(height: 24),
                                SizedBox(
                                  width: double.infinity,
                                  child: FilledButton(
                                    onPressed: _goToLogin,
                                    child: const Text('Get Started'),
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
        ],
      ),
    );
  }
}

class _BlobCircle extends StatelessWidget {
  final double diameter;
  final List<Color> colors;

  const _BlobCircle({required this.diameter, required this.colors});

  @override
  Widget build(BuildContext context) {
    return IgnorePointer(
      ignoring: true,
      child: Container(
        width: diameter,
        height: diameter,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          gradient: RadialGradient(
            colors: [
              colors.first.withOpacity(0.18),
              colors.last.withOpacity(0.10),
              Colors.transparent,
            ],
          ),
        ),
      ),
    );
  }
}

class _GlassCard extends StatelessWidget {
  final Widget child;
  const _GlassCard({required this.child});

  @override
  Widget build(BuildContext context) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(18),
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 10, sigmaY: 10),
        child: Container(
          decoration: BoxDecoration(
            color: Colors.white.withOpacity(0.6),
            border: Border.all(color: Colors.white.withOpacity(0.4)),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withOpacity(0.06),
                blurRadius: 24,
                offset: const Offset(0, 12),
              ),
            ],
          ),
          padding: const EdgeInsets.symmetric(horizontal: 22, vertical: 26),
          child: child,
        ),
      ),
    );
  }
}

class _GradientText extends StatelessWidget {
  final String text;
  final TextStyle style;
  final Gradient gradient;

  const _GradientText(this.text, {required this.style, required this.gradient});

  @override
  Widget build(BuildContext context) {
    return ShaderMask(
      shaderCallback: (rect) => gradient.createShader(rect),
      child: Text(text, style: style.copyWith(color: Colors.white)),
    );
  }
}

class _FeatureChip extends StatelessWidget {
  final IconData icon;
  final String label;
  const _FeatureChip({required this.icon, required this.label});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.8),
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: Colors.white.withOpacity(0.6)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 16, color: Colors.indigo.shade600),
          const SizedBox(width: 6),
          Text(label, style: const TextStyle(fontSize: 12)),
        ],
      ),
    );
  }
}

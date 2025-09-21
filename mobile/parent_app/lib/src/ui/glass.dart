import 'dart:ui';
import 'package:flutter/material.dart';

class GlassContainer extends StatelessWidget {
  final Widget child;
  final double blur;
  final double opacity;
  final BorderRadius borderRadius;
  final EdgeInsetsGeometry? padding;
  final EdgeInsetsGeometry? margin;
  final Color? color;
  final BoxBorder? border;

  const GlassContainer({
    super.key,
    required this.child,
    this.blur = 16,
    this.opacity = 0.7,
    this.borderRadius = const BorderRadius.all(Radius.circular(16)),
    this.padding,
    this.margin,
    this.color,
    this.border,
  });

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final base = color ??
        (Theme.of(context).brightness == Brightness.dark
            ? const Color(0xFF0F172A)
            : Colors.white);
    final glassColor = base.withOpacity(opacity);

    return ClipRRect(
      borderRadius: borderRadius,
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: blur, sigmaY: blur),
        child: Container(
          padding: padding,
          margin: margin,
          decoration: BoxDecoration(
            color: glassColor,
            border:
                border ?? Border.all(color: scheme.outline.withOpacity(0.08)),
          ),
          child: child,
        ),
      ),
    );
  }
}

class GlassBottomBar extends StatelessWidget {
  final Widget child;
  const GlassBottomBar({super.key, required this.child});

  @override
  Widget build(BuildContext context) {
    final base = Theme.of(context).brightness == Brightness.dark
        ? const Color(0xFF0F172A)
        : Colors.white;
    return ClipRect(
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 14, sigmaY: 14),
        child: Container(
          decoration: BoxDecoration(
            color: base.withOpacity(0.65),
            border:
                Border(top: BorderSide(color: Colors.white.withOpacity(0.10))),
          ),
          child: child,
        ),
      ),
    );
  }
}

class GlassAppBarFlex extends StatelessWidget {
  const GlassAppBarFlex({super.key});

  @override
  Widget build(BuildContext context) {
    final base = Theme.of(context).brightness == Brightness.dark
        ? const Color(0xFF0F172A)
        : Colors.white;
    return ClipRect(
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 14, sigmaY: 14),
        child: Container(
          decoration: BoxDecoration(
            color: base.withOpacity(0.55),
            border: Border(
                bottom: BorderSide(color: Colors.white.withOpacity(0.06))),
          ),
        ),
      ),
    );
  }
}

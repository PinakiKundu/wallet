import 'dart:math' as math;

import 'package:flutter/material.dart';

class FinBrand {
  static const appName = 'PiPay';
  static const tagline = 'Secure. Fast. Reliable.';
  static const logoAsset = 'assets/brand/pipay-barrel.png';

  static const ink = Color(0xFF0F1B24);
  static const mist = Color(0xFFF4E8D3);
  static const cloud = Color(0xFFEDE6DA);
  static const pearl = Color(0xFFFFFBF4);
  static const night = Color(0xFF07131B);
  static const graphite = Color(0xFF2E2E2E);
  static const primary = Color(0xFFC1965A);
  static const secondary = Color(0xFFE0A642);
  static const accent = Color(0xFFF4E8D3);
  static const success = Color(0xFF12B981);
  static const error = Color(0xFFEF4444);
  static const warning = Color(0xFFF59E0B);
  static const muted = Color(0xFF667085);
  static const fieldDark = Color(0xFF1E1E1E);

  static const gradient = LinearGradient(
      begin: Alignment.topLeft,
      end: Alignment.bottomRight,
      colors: [Color(0xFFC1965A), Color(0xFFE0A642)]);

  static const darkGradient = LinearGradient(
      begin: Alignment.topLeft,
      end: Alignment.bottomRight,
      colors: [Color(0xFF0F1B24), Color(0xFF2E2E2E)]);

  static Color textColor(Brightness brightness) =>
      brightness == Brightness.dark ? Colors.white : Colors.black87;

  static Color mutedTextColor(Brightness brightness) =>
      brightness == Brightness.dark ? Colors.white70 : muted;

  static Color brandTextColor(Brightness brightness) =>
      brightness == Brightness.dark ? Colors.white : primary;

  static Color fieldFillColor(Brightness brightness) =>
      brightness == Brightness.dark ? fieldDark : Colors.white;

  static Color fieldTextColor(Brightness brightness) =>
      brightness == Brightness.dark ? Colors.white : Colors.black87;

  static LinearGradient backgroundGradient(Brightness brightness) {
    if (brightness == Brightness.dark) {
      return const LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [Color(0xFF101827), night]);
    }

    return const LinearGradient(
        begin: Alignment.topCenter,
        end: Alignment.bottomCenter,
        colors: [pearl, mist]);
  }
}

ThemeData buildFinTheme(Brightness brightness) {
  final isDark = brightness == Brightness.dark;
  final textColor = FinBrand.textColor(brightness);
  final mutedTextColor = FinBrand.mutedTextColor(brightness);
  final fieldFillColor = FinBrand.fieldFillColor(brightness);
  final scheme = ColorScheme(
      brightness: brightness,
      primary: FinBrand.primary,
      onPrimary: Colors.white,
      secondary: FinBrand.secondary,
      onSecondary: FinBrand.night,
      error: FinBrand.error,
      onError: Colors.white,
      surface: isDark ? const Color(0xFF16212A) : FinBrand.pearl,
      onSurface: textColor);

  final base = ThemeData(
      useMaterial3: true,
      brightness: brightness,
      colorScheme: scheme,
      fontFamily: 'Inter');

  return base.copyWith(
      scaffoldBackgroundColor: isDark ? FinBrand.night : FinBrand.mist,
      appBarTheme: AppBarTheme(
          elevation: 0,
          centerTitle: false,
          backgroundColor: Colors.transparent,
          foregroundColor: textColor,
          titleTextStyle: TextStyle(
              color: textColor, fontSize: 18, fontWeight: FontWeight.w800)),
      textTheme: base.textTheme
          .apply(bodyColor: textColor, displayColor: textColor)
          .copyWith(
              displayLarge: TextStyle(color: textColor, letterSpacing: 0),
              displayMedium: TextStyle(color: textColor, letterSpacing: 0),
              displaySmall: TextStyle(color: textColor, letterSpacing: 0),
              headlineLarge: TextStyle(
                  color: textColor,
                  fontSize: 34,
                  fontWeight: FontWeight.w900,
                  letterSpacing: 0),
              headlineMedium: TextStyle(
                  color: textColor,
                  fontSize: 26,
                  fontWeight: FontWeight.w800,
                  letterSpacing: 0),
              headlineSmall: TextStyle(color: textColor, letterSpacing: 0),
              titleLarge: TextStyle(
                  color: textColor,
                  fontSize: 20,
                  fontWeight: FontWeight.w800,
                  letterSpacing: 0),
              titleMedium: TextStyle(
                  color: textColor,
                  fontSize: 16,
                  fontWeight: FontWeight.w800,
                  letterSpacing: 0),
              titleSmall: TextStyle(color: textColor, letterSpacing: 0),
              bodyLarge: TextStyle(color: textColor, letterSpacing: 0),
              bodyMedium: TextStyle(
                  color: textColor,
                  fontSize: 14,
                  height: 1.35,
                  letterSpacing: 0),
              bodySmall: TextStyle(color: mutedTextColor, letterSpacing: 0),
              labelLarge: TextStyle(
                  color: textColor,
                  fontSize: 14,
                  fontWeight: FontWeight.w800,
                  letterSpacing: 0),
              labelMedium: TextStyle(color: textColor, letterSpacing: 0),
              labelSmall: TextStyle(color: mutedTextColor, letterSpacing: 0)),
      textSelectionTheme: TextSelectionThemeData(
          cursorColor: FinBrand.primary,
          selectionColor: FinBrand.primary.withValues(alpha: 0.28),
          selectionHandleColor: FinBrand.primary),
      inputDecorationTheme: InputDecorationTheme(
          filled: true,
          fillColor: fieldFillColor,
          labelStyle: TextStyle(color: mutedTextColor),
          floatingLabelStyle: const TextStyle(color: FinBrand.primary),
          hintStyle: TextStyle(color: mutedTextColor),
          helperStyle: TextStyle(color: mutedTextColor),
          prefixIconColor: mutedTextColor,
          suffixIconColor: mutedTextColor,
          border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(8),
              borderSide:
                  BorderSide(color: isDark ? Colors.white12 : FinBrand.cloud)),
          enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(8),
              borderSide:
                  BorderSide(color: isDark ? Colors.white12 : FinBrand.cloud)),
          focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(8),
              borderSide:
                  const BorderSide(color: FinBrand.primary, width: 1.4))),
      textButtonTheme: TextButtonThemeData(
          style: TextButton.styleFrom(foregroundColor: FinBrand.primary)),
      iconTheme: IconThemeData(color: textColor),
      listTileTheme:
          ListTileThemeData(textColor: textColor, iconColor: textColor, titleTextStyle: TextStyle(color: textColor, fontSize: 16, fontWeight: FontWeight.w700), subtitleTextStyle: TextStyle(color: mutedTextColor, fontSize: 13)),
      popupMenuTheme: PopupMenuThemeData(color: isDark ? const Color(0xFF16212A) : Colors.white, textStyle: TextStyle(color: textColor)));
}

class PiPayLogo extends StatelessWidget {
  const PiPayLogo(
      {this.size = 44,
      this.showWordmark = true,
      this.monochrome = false,
      super.key});

  final double size;
  final bool showWordmark;
  final bool monochrome;

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final wordColor = isDark ? Colors.white : FinBrand.ink;
    return Row(mainAxisSize: MainAxisSize.min, children: [
      Container(
          width: size,
          height: size,
          decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: FinBrand.pearl,
              boxShadow: monochrome
                  ? null
                  : [
                      BoxShadow(
                          color: FinBrand.primary.withValues(alpha: 0.22),
                          blurRadius: 22,
                          offset: const Offset(0, 10))
                    ]),
          clipBehavior: Clip.antiAlias,
          child: Image.asset(FinBrand.logoAsset, fit: BoxFit.cover)),
      if (showWordmark) ...[
        const SizedBox(width: 10),
        Text(FinBrand.appName,
            style: TextStyle(
                fontSize: size * 0.48,
                fontWeight: FontWeight.w900,
                color: wordColor,
                letterSpacing: 0))
      ]
    ]);
  }
}

class BrandOrb extends StatefulWidget {
  const BrandOrb({this.size = 148, super.key});

  final double size;

  @override
  State<BrandOrb> createState() => _BrandOrbState();
}

class _BrandOrbState extends State<BrandOrb>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller =
        AnimationController(vsync: this, duration: const Duration(seconds: 5))
          ..repeat();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
        animation: _controller,
        builder: (context, child) {
          final value = _controller.value * math.pi * 2;
          return Transform.translate(
              offset: Offset(math.sin(value) * 6, math.cos(value) * 4),
              child: child);
        },
        child: Container(
            width: widget.size,
            height: widget.size,
            decoration: BoxDecoration(
                shape: BoxShape.circle,
                gradient: FinBrand.gradient,
                boxShadow: [
                  BoxShadow(
                      color: FinBrand.secondary.withValues(alpha: 0.25),
                      blurRadius: 36,
                      offset: const Offset(0, 18))
                ]),
            child: Center(
                child: PiPayLogo(
                    size: widget.size * 0.62,
                    showWordmark: false,
                    monochrome: true))));
  }
}

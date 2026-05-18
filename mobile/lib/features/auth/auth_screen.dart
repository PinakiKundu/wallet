import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../app/providers.dart';
import '../../design/fin_components.dart';
import '../../design/finbrand.dart';

class AuthScreen extends ConsumerStatefulWidget {
  const AuthScreen({required this.onAuthenticated, super.key});

  final VoidCallback onAuthenticated;

  @override
  ConsumerState<AuthScreen> createState() => _AuthScreenState();
}

class _AuthScreenState extends ConsumerState<AuthScreen> {
  final _mobileController = TextEditingController(text: '+919999999999');
  final _otpController = TextEditingController();
  String? _challengeId;
  String? _debugOtp;
  String? _error;
  bool _loading = false;

  @override
  Widget build(BuildContext context) {
    final brightness = Theme.of(context).brightness;
    final textColor = FinBrand.textColor(brightness);
    final mutedColor = FinBrand.mutedTextColor(brightness);
    final brandColor = FinBrand.brandTextColor(brightness);
    final fieldTextColor = FinBrand.fieldTextColor(brightness);

    return Scaffold(
        backgroundColor: Theme.of(context).scaffoldBackgroundColor,
        body: Container(
            decoration: BoxDecoration(
                gradient: FinBrand.backgroundGradient(brightness)),
            child: SafeArea(
                bottom: false,
                child: ListView(
                    padding: const EdgeInsets.fromLTRB(22, 20, 22, 28),
                    children: [
                      const SizedBox(height: 12),
                      const Align(
                          alignment: Alignment.centerLeft,
                          child: PiPayLogo(size: 42, showWordmark: false)),
                      const SizedBox(height: 54),
                      Text('Welcome to',
                          style: Theme.of(context)
                              .textTheme
                              .titleMedium
                              ?.copyWith(color: textColor)),
                      Text(FinBrand.appName,
                          style: Theme.of(context)
                              .textTheme
                              .headlineLarge
                              ?.copyWith(color: brandColor, fontSize: 42)),
                      const SizedBox(height: 8),
                      Text(FinBrand.tagline,
                          style: TextStyle(
                              color: mutedColor, fontSize: 15, height: 1.45)),
                      const SizedBox(height: 34),
                      Column(children: [
                        Row(children: [
                          Container(
                              padding: const EdgeInsets.symmetric(
                                  horizontal: 12, vertical: 14),
                              decoration: BoxDecoration(
                                  color: FinBrand.secondary
                                      .withValues(alpha: 0.12),
                                  borderRadius: BorderRadius.circular(8)),
                              child: const Text('+91',
                                  style: TextStyle(
                                      color: FinBrand.primary,
                                      fontWeight: FontWeight.w900))),
                          const SizedBox(width: 10),
                          Expanded(
                              child: TextField(
                                  controller: _mobileController,
                                  keyboardType: TextInputType.phone,
                                  cursorColor: FinBrand.primary,
                                  style: TextStyle(
                                      color: fieldTextColor,
                                      fontWeight: FontWeight.w700),
                                  decoration: const InputDecoration(
                                      labelText: 'Mobile number')))
                        ]),
                        const SizedBox(height: 16),
                        FinButton(
                            onPressed: _loading ? null : _requestOtp,
                            label: _challengeId == null
                                ? 'Send OTP'
                                : 'Send OTP again',
                            loading: _loading && _challengeId == null),
                        AnimatedSwitcher(
                            duration: const Duration(milliseconds: 260),
                            child: _challengeId == null
                                ? const SizedBox.shrink()
                                : Column(key: const ValueKey('otp'), children: [
                                    const SizedBox(height: 16),
                                    TweenAnimationBuilder<double>(
                                        tween: Tween(begin: 0, end: 1),
                                        duration:
                                            const Duration(milliseconds: 700),
                                        builder: (context, value, child) =>
                                            Opacity(
                                                opacity: value,
                                                child: Transform.translate(
                                                    offset: Offset(
                                                        0, 16 * (1 - value)),
                                                    child: child)),
                                        child: TextField(
                                            controller: _otpController,
                                            keyboardType: TextInputType.number,
                                            cursorColor: FinBrand.primary,
                                            style: TextStyle(
                                                color: fieldTextColor,
                                                fontWeight: FontWeight.w700),
                                            decoration: InputDecoration(
                                                labelText: '6-digit OTP',
                                                prefixIcon: const Icon(Icons
                                                    .verified_user_outlined),
                                                helperText: _debugOtp == null
                                                    ? null
                                                    : 'Mock OTP: $_debugOtp'))),
                                    const SizedBox(height: 14),
                                    FinButton(
                                        onPressed: _loading ? null : _verifyOtp,
                                        icon: Icons.login_rounded,
                                        label: 'Verify and continue',
                                        loading: _loading)
                                  ]))
                      ]),
                      if (_error != null) ...[
                        const SizedBox(height: 14),
                        FinCard(
                            child: Row(children: [
                          const Icon(Icons.error_outline_rounded,
                              color: FinBrand.error),
                          const SizedBox(width: 10),
                          Expanded(
                              child: Text(_error!,
                                  style: const TextStyle(
                                      color: FinBrand.error,
                                      fontWeight: FontWeight.w700)))
                        ]))
                      ],
                      const SizedBox(height: 72),
                      Text(
                          'By continuing, you agree to our Terms & Privacy Policy.',
                          textAlign: TextAlign.center,
                          style: TextStyle(
                              color: mutedColor, fontSize: 11, height: 1.35))
                    ]))));
  }

  Future<void> _requestOtp() async {
    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final api = ref.read(apiClientProvider);
      final data = await api.post('/auth/otp/request', body: {
        'mobileNumber': _mobileController.text.trim(),
        'purpose': 'login'
      });
      setState(() {
        _challengeId = data['challengeId']?.toString();
        _debugOtp = data['debugOtp']?.toString();
      });
    } catch (error) {
      setState(() => _error = error.toString());
    } finally {
      setState(() => _loading = false);
    }
  }

  Future<void> _verifyOtp() async {
    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final api = ref.read(apiClientProvider);
      final tokenStore = ref.read(tokenStoreProvider);
      final data = await api.post('/auth/otp/verify', body: {
        'mobileNumber': _mobileController.text.trim(),
        'otp': _otpController.text.trim(),
        'device': {
          'deviceId': 'mobile-app-device',
          'deviceName': 'Flutter MVP',
          'platform': 'android',
          'appVersion': '0.1.0'
        }
      });
      await tokenStore.saveTokens(
          accessToken: data['accessToken'].toString(),
          refreshToken: data['refreshToken'].toString());
      widget.onAuthenticated();
    } catch (error) {
      setState(() => _error = error.toString());
    } finally {
      setState(() => _loading = false);
    }
  }
}

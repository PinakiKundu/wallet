import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../app/providers.dart';

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
    return Scaffold(
      appBar: AppBar(title: const Text('Login')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          TextField(
            controller: _mobileController,
            keyboardType: TextInputType.phone,
            decoration: const InputDecoration(labelText: 'Mobile number')
          ),
          const SizedBox(height: 12),
          FilledButton.icon(
            onPressed: _loading ? null : _requestOtp,
            icon: const Icon(Icons.sms),
            label: const Text('Request OTP')
          ),
          if (_challengeId != null) ...[
            const SizedBox(height: 16),
            TextField(
              controller: _otpController,
              keyboardType: TextInputType.number,
              decoration: InputDecoration(
                labelText: 'OTP',
                helperText: _debugOtp == null ? null : 'Mock OTP: $_debugOtp'
              )
            ),
            const SizedBox(height: 12),
            FilledButton.icon(
              onPressed: _loading ? null : _verifyOtp,
              icon: const Icon(Icons.login),
              label: const Text('Verify and continue')
            )
          ],
          if (_error != null) ...[
            const SizedBox(height: 12),
            Text(_error!, style: TextStyle(color: Theme.of(context).colorScheme.error))
          ]
        ]
      )
    );
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
        refreshToken: data['refreshToken'].toString()
      );
      widget.onAuthenticated();
    } catch (error) {
      setState(() => _error = error.toString());
    } finally {
      setState(() => _loading = false);
    }
  }
}

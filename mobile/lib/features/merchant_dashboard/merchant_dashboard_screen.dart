import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../app/providers.dart';

class MerchantDashboardScreen extends ConsumerStatefulWidget {
  const MerchantDashboardScreen({super.key});

  @override
  ConsumerState<MerchantDashboardScreen> createState() => _MerchantDashboardScreenState();
}

class _MerchantDashboardScreenState extends ConsumerState<MerchantDashboardScreen> {
  final _merchantIdController = TextEditingController();
  Map<String, dynamic>? _registration;
  Map<String, dynamic>? _dashboard;
  String? _error;

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        FilledButton.icon(
          onPressed: _registerDemoMerchant,
          icon: const Icon(Icons.add_business),
          label: const Text('Register demo merchant')
        ),
        if (_registration != null) ...[
          const SizedBox(height: 12),
          SelectableText(_registration.toString())
        ],
        const SizedBox(height: 16),
        TextField(
          controller: _merchantIdController,
          decoration: const InputDecoration(labelText: 'Merchant ID')
        ),
        const SizedBox(height: 12),
        OutlinedButton.icon(
          onPressed: _loadDashboard,
          icon: const Icon(Icons.dashboard),
          label: const Text('Load dashboard')
        ),
        if (_dashboard != null) ...[
          const SizedBox(height: 12),
          SelectableText(_dashboard.toString())
        ],
        if (_error != null) Text(_error!, style: TextStyle(color: Theme.of(context).colorScheme.error))
      ]
    );
  }

  Future<void> _registerDemoMerchant() async {
    try {
      final data = await ref.read(apiClientProvider).post('/merchants', body: {
        'businessName': 'Demo Store Private Limited',
        'displayName': 'Demo Store',
        'mobileNumber': '+919999999998',
        'email': 'merchant@example.com'
      });
      setState(() {
        _registration = data;
        _merchantIdController.text = data['merchant']['id'].toString();
        _error = null;
      });
    } catch (error) {
      setState(() => _error = error.toString());
    }
  }

  Future<void> _loadDashboard() async {
    try {
      final data = await ref.read(apiClientProvider).get('/merchants/${_merchantIdController.text.trim()}/dashboard');
      setState(() {
        _dashboard = data;
        _error = null;
      });
    } catch (error) {
      setState(() => _error = error.toString());
    }
  }
}

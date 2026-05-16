import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../app/providers.dart';

class AddMoneyScreen extends ConsumerStatefulWidget {
  const AddMoneyScreen({super.key});

  @override
  ConsumerState<AddMoneyScreen> createState() => _AddMoneyScreenState();
}

class _AddMoneyScreenState extends ConsumerState<AddMoneyScreen> {
  final _amountController = TextEditingController(text: '500');
  final _vpaController = TextEditingController(text: 'user@upi');
  Map<String, dynamic>? _order;
  String? _error;

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        TextField(
          controller: _amountController,
          keyboardType: TextInputType.number,
          decoration: const InputDecoration(labelText: 'Amount in rupees')
        ),
        const SizedBox(height: 12),
        FilledButton.icon(
          onPressed: () => _createIntent(),
          icon: const Icon(Icons.open_in_new),
          label: const Text('Create UPI intent')
        ),
        const SizedBox(height: 16),
        TextField(
          controller: _vpaController,
          decoration: const InputDecoration(labelText: 'Payer VPA')
        ),
        const SizedBox(height: 12),
        OutlinedButton.icon(
          onPressed: () => _createCollect(),
          icon: const Icon(Icons.send_to_mobile),
          label: const Text('Create collect request')
        ),
        if (_order != null) ...[
          const SizedBox(height: 16),
          SelectableText(_order.toString())
        ],
        if (_error != null) Text(_error!, style: TextStyle(color: Theme.of(context).colorScheme.error))
      ]
    );
  }

  Future<void> _createIntent() async {
    await _create('/payments/upi/intent', {'amount': _amountPaise()});
  }

  Future<void> _createCollect() async {
    await _create('/payments/upi/collect', {
      'amount': _amountPaise(),
      'payerVpa': _vpaController.text.trim()
    });
  }

  Future<void> _create(String path, Map<String, dynamic> body) async {
    try {
      final data = await ref.read(apiClientProvider).post(path, body: body, idempotent: true);
      setState(() {
        _order = data;
        _error = null;
      });
    } catch (error) {
      setState(() => _error = error.toString());
    }
  }

  int _amountPaise() => ((double.tryParse(_amountController.text) ?? 0) * 100).round();
}

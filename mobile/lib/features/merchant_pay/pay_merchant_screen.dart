import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../app/providers.dart';
import '../qr_scan/qr_scan_screen.dart';

class PayMerchantScreen extends ConsumerStatefulWidget {
  const PayMerchantScreen({super.key});

  @override
  ConsumerState<PayMerchantScreen> createState() => _PayMerchantScreenState();
}

class _PayMerchantScreenState extends ConsumerState<PayMerchantScreen> {
  final _merchantCodeController = TextEditingController(text: 'MWK-DEMO001');
  final _amountController = TextEditingController(text: '100');
  Map<String, dynamic>? _merchant;
  Map<String, dynamic>? _receipt;
  String? _qrId;
  String? _error;

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        FilledButton.icon(
          onPressed: _scanQr,
          icon: const Icon(Icons.qr_code_scanner),
          label: const Text('Scan merchant QR')
        ),
        const SizedBox(height: 16),
        TextField(
          controller: _merchantCodeController,
          decoration: const InputDecoration(labelText: 'Merchant / vendor code')
        ),
        const SizedBox(height: 8),
        OutlinedButton.icon(
          onPressed: _lookupVendorCode,
          icon: const Icon(Icons.search),
          label: const Text('Lookup code')
        ),
        if (_merchant != null)
          ListTile(
            contentPadding: EdgeInsets.zero,
            title: Text(_merchant!['displayName'].toString()),
            subtitle: Text(_merchant!['merchantCode'].toString())
          ),
        TextField(
          controller: _amountController,
          keyboardType: TextInputType.number,
          decoration: const InputDecoration(labelText: 'Amount in rupees')
        ),
        const SizedBox(height: 12),
        FilledButton.icon(
          onPressed: _pay,
          icon: const Icon(Icons.payments),
          label: const Text('Pay merchant')
        ),
        if (_receipt != null) ...[
          const SizedBox(height: 16),
          SelectableText(_receipt.toString())
        ],
        if (_error != null) Text(_error!, style: TextStyle(color: Theme.of(context).colorScheme.error))
      ]
    );
  }

  Future<void> _scanQr() async {
    final payload = await Navigator.of(context).push<String>(
      MaterialPageRoute(builder: (_) => const QrScanScreen())
    );

    if (payload == null) {
      return;
    }

    try {
      final data = await ref.read(apiClientProvider).post('/merchants/qr/parse', body: {'payload': payload});
      setState(() {
        _merchant = data;
        _qrId = data['qrId']?.toString();
        _merchantCodeController.text = data['merchantCode'].toString();
        _error = null;
      });
    } catch (error) {
      setState(() => _error = error.toString());
    }
  }

  Future<void> _lookupVendorCode() async {
    try {
      final data = await ref.read(apiClientProvider).get('/merchants/vendor-codes/${_merchantCodeController.text.trim()}');
      setState(() {
        _merchant = data;
        _qrId = null;
        _error = null;
      });
    } catch (error) {
      setState(() => _error = error.toString());
    }
  }

  Future<void> _pay() async {
    try {
      final data = await ref.read(apiClientProvider).post('/transactions/merchant-payments', idempotent: true, body: {
        'merchantCode': _merchantCodeController.text.trim(),
        'amount': ((double.tryParse(_amountController.text) ?? 0) * 100).round(),
        'paymentSource': _qrId == null ? 'vendor_code' : 'qr',
        if (_qrId != null) 'qrId': _qrId
      });
      setState(() {
        _receipt = data;
        _error = null;
      });
    } catch (error) {
      setState(() => _error = error.toString());
    }
  }
}

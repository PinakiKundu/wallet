import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';
import 'package:mobile_scanner/mobile_scanner.dart';

import '../../app/providers.dart';
import '../../design/fin_components.dart';
import '../../design/finbrand.dart';

class PayMerchantScreen extends ConsumerStatefulWidget {
  const PayMerchantScreen({super.key});

  @override
  ConsumerState<PayMerchantScreen> createState() => _PayMerchantScreenState();
}

class _PayMerchantScreenState extends ConsumerState<PayMerchantScreen> {
  final _merchantCodeController = TextEditingController(text: 'MWK-DEMO001');
  final _amountController = TextEditingController(text: '100');
  final _scannerController = MobileScannerController(
      detectionSpeed: DetectionSpeed.noDuplicates,
      formats: const [BarcodeFormat.qrCode]);
  final _imagePicker = ImagePicker();
  Map<String, dynamic>? _merchant;
  Map<String, dynamic>? _receipt;
  String? _qrId;
  String? _error;
  bool _loading = false;
  bool _handlingQr = false;

  @override
  void dispose() {
    _scannerController.dispose();
    _merchantCodeController.dispose();
    _amountController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final brightness = Theme.of(context).brightness;
    final isDark = brightness == Brightness.dark;
    final textColor = FinBrand.textColor(brightness);
    final mutedColor = FinBrand.mutedTextColor(brightness);

    if (_receipt != null) {
      return _PaymentSuccessScreen(
          amount: _amountController.text.trim(),
          merchantName:
              (_merchant?['displayName'] ?? _merchantCodeController.text.trim())
                  .toString(),
          receipt: _receipt!,
          onDone: () => setState(() => _receipt = null));
    }

    return Scaffold(
        backgroundColor: Theme.of(context).scaffoldBackgroundColor,
        body: Container(
            decoration: BoxDecoration(
                gradient: FinBrand.backgroundGradient(brightness)),
            child: SafeArea(
                bottom: false,
                child: Padding(
                    padding: const EdgeInsets.fromLTRB(20, 18, 20, 108),
                    child: ListView(children: [
                      Row(children: [
                        Icon(Icons.chevron_left_rounded, color: textColor),
                        const SizedBox(width: 8),
                        Text('Scan QR Code',
                            style: TextStyle(
                                color: textColor,
                                fontWeight: FontWeight.w900,
                                fontSize: 18))
                      ]),
                      const SizedBox(height: 6),
                      Text(
                          'Scan a PiPay QR or use a static vendor code for instant wallet payments.',
                          style: TextStyle(color: mutedColor)),
                      const SizedBox(height: 20),
                      FinCard(
                          gradient: isDark ? FinBrand.darkGradient : null,
                          child: Column(children: [
                            Container(
                                height: 230,
                                clipBehavior: Clip.antiAlias,
                                decoration: BoxDecoration(
                                    color: (isDark
                                            ? Colors.white
                                            : FinBrand.primary)
                                        .withValues(alpha: 0.08),
                                    borderRadius: BorderRadius.circular(8)),
                                child: Stack(children: [
                                  MobileScanner(
                                      controller: _scannerController,
                                      fit: BoxFit.cover,
                                      onDetect: (capture) {
                                        final value = capture
                                            .barcodes.firstOrNull?.rawValue;

                                        if (value != null && value.isNotEmpty) {
                                          _handleQrPayload(value);
                                        }
                                      },
                                      errorBuilder: (context, error, child) {
                                        return Center(
                                            child: Padding(
                                                padding:
                                                    const EdgeInsets.all(18),
                                                child: Text(
                                                    'Camera unavailable. Use Gallery or enter a vendor code.',
                                                    textAlign: TextAlign.center,
                                                    style: TextStyle(
                                                        color: mutedColor,
                                                        fontWeight:
                                                            FontWeight.w700))));
                                      }),
                                  const _InlineScannerOverlay()
                                ])),
                            const SizedBox(height: 14),
                            Row(children: [
                              Expanded(
                                  child: ValueListenableBuilder<
                                          MobileScannerState>(
                                      valueListenable: _scannerController,
                                      builder: (context, state, child) {
                                        final torchOn =
                                            state.torchState == TorchState.on;

                                        return FinButton(
                                            onPressed: _toggleFlash,
                                            icon: torchOn
                                                ? Icons.flash_on_rounded
                                                : Icons.flash_off_rounded,
                                            label:
                                                torchOn ? 'Flash on' : 'Flash',
                                            secondary: true);
                                      })),
                              const SizedBox(width: 10),
                              Expanded(
                                  child: FinButton(
                                      onPressed: _pickQrFromGallery,
                                      icon: Icons.photo_library_rounded,
                                      label: 'Gallery'))
                            ])
                          ])),
                      const SizedBox(height: 16),
                      FinCard(
                          child: Column(children: [
                        TextField(
                            controller: _merchantCodeController,
                            decoration: const InputDecoration(
                                labelText: 'Merchant or vendor code',
                                prefixIcon: Icon(Icons.storefront_rounded))),
                        const SizedBox(height: 12),
                        FinButton(
                            onPressed: _lookupVendorCode,
                            icon: Icons.search_rounded,
                            label: 'Lookup merchant',
                            secondary: true,
                            loading: _loading)
                      ])),
                      if (_merchant != null) ...[
                        const SizedBox(height: 14),
                        FinCard(
                            child: Row(children: [
                          Container(
                              width: 52,
                              height: 52,
                              decoration: BoxDecoration(
                                  gradient: FinBrand.gradient,
                                  borderRadius: BorderRadius.circular(8)),
                              child: const Icon(Icons.verified_rounded,
                                  color: Colors.white)),
                          const SizedBox(width: 14),
                          Expanded(
                              child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                Text(_merchant!['displayName'].toString(),
                                    style: const TextStyle(
                                        fontWeight: FontWeight.w900)),
                                Text(_merchant!['merchantCode'].toString(),
                                    style: TextStyle(color: mutedColor))
                              ])),
                          const StatusPill(label: 'Verified')
                        ]))
                      ],
                      const SizedBox(height: 16),
                      FinCard(
                          child: Column(children: [
                        TextField(
                            controller: _amountController,
                            keyboardType: TextInputType.number,
                            decoration: const InputDecoration(
                                labelText: 'Amount in rupees',
                                prefixIcon:
                                    Icon(Icons.currency_rupee_rounded))),
                        const SizedBox(height: 12),
                        FinButton(
                            onPressed: _loading ? null : _confirmPay,
                            icon: Icons.payments_rounded,
                            label: 'Review payment',
                            loading: _loading)
                      ])),
                      if (_error != null) ...[
                        const SizedBox(height: 12),
                        Text(_error!,
                            style: const TextStyle(
                                color: FinBrand.error,
                                fontWeight: FontWeight.w700))
                      ]
                    ])))));
  }

  Future<void> _confirmPay() async {
    final confirmed = await showModalBottomSheet<bool>(
        context: context,
        showDragHandle: true,
        builder: (context) => Padding(
            padding: const EdgeInsets.fromLTRB(20, 8, 20, 24),
            child: Column(mainAxisSize: MainAxisSize.min, children: [
              const AnimatedCheckmark(),
              const SizedBox(height: 12),
              Text('Confirm payment',
                  style: Theme.of(context).textTheme.titleLarge),
              const SizedBox(height: 8),
              Text(
                  'INR ${_amountController.text.trim()} to ${_merchant?['displayName'] ?? _merchantCodeController.text.trim()}',
                  textAlign: TextAlign.center),
              const SizedBox(height: 18),
              FinButton(
                  onPressed: () => Navigator.of(context).pop(true),
                  icon: Icons.lock_rounded,
                  label: 'Pay securely')
            ])));

    if (confirmed == true) {
      await _pay();
    }
  }

  Future<void> _toggleFlash() async {
    try {
      await _scannerController.toggleTorch();
    } catch (error) {
      setState(() => _error = 'Flash is unavailable on this device.');
    }
  }

  Future<void> _pickQrFromGallery() async {
    try {
      final image = await _imagePicker.pickImage(source: ImageSource.gallery);

      if (image == null) {
        return;
      }

      final capture = await _scannerController.analyzeImage(image.path);
      final payload = capture?.barcodes.firstOrNull?.rawValue;

      if (payload == null || payload.isEmpty) {
        setState(() => _error = 'No QR code found in the selected image.');
        return;
      }

      await _handleQrPayload(payload);
    } catch (error) {
      setState(() => _error = 'Unable to read QR from gallery.');
    }
  }

  Future<void> _handleQrPayload(String payload) async {
    if (_handlingQr) {
      return;
    }

    _handlingQr = true;

    try {
      final data = await ref
          .read(apiClientProvider)
          .post('/merchants/qr/parse', body: {'payload': payload});
      setState(() {
        _merchant = data;
        _qrId = data['qrId']?.toString();
        _merchantCodeController.text = data['merchantCode'].toString();
        _error = null;
      });
    } catch (error) {
      setState(() => _error = error.toString());
    } finally {
      _handlingQr = false;
    }
  }

  Future<void> _lookupVendorCode() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final data = await ref.read(apiClientProvider).get(
          '/merchants/vendor-codes/${_merchantCodeController.text.trim()}');
      setState(() {
        _merchant = data;
        _qrId = null;
        _error = null;
      });
    } catch (error) {
      setState(() => _error = error.toString());
    } finally {
      setState(() => _loading = false);
    }
  }

  Future<void> _pay() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final data = await ref
          .read(apiClientProvider)
          .post('/transactions/merchant-payments', idempotent: true, body: {
        'merchantCode': _merchantCodeController.text.trim(),
        'amount':
            ((double.tryParse(_amountController.text) ?? 0) * 100).round(),
        'paymentSource': _qrId == null ? 'vendor_code' : 'qr',
        if (_qrId != null) 'qrId': _qrId
      });
      setState(() {
        _receipt = data;
        _error = null;
      });
    } catch (error) {
      setState(() => _error = error.toString());
    } finally {
      setState(() => _loading = false);
    }
  }
}

class _InlineScannerOverlay extends StatelessWidget {
  const _InlineScannerOverlay();

  @override
  Widget build(BuildContext context) {
    return IgnorePointer(
        child: Stack(children: [
      Container(color: Colors.black.withValues(alpha: 0.16)),
      Center(
          child: Container(
              width: 164,
              height: 164,
              decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: FinBrand.secondary, width: 2),
                  boxShadow: [
                    BoxShadow(
                        color: FinBrand.secondary.withValues(alpha: 0.32),
                        blurRadius: 20)
                  ]))),
      const Positioned(
          left: 16,
          right: 16,
          bottom: 14,
          child: Text('Point camera at a PiPay QR',
              textAlign: TextAlign.center,
              style: TextStyle(
                  color: Colors.white,
                  fontWeight: FontWeight.w800,
                  shadows: [Shadow(color: Colors.black54, blurRadius: 8)])))
    ]));
  }
}

class _PaymentSuccessScreen extends StatelessWidget {
  const _PaymentSuccessScreen(
      {required this.amount,
      required this.merchantName,
      required this.receipt,
      required this.onDone});

  final String amount;
  final String merchantName;
  final Map<String, dynamic> receipt;
  final VoidCallback onDone;

  @override
  Widget build(BuildContext context) {
    final brightness = Theme.of(context).brightness;
    final textColor = FinBrand.textColor(brightness);
    final mutedColor = FinBrand.mutedTextColor(brightness);

    final transactionId = receipt['transactionRef']?.toString() ??
        receipt['id']?.toString() ??
        'PIPAY-LOCAL';
    return Scaffold(
        backgroundColor: Theme.of(context).scaffoldBackgroundColor,
        body: Container(
            decoration: BoxDecoration(
                gradient: FinBrand.backgroundGradient(brightness)),
            child: SafeArea(
                bottom: false,
                child: Padding(
                    padding: const EdgeInsets.fromLTRB(24, 44, 24, 32),
                    child: Column(children: [
                      const Spacer(),
                      const AnimatedCheckmark(),
                      const SizedBox(height: 28),
                      Text('Payment Successful!',
                          style: TextStyle(
                              color: textColor,
                              fontSize: 18,
                              fontWeight: FontWeight.w900)),
                      const SizedBox(height: 10),
                      Text('₹$amount.00',
                          style: TextStyle(
                              color: textColor,
                              fontSize: 32,
                              fontWeight: FontWeight.w900)),
                      const SizedBox(height: 24),
                      Text('Paid to\n$merchantName',
                          textAlign: TextAlign.center,
                          style: TextStyle(color: mutedColor, height: 1.5)),
                      const SizedBox(height: 22),
                      Text('Transaction ID\n$transactionId',
                          textAlign: TextAlign.center,
                          style: TextStyle(
                              color: mutedColor.withValues(alpha: 0.78),
                              fontSize: 12,
                              height: 1.5)),
                      const Spacer(),
                      FinButton(
                          onPressed: onDone,
                          icon: Icons.receipt_long_rounded,
                          label: 'View Receipt')
                    ])))));
  }
}

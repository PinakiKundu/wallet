import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:mobile_scanner/mobile_scanner.dart';

import '../../design/finbrand.dart';

class QrScanScreen extends StatelessWidget {
  const QrScanScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      extendBodyBehindAppBar: true,
      appBar: AppBar(title: const Text('Scan QR'), foregroundColor: Colors.white),
      body: Stack(
        children: [
          MobileScanner(
            onDetect: (capture) {
              final barcode = capture.barcodes.firstOrNull;
              final value = barcode?.rawValue;

              if (value != null && value.isNotEmpty) {
                HapticFeedback.mediumImpact();
                Navigator.of(context).pop(value);
              }
            }
          ),
          Container(
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
                colors: [Colors.black.withValues(alpha: 0.55), Colors.transparent, Colors.black.withValues(alpha: 0.72)]
              )
            )
          ),
          const _ScannerOverlay(),
          const Positioned(
            left: 24,
            right: 24,
            bottom: 44,
            child: Text(
              'Align the PiPay merchant QR inside the glowing frame',
              textAlign: TextAlign.center,
              style: TextStyle(color: Colors.white, fontWeight: FontWeight.w800)
            )
          )
        ]
      )
    );
  }
}

class _ScannerOverlay extends StatefulWidget {
  const _ScannerOverlay();

  @override
  State<_ScannerOverlay> createState() => _ScannerOverlayState();
}

class _ScannerOverlayState extends State<_ScannerOverlay> with SingleTickerProviderStateMixin {
  late final AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(vsync: this, duration: const Duration(milliseconds: 1600))..repeat(reverse: true);
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Center(
      child: SizedBox(
        width: 270,
        height: 270,
        child: AnimatedBuilder(
          animation: _controller,
          builder: (context, child) {
            return Stack(
              children: [
                Container(
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(34),
                    border: Border.all(color: FinBrand.secondary.withValues(alpha: 0.86), width: 2),
                    boxShadow: [BoxShadow(color: FinBrand.secondary.withValues(alpha: 0.34), blurRadius: 26)]
                  )
                ),
                Positioned(
                  left: 18,
                  right: 18,
                  top: 28 + (_controller.value * 190),
                  child: Container(
                    height: 3,
                    decoration: BoxDecoration(
                      gradient: FinBrand.gradient,
                      borderRadius: BorderRadius.circular(999),
                      boxShadow: [BoxShadow(color: FinBrand.secondary.withValues(alpha: 0.8), blurRadius: 18)]
                    )
                  )
                )
              ]
            );
          }
        )
      )
    );
  }
}

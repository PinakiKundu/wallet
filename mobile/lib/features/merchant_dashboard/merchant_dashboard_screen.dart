import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../app/providers.dart';
import '../../design/fin_components.dart';
import '../../design/finbrand.dart';

class MerchantDashboardScreen extends ConsumerStatefulWidget {
  const MerchantDashboardScreen({super.key});

  @override
  ConsumerState<MerchantDashboardScreen> createState() =>
      _MerchantDashboardScreenState();
}

class _MerchantDashboardScreenState
    extends ConsumerState<MerchantDashboardScreen> {
  final _merchantIdController = TextEditingController();
  Map<String, dynamic>? _registration;
  Map<String, dynamic>? _dashboard;
  String? _error;
  bool _loading = false;

  @override
  Widget build(BuildContext context) {
    final brightness = Theme.of(context).brightness;
    final isDark = brightness == Brightness.dark;
    final mutedColor = FinBrand.mutedTextColor(brightness);

    return Scaffold(
        body: FinScaffold(
            padding: const EdgeInsets.fromLTRB(20, 18, 20, 108),
            child: ListView(children: [
              Text('Merchant studio',
                  style: Theme.of(context).textTheme.headlineMedium),
              const SizedBox(height: 6),
              Text(
                  'Register PiPay merchants, inspect revenue, and track settlements.',
                  style: TextStyle(color: mutedColor)),
              const SizedBox(height: 20),
              FinCard(
                  gradient: isDark ? FinBrand.darkGradient : FinBrand.gradient,
                  child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('Revenue pulse',
                            style: TextStyle(
                                color: Colors.white70,
                                fontWeight: FontWeight.w800)),
                        const SizedBox(height: 10),
                        const Text('INR 24,860',
                            style: TextStyle(
                                color: Colors.white,
                                fontSize: 32,
                                fontWeight: FontWeight.w900)),
                        const SizedBox(height: 14),
                        SizedBox(
                            height: 80,
                            child: CustomPaint(painter: _ChartPainter())),
                        const SizedBox(height: 10),
                        const Row(children: [
                          Expanded(
                              child: _DarkMetric(
                                  label: 'Success', value: '99.1%')),
                          SizedBox(width: 10),
                          Expanded(
                              child:
                                  _DarkMetric(label: 'Settled', value: '18.4K'))
                        ])
                      ])),
              const SizedBox(height: 16),
              FinButton(
                  onPressed: _loading ? null : _registerDemoMerchant,
                  icon: Icons.add_business_rounded,
                  label: 'Register demo merchant',
                  loading: _loading),
              if (_registration != null) ...[
                const SizedBox(height: 14),
                FinCard(
                    child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                      Row(children: [
                        const AnimatedCheckmark(),
                        const SizedBox(width: 12),
                        Expanded(
                            child: Text('Merchant registered',
                                style: Theme.of(context).textTheme.titleMedium))
                      ]),
                      const SizedBox(height: 10),
                      SelectableText(_registration.toString(),
                          style: TextStyle(color: mutedColor, fontSize: 12))
                    ]))
              ],
              const SizedBox(height: 16),
              FinCard(
                  child: Column(children: [
                TextField(
                    controller: _merchantIdController,
                    decoration: const InputDecoration(
                        labelText: 'Merchant ID',
                        prefixIcon: Icon(Icons.badge_outlined))),
                const SizedBox(height: 12),
                FinButton(
                    onPressed: _loading ? null : _loadDashboard,
                    icon: Icons.dashboard_customize_rounded,
                    label: 'Load dashboard',
                    secondary: true,
                    loading: _loading)
              ])),
              if (_dashboard != null) ...[
                const SizedBox(height: 16),
                const SectionHeader(title: 'Settlement tracker'),
                const SizedBox(height: 10),
                const _SettlementTile(
                    title: 'Next settlement',
                    subtitle: 'T+1 bank transfer',
                    value: 'Queued',
                    color: FinBrand.warning),
                const SizedBox(height: 10),
                const _SettlementTile(
                    title: 'QR inventory',
                    subtitle: 'Static and dynamic codes',
                    value: 'Active',
                    color: FinBrand.success),
                const SizedBox(height: 10),
                FinCard(
                    child: SelectableText(_dashboard.toString(),
                        style: TextStyle(color: mutedColor, fontSize: 12)))
              ],
              if (_error != null) ...[
                const SizedBox(height: 12),
                Text(_error!,
                    style: const TextStyle(
                        color: FinBrand.error, fontWeight: FontWeight.w700))
              ]
            ])));
  }

  Future<void> _registerDemoMerchant() async {
    setState(() {
      _loading = true;
      _error = null;
    });
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
    } finally {
      setState(() => _loading = false);
    }
  }

  Future<void> _loadDashboard() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final data = await ref
          .read(apiClientProvider)
          .get('/merchants/${_merchantIdController.text.trim()}/dashboard');
      setState(() {
        _dashboard = data;
        _error = null;
      });
    } catch (error) {
      setState(() => _error = error.toString());
    } finally {
      setState(() => _loading = false);
    }
  }
}

class _DarkMetric extends StatelessWidget {
  const _DarkMetric({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
            color: Colors.white.withValues(alpha: 0.09),
            borderRadius: BorderRadius.circular(8)),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(label,
              style: const TextStyle(color: Colors.white60, fontSize: 12)),
          const SizedBox(height: 3),
          Text(value,
              style: const TextStyle(
                  color: Colors.white, fontWeight: FontWeight.w900))
        ]));
  }
}

class _SettlementTile extends StatelessWidget {
  const _SettlementTile(
      {required this.title,
      required this.subtitle,
      required this.value,
      required this.color});

  final String title;
  final String subtitle;
  final String value;
  final Color color;

  @override
  Widget build(BuildContext context) {
    final mutedColor = FinBrand.mutedTextColor(Theme.of(context).brightness);

    return FinCard(
        padding: const EdgeInsets.all(14),
        child: Row(children: [
          Icon(Icons.timeline_rounded, color: color),
          const SizedBox(width: 12),
          Expanded(
              child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                Text(title,
                    style: const TextStyle(fontWeight: FontWeight.w900)),
                Text(subtitle,
                    style: TextStyle(color: mutedColor, fontSize: 12))
              ])),
          StatusPill(label: value, color: color)
        ]));
  }
}

class _ChartPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final gridPaint = Paint()
      ..color = Colors.white.withValues(alpha: 0.08)
      ..strokeWidth = 1;
    for (var i = 1; i < 4; i++) {
      final y = size.height * i / 4;
      canvas.drawLine(Offset(0, y), Offset(size.width, y), gridPaint);
    }
    final points = [
      Offset(0, size.height * 0.72),
      Offset(size.width * 0.18, size.height * 0.54),
      Offset(size.width * 0.36, size.height * 0.62),
      Offset(size.width * 0.54, size.height * 0.34),
      Offset(size.width * 0.74, size.height * 0.42),
      Offset(size.width, size.height * 0.18)
    ];
    final path = Path()..moveTo(points.first.dx, points.first.dy);
    for (final point in points.skip(1)) {
      path.lineTo(point.dx, point.dy);
    }
    final paint = Paint()
      ..shader = FinBrand.gradient.createShader(Offset.zero & size)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 4
      ..strokeCap = StrokeCap.round
      ..strokeJoin = StrokeJoin.round;
    canvas.drawPath(path, paint);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

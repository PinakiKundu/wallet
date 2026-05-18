import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../app/providers.dart';
import '../../design/fin_components.dart';
import '../../design/finbrand.dart';

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
  bool _loading = false;

  @override
  Widget build(BuildContext context) {
    final mutedColor = FinBrand.mutedTextColor(Theme.of(context).brightness);

    return Scaffold(
        body: FinScaffold(
            padding: const EdgeInsets.fromLTRB(20, 18, 20, 108),
            child: ListView(children: [
              Text('Add money',
                  style: Theme.of(context).textTheme.headlineMedium),
              const SizedBox(height: 6),
              Text(
                  'Fund your PiPay wallet through mock UPI intent or collect flows.',
                  style: TextStyle(color: mutedColor)),
              const SizedBox(height: 20),
              FinCard(
                  gradient: FinBrand.gradient,
                  child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('Amount',
                            style: TextStyle(
                                color: Colors.white70,
                                fontWeight: FontWeight.w800)),
                        const SizedBox(height: 8),
                        TextField(
                            controller: _amountController,
                            keyboardType: TextInputType.number,
                            style: const TextStyle(
                                color: Colors.white,
                                fontSize: 34,
                                fontWeight: FontWeight.w900),
                            decoration: const InputDecoration(
                                prefixText: 'INR ',
                                prefixStyle: TextStyle(
                                    color: Colors.white70,
                                    fontSize: 24,
                                    fontWeight: FontWeight.w900),
                                filled: false,
                                enabledBorder: InputBorder.none,
                                focusedBorder: InputBorder.none)),
                        const SizedBox(height: 10),
                        Wrap(
                            spacing: 8,
                            children: [250, 500, 1000, 2000].map((amount) {
                              return ActionChip(
                                  label: Text('INR $amount'),
                                  onPressed: () => setState(() =>
                                      _amountController.text =
                                          amount.toString()),
                                  backgroundColor:
                                      Colors.white.withValues(alpha: 0.9),
                                  labelStyle: const TextStyle(
                                      color: FinBrand.ink,
                                      fontWeight: FontWeight.w900),
                                  side: BorderSide(
                                      color: Colors.white
                                          .withValues(alpha: 0.72)));
                            }).toList())
                      ])),
              const SizedBox(height: 18),
              const SectionHeader(title: 'UPI methods'),
              const SizedBox(height: 10),
              _PaymentMethodCard(
                  icon: Icons.open_in_new_rounded,
                  title: 'UPI intent',
                  subtitle:
                      'Launch a provider app using the generated payment intent.',
                  onTap: _loading ? null : _createIntent),
              const SizedBox(height: 10),
              FinCard(
                  child: Column(children: [
                TextField(
                    controller: _vpaController,
                    decoration: const InputDecoration(
                        labelText: 'Payer VPA',
                        prefixIcon: Icon(Icons.alternate_email_rounded))),
                const SizedBox(height: 12),
                FinButton(
                    onPressed: _loading ? null : _createCollect,
                    icon: Icons.send_to_mobile_rounded,
                    label: 'Create collect request',
                    secondary: true,
                    loading: _loading)
              ])),
              if (_loading) ...[
                const SizedBox(height: 16),
                const FinCard(
                    child: Column(children: [
                  SkeletonLine(width: 220),
                  SizedBox(height: 12),
                  SkeletonLine(width: 160)
                ]))
              ],
              if (_order != null) ...[
                const SizedBox(height: 16),
                FinCard(
                    child: Column(children: [
                  const AnimatedCheckmark(),
                  const SizedBox(height: 12),
                  Text('Payment order created',
                      style: Theme.of(context).textTheme.titleMedium),
                  const SizedBox(height: 8),
                  SelectableText(_order.toString(),
                      style: TextStyle(color: mutedColor, fontSize: 12))
                ]))
              ],
              if (_error != null) ...[
                const SizedBox(height: 12),
                Text(_error!,
                    style: const TextStyle(
                        color: FinBrand.error, fontWeight: FontWeight.w700))
              ]
            ])));
  }

  Future<void> _createIntent() async {
    final data =
        await _create('/payments/upi/intent', {'amount': _amountPaise()});
    if (data == null) {
      return;
    }

    final upiIntentUrl = data['upiIntentUrl'] as String?;
    if (upiIntentUrl == null || upiIntentUrl.isEmpty) {
      setState(() => _error = 'UPI intent URL was not returned.');
      return;
    }

    final launched = await launchUrl(
      Uri.parse(upiIntentUrl),
      mode: LaunchMode.externalApplication,
    );
    if (!launched) {
      setState(() => _error = 'No UPI app found to open this payment intent.');
    }
  }

  Future<void> _createCollect() async {
    await _create('/payments/upi/collect',
        {'amount': _amountPaise(), 'payerVpa': _vpaController.text.trim()});
  }

  Future<Map<String, dynamic>?> _create(
      String path, Map<String, dynamic> body) async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final data = await ref
          .read(apiClientProvider)
          .post(path, body: body, idempotent: true);
      setState(() {
        _order = data;
        _error = null;
      });
      return data;
    } catch (error) {
      setState(() => _error = error.toString());
      return null;
    } finally {
      setState(() => _loading = false);
    }
  }

  int _amountPaise() =>
      ((double.tryParse(_amountController.text) ?? 0) * 100).round();
}

class _PaymentMethodCard extends StatelessWidget {
  const _PaymentMethodCard(
      {required this.icon,
      required this.title,
      required this.subtitle,
      required this.onTap});

  final IconData icon;
  final String title;
  final String subtitle;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final mutedColor = FinBrand.mutedTextColor(Theme.of(context).brightness);

    return FinCard(
        onTap: onTap,
        child: Row(children: [
          Container(
              width: 52,
              height: 52,
              decoration: BoxDecoration(
                  color: FinBrand.secondary.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(8)),
              child: Icon(icon, color: FinBrand.secondary)),
          const SizedBox(width: 14),
          Expanded(
              child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                Text(title,
                    style: const TextStyle(fontWeight: FontWeight.w900)),
                const SizedBox(height: 4),
                Text(subtitle,
                    style: TextStyle(color: mutedColor, fontSize: 12))
              ])),
          const Icon(Icons.chevron_right_rounded)
        ]));
  }
}

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../app/providers.dart';
import '../../design/fin_components.dart';
import '../../design/finbrand.dart';

enum _ProfileAction { logout }

class WalletScreen extends ConsumerStatefulWidget {
  const WalletScreen(
      {required this.onAddMoney,
      required this.onScan,
      required this.onVendorPay,
      required this.onBills,
      required this.onLogout,
      super.key});

  final VoidCallback onAddMoney;
  final VoidCallback onScan;
  final VoidCallback onVendorPay;
  final VoidCallback onBills;
  final Future<void> Function() onLogout;

  @override
  ConsumerState<WalletScreen> createState() => _WalletScreenState();
}

class _WalletScreenState extends ConsumerState<WalletScreen> {
  Map<String, dynamic>? _wallet;
  List<dynamic> _entries = [];
  String? _error;
  bool _showBalance = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  Widget build(BuildContext context) {
    final brightness = Theme.of(context).brightness;
    final textColor = FinBrand.textColor(brightness);

    return Scaffold(
        backgroundColor: Theme.of(context).scaffoldBackgroundColor,
        body: Container(
            decoration: BoxDecoration(
                gradient: FinBrand.backgroundGradient(brightness)),
            child: SafeArea(
                bottom: false,
                child: Padding(
                    padding: const EdgeInsets.fromLTRB(20, 12, 20, 108),
                    child: RefreshIndicator(
                        onRefresh: _load,
                        child: ListView(children: [
                          Row(children: [
                            const PiPayLogo(size: 34, showWordmark: false),
                            const SizedBox(width: 8),
                            Text('PiPay',
                                style: TextStyle(
                                    color: textColor,
                                    fontWeight: FontWeight.w900,
                                    fontSize: 16)),
                            const Spacer(),
                            IconButton.filledTonal(
                                onPressed: _load,
                                icon: const Icon(Icons.sync_rounded)),
                            const SizedBox(width: 8),
                            PopupMenuButton<_ProfileAction>(
                                tooltip: 'Profile',
                                icon: const Icon(Icons.account_circle_rounded),
                                itemBuilder: (context) => const [
                                      PopupMenuItem(
                                          value: _ProfileAction.logout,
                                          child: ListTile(
                                              leading:
                                                  Icon(Icons.logout_rounded),
                                              title: Text('Logout'),
                                              contentPadding: EdgeInsets.zero))
                                    ],
                                onSelected: (action) async {
                                  switch (action) {
                                    case _ProfileAction.logout:
                                      await widget.onLogout();
                                  }
                                })
                          ]),
                          const SizedBox(height: 18),
                          _wallet == null
                              ? _walletSkeleton(context)
                              : _balanceCard(context),
                          const SizedBox(height: 18),
                          LayoutBuilder(builder: (context, constraints) {
                            final columns = constraints.maxWidth < 340 ? 2 : 4;
                            return GridView.count(
                                shrinkWrap: true,
                                physics: const NeverScrollableScrollPhysics(),
                                crossAxisCount: columns,
                                mainAxisSpacing: 10,
                                crossAxisSpacing: 10,
                                mainAxisExtent: 92,
                                children: [
                                  QuickActionTile(
                                      icon: Icons.add_rounded,
                                      label: 'Add',
                                      onTap: widget.onAddMoney),
                                  QuickActionTile(
                                      icon: Icons.qr_code_scanner_rounded,
                                      label: 'Scan',
                                      onTap: widget.onScan),
                                  QuickActionTile(
                                      icon: Icons.storefront_rounded,
                                      label: 'Vendor',
                                      onTap: widget.onVendorPay),
                                  QuickActionTile(
                                      icon: Icons.receipt_long_rounded,
                                      label: 'Bills',
                                      onTap: widget.onBills)
                                ]);
                          }),
                          const SizedBox(height: 20),
                          SizedBox(
                              height: 108,
                              child: PageView(
                                  controller:
                                      PageController(viewportFraction: 0.92),
                                  children: const [
                                    _InsightCard(
                                        icon: Icons.shield_moon_rounded,
                                        title: 'Protected payments',
                                        subtitle:
                                            'Device-bound sessions and refresh rotation are active.'),
                                    _InsightCard(
                                        icon: Icons.trending_up_rounded,
                                        title: 'Smart spend view',
                                        subtitle:
                                            'PiPay groups merchant and UPI flows for cleaner reconciliation.'),
                                    _InsightCard(
                                        icon: Icons.local_offer_rounded,
                                        title: 'Cashback ready',
                                        subtitle:
                                            'Offer surfaces are prepared for rewards experiments.')
                                  ])),
                          const SizedBox(height: 20),
                          Row(children: [
                            Expanded(
                                child: Text('Recent Transactions',
                                    style: TextStyle(
                                        color: textColor,
                                        fontWeight: FontWeight.w900,
                                        fontSize: 16))),
                            const Text('View all',
                                style: TextStyle(
                                    color: FinBrand.primary,
                                    fontWeight: FontWeight.w800))
                          ]),
                          const SizedBox(height: 10),
                          if (_entries.isEmpty && _wallet != null)
                            const EmptyStateGraphic(
                                icon: Icons.receipt_long_rounded,
                                title: 'No transactions yet',
                                subtitle:
                                    'Add money or pay a merchant to see your live PiPay timeline.')
                          else
                            for (final entry in _entries)
                              _TransactionTile(
                                  entry: entry, formatPaise: _formatPaise),
                          if (_error != null) ...[
                            const SizedBox(height: 12),
                            Text(_error!,
                                style: const TextStyle(
                                    color: FinBrand.error,
                                    fontWeight: FontWeight.w700))
                          ]
                        ]))))));
  }

  Widget _walletSkeleton(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return FinCard(
        gradient: isDark ? FinBrand.darkGradient : null,
        child: const Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              SkeletonLine(width: 130),
              SizedBox(height: 24),
              SkeletonLine(width: 220, height: 32),
              SizedBox(height: 22),
              SkeletonLine(width: 160)
            ]));
  }

  Widget _balanceCard(BuildContext context) {
    final balance = '₹${_formatPaise(_wallet!['availableBalance'])}';
    return FinCard(
        gradient: FinBrand.gradient,
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Row(children: [
            const Text('Wallet Balance',
                style: TextStyle(
                    color: Colors.white, fontWeight: FontWeight.w800)),
            const Spacer(),
            StatusPill(
                label: _wallet!['status'].toString(), color: Colors.white)
          ]),
          const SizedBox(height: 16),
          Row(children: [
            Expanded(
                child: AnimatedSwitcher(
                    duration: const Duration(milliseconds: 220),
                    child: Text(_showBalance ? balance : '₹******',
                        key: ValueKey(_showBalance),
                        style: const TextStyle(
                            color: Colors.white,
                            fontSize: 34,
                            fontWeight: FontWeight.w900)))),
            IconButton(
                onPressed: () => setState(() => _showBalance = !_showBalance),
                icon: Icon(
                    _showBalance
                        ? Icons.visibility_rounded
                        : Icons.visibility_off_rounded,
                    color: Colors.white))
          ]),
          const SizedBox(height: 18),
          Row(children: [
            _MiniMetric(label: 'Today', value: _entries.length.toString()),
            const SizedBox(width: 12),
            const _MiniMetric(label: 'Trust score', value: '98')
          ])
        ]));
  }

  Future<void> _load() async {
    try {
      final api = ref.read(apiClientProvider);
      final wallet = await api.get('/wallet');
      final statement = await api.get('/wallet/statement');
      setState(() {
        _wallet = wallet;
        _entries = (statement['entries'] as List<dynamic>? ?? []);
        _error = null;
      });
    } catch (error) {
      setState(() => _error = error.toString());
    }
  }

  String _formatPaise(Object? value) {
    final paise = int.tryParse(value.toString()) ?? 0;
    return (paise / 100).toStringAsFixed(2);
  }
}

class _MiniMetric extends StatelessWidget {
  const _MiniMetric({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Expanded(
        child: Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
                color: Colors.white.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(8)),
            child:
                Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(label,
                  style: const TextStyle(
                      color: Colors.white60,
                      fontSize: 12,
                      fontWeight: FontWeight.w700)),
              const SizedBox(height: 4),
              Text(value,
                  style: const TextStyle(
                      color: Colors.white,
                      fontWeight: FontWeight.w900,
                      fontSize: 18))
            ])));
  }
}

class _InsightCard extends StatelessWidget {
  const _InsightCard(
      {required this.icon, required this.title, required this.subtitle});

  final IconData icon;
  final String title;
  final String subtitle;

  @override
  Widget build(BuildContext context) {
    final mutedColor = FinBrand.mutedTextColor(Theme.of(context).brightness);

    return Padding(
        padding: const EdgeInsets.only(right: 10),
        child: FinCard(
            padding: const EdgeInsets.all(16),
            child: Row(children: [
              Container(
                  width: 46,
                  height: 46,
                  decoration: BoxDecoration(
                      gradient: FinBrand.gradient,
                      borderRadius: BorderRadius.circular(8)),
                  child: Icon(icon, color: Colors.white)),
              const SizedBox(width: 12),
              Expanded(
                  child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                    Text(title,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(fontWeight: FontWeight.w900)),
                    const SizedBox(height: 4),
                    Text(subtitle,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(color: mutedColor, fontSize: 12))
                  ]))
            ])));
  }
}

class _TransactionTile extends StatelessWidget {
  const _TransactionTile({required this.entry, required this.formatPaise});

  final dynamic entry;
  final String Function(Object?) formatPaise;

  @override
  Widget build(BuildContext context) {
    final brightness = Theme.of(context).brightness;
    final mutedColor = FinBrand.mutedTextColor(brightness);

    final direction = entry['direction']?.toString() ?? '';
    final isCredit = direction.toLowerCase().contains('credit');
    return Padding(
        padding: const EdgeInsets.only(bottom: 10),
        child: FinCard(
            padding: const EdgeInsets.all(14),
            child: Row(children: [
              Container(
                  width: 44,
                  height: 44,
                  decoration: BoxDecoration(
                      color: (isCredit ? FinBrand.success : FinBrand.primary)
                          .withValues(alpha: 0.12),
                      borderRadius: BorderRadius.circular(8)),
                  child: Icon(
                      isCredit
                          ? Icons.south_west_rounded
                          : Icons.north_east_rounded,
                      color: isCredit ? FinBrand.success : FinBrand.primary)),
              const SizedBox(width: 12),
              Expanded(
                  child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                    Text(
                        entry['description']?.toString() ??
                            entry['transactionType'].toString(),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(fontWeight: FontWeight.w900)),
                    const SizedBox(height: 4),
                    Text(entry['createdAt'].toString(),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(color: mutedColor, fontSize: 12))
                  ])),
              Text('${isCredit ? '+' : '-'}INR ${formatPaise(entry['amount'])}',
                  style: TextStyle(
                      color: isCredit
                          ? FinBrand.success
                          : FinBrand.textColor(brightness),
                      fontWeight: FontWeight.w900))
            ])));
  }
}

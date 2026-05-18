import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../features/add_money/add_money_screen.dart';
import '../features/auth/auth_screen.dart';
import '../features/merchant_dashboard/merchant_dashboard_screen.dart';
import '../features/merchant_pay/pay_merchant_screen.dart';
import '../features/wallet/wallet_screen.dart';
import 'providers.dart';
import '../design/finbrand.dart';

class AppShell extends ConsumerStatefulWidget {
  const AppShell({super.key});

  @override
  ConsumerState<AppShell> createState() => _AppShellState();
}

class _AppShellState extends ConsumerState<AppShell> {
  int _index = 0;
  bool _authenticated = false;
  bool _showSplash = true;

  @override
  void initState() {
    super.initState();
    Timer(const Duration(milliseconds: 1100), () {
      if (mounted) {
        setState(() => _showSplash = false);
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    if (_showSplash) {
      return const _SplashScreen();
    }

    if (!_authenticated) {
      return AuthScreen(
          onAuthenticated: () => setState(() => _authenticated = true));
    }

    final screens = [
      WalletScreen(
          onAddMoney: () => setState(() => _index = 1),
          onScan: () => setState(() => _index = 2),
          onVendorPay: () => setState(() => _index = 2),
          onLogout: _logout,
          onBills: () {
            ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
                content: Text('Bill payments are coming in the next module.')));
          }),
      const AddMoneyScreen(),
      const PayMerchantScreen(),
      const MerchantDashboardScreen()
    ];

    return Scaffold(
        extendBody: true,
        body: AnimatedSwitcher(
            duration: const Duration(milliseconds: 260),
            switchInCurve: Curves.easeOutCubic,
            switchOutCurve: Curves.easeInCubic,
            child: KeyedSubtree(key: ValueKey(_index), child: screens[_index])),
        bottomNavigationBar: Padding(
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
            child: ClipRRect(
                borderRadius: BorderRadius.circular(8),
                child: NavigationBar(
                    height: 70,
                    backgroundColor: Theme.of(context)
                        .colorScheme
                        .surface
                        .withValues(alpha: 0.94),
                    indicatorColor: FinBrand.primary.withValues(alpha: 0.12),
                    selectedIndex: _index,
                    onDestinationSelected: (index) =>
                        setState(() => _index = index),
                    destinations: const [
                      NavigationDestination(
                          icon: Icon(Icons.account_balance_wallet_outlined),
                          selectedIcon: Icon(Icons.account_balance_wallet),
                          label: 'Home'),
                      NavigationDestination(
                          icon: Icon(Icons.add_card_outlined),
                          selectedIcon: Icon(Icons.add_card),
                          label: 'Add'),
                      NavigationDestination(
                          icon: Icon(Icons.qr_code_scanner_outlined),
                          selectedIcon: Icon(Icons.qr_code_scanner),
                          label: 'Pay'),
                      NavigationDestination(
                          icon: Icon(Icons.storefront_outlined),
                          selectedIcon: Icon(Icons.storefront),
                          label: 'Merchant')
                    ]))));
  }

  Future<void> _logout() async {
    await ref.read(tokenStoreProvider).clear();

    if (!mounted) {
      return;
    }

    setState(() {
      _authenticated = false;
      _index = 0;
    });
  }
}

class _SplashScreen extends StatelessWidget {
  const _SplashScreen();

  @override
  Widget build(BuildContext context) {
    final brightness = Theme.of(context).brightness;
    final textColor = FinBrand.textColor(brightness);
    final mutedColor = FinBrand.mutedTextColor(brightness);

    return Scaffold(
        backgroundColor: Theme.of(context).scaffoldBackgroundColor,
        body: Container(
            decoration: BoxDecoration(
                gradient: FinBrand.backgroundGradient(brightness)),
            child: SafeArea(
                bottom: false,
                child: Padding(
                    padding: const EdgeInsets.fromLTRB(24, 24, 24, 34),
                    child: Column(children: [
                      const Spacer(),
                      const SizedBox(
                          width: double.infinity,
                          child: Align(
                              alignment: Alignment.center,
                              child: PiPayLogo(size: 92, showWordmark: false))),
                      const SizedBox(height: 18),
                      SizedBox(
                          width: double.infinity,
                          child: Text(FinBrand.appName,
                              textAlign: TextAlign.center,
                              style: TextStyle(
                                  color: textColor,
                                  fontSize: 34,
                                  fontWeight: FontWeight.w900))),
                      const Spacer(),
                      Text(FinBrand.tagline,
                          textAlign: TextAlign.center,
                          style: TextStyle(
                              color: mutedColor, fontWeight: FontWeight.w700))
                    ])))));
  }
}

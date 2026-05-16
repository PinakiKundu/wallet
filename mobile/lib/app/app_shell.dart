import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../features/add_money/add_money_screen.dart';
import '../features/auth/auth_screen.dart';
import '../features/merchant_dashboard/merchant_dashboard_screen.dart';
import '../features/merchant_pay/pay_merchant_screen.dart';
import '../features/wallet/wallet_screen.dart';

class AppShell extends ConsumerStatefulWidget {
  const AppShell({super.key});

  @override
  ConsumerState<AppShell> createState() => _AppShellState();
}

class _AppShellState extends ConsumerState<AppShell> {
  int _index = 0;
  bool _authenticated = false;

  @override
  Widget build(BuildContext context) {
    if (!_authenticated) {
      return AuthScreen(onAuthenticated: () => setState(() => _authenticated = true));
    }

    final screens = [
      const WalletScreen(),
      const AddMoneyScreen(),
      const PayMerchantScreen(),
      const MerchantDashboardScreen()
    ];

    return Scaffold(
      appBar: AppBar(title: const Text('Wallet')),
      body: screens[_index],
      bottomNavigationBar: NavigationBar(
        selectedIndex: _index,
        onDestinationSelected: (index) => setState(() => _index = index),
        destinations: const [
          NavigationDestination(icon: Icon(Icons.account_balance_wallet), label: 'Wallet'),
          NavigationDestination(icon: Icon(Icons.add_card), label: 'Add'),
          NavigationDestination(icon: Icon(Icons.qr_code_scanner), label: 'Pay'),
          NavigationDestination(icon: Icon(Icons.storefront), label: 'Merchant')
        ]
      )
    );
  }
}

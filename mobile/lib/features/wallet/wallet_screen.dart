import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../app/providers.dart';

class WalletScreen extends ConsumerStatefulWidget {
  const WalletScreen({super.key});

  @override
  ConsumerState<WalletScreen> createState() => _WalletScreenState();
}

class _WalletScreenState extends ConsumerState<WalletScreen> {
  Map<String, dynamic>? _wallet;
  List<dynamic> _entries = [];
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  Widget build(BuildContext context) {
    return RefreshIndicator(
      onRefresh: _load,
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          if (_wallet != null)
            Card(
              child: ListTile(
                title: const Text('Available balance'),
                subtitle: Text('${_wallet!['currency']} ${_formatPaise(_wallet!['availableBalance'])}'),
                trailing: Text(_wallet!['status'].toString())
              )
            ),
          const SizedBox(height: 12),
          Text('Statement', style: Theme.of(context).textTheme.titleMedium),
          const SizedBox(height: 8),
          for (final entry in _entries)
            ListTile(
              title: Text(entry['description']?.toString() ?? entry['transactionType'].toString()),
              subtitle: Text(entry['createdAt'].toString()),
              trailing: Text('${entry['direction']} ${_formatPaise(entry['amount'])}')
            ),
          if (_error != null) Text(_error!, style: TextStyle(color: Theme.of(context).colorScheme.error))
        ]
      )
    );
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

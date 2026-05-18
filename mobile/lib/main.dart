import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'app/app_shell.dart';
import 'design/finbrand.dart';

void main() {
  runApp(const ProviderScope(child: PiPayApp()));
}

class PiPayApp extends StatelessWidget {
  const PiPayApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: FinBrand.appName,
      debugShowCheckedModeBanner: false,
      theme: buildFinTheme(Brightness.light),
      darkTheme: buildFinTheme(Brightness.dark),
      themeMode: ThemeMode.system,
      home: const AppShell()
    );
  }
}

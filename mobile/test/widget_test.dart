import 'package:flutter_test/flutter_test.dart';

import 'package:pipay_app/main.dart';

void main() {
  testWidgets('shows the authentication screen', (WidgetTester tester) async {
    await tester.pumpWidget(const PiPayApp());
    await tester.pump(const Duration(milliseconds: 1200));

    expect(find.text('Secure. Fast. Reliable.'), findsOneWidget);
    expect(find.text('Send OTP'), findsOneWidget);
  });
}

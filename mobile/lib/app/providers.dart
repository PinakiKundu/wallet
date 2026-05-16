import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../core/http/api_client.dart';
import '../core/storage/token_store.dart';

final tokenStoreProvider = Provider<TokenStore>((ref) => TokenStore());
final apiClientProvider = Provider<ApiClient>((ref) {
  return ApiClient(ref.watch(tokenStoreProvider));
});

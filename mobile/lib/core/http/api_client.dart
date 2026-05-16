import 'dart:convert';

import 'package:http/http.dart' as http;
import 'package:uuid/uuid.dart';

import '../config/app_config.dart';
import '../storage/token_store.dart';

class ApiClient {
  ApiClient(this._tokenStore);

  final TokenStore _tokenStore;
  final _uuid = const Uuid();

  Future<Map<String, dynamic>> get(String path) async {
    return _send('GET', path);
  }

  Future<Map<String, dynamic>> post(
    String path, {
    Object? body,
    bool idempotent = false
  }) async {
    return _send('POST', path, body: body, idempotent: idempotent);
  }

  Future<Map<String, dynamic>> delete(String path) async {
    return _send('DELETE', path);
  }

  Future<Map<String, dynamic>> _send(
    String method,
    String path, {
    Object? body,
    bool idempotent = false
  }) async {
    final token = await _tokenStore.readAccessToken();
    final uri = Uri.parse('${AppConfig.apiBaseUrl}$path');
    final headers = <String, String>{
      'content-type': 'application/json',
      'x-device-id': 'mobile-app-device'
    };

    if (token != null) {
      headers['authorization'] = 'Bearer $token';
    }

    if (idempotent) {
      headers['idempotency-key'] = _uuid.v4();
    }

    final requestBody = body == null ? null : jsonEncode(body);
    final response = switch (method) {
      'GET' => await http.get(uri, headers: headers),
      'POST' => await http.post(uri, headers: headers, body: requestBody),
      'DELETE' => await http.delete(uri, headers: headers),
      _ => throw UnsupportedError(method)
    };
    final decoded = jsonDecode(response.body) as Map<String, dynamic>;

    if (response.statusCode >= 400 || decoded['success'] != true) {
      final error = decoded['error'] as Map<String, dynamic>?;
      throw ApiException(error?['message']?.toString() ?? 'Request failed');
    }

    return decoded['data'] as Map<String, dynamic>;
  }
}

class ApiException implements Exception {
  ApiException(this.message);
  final String message;

  @override
  String toString() => message;
}

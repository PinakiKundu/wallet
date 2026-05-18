class AppConfig {
  static const _configuredApiBaseUrl = String.fromEnvironment('API_BASE_URL');

  static String get apiBaseUrl {
    final value = _configuredApiBaseUrl.trim();

    if (value.isEmpty) {
      throw StateError('API_BASE_URL must be provided with --dart-define.');
    }

    return value.endsWith('/') ? value.substring(0, value.length - 1) : value;
  }
}

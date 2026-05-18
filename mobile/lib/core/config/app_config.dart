class AppConfig {
  static const _defaultApiBaseUrl =
      'https://pipay-api.wittyglacier-9b2013dc.centralindia.azurecontainerapps.io/api/v1';
  static const _configuredApiBaseUrl = String.fromEnvironment('API_BASE_URL');

  static String get apiBaseUrl {
    final value = _configuredApiBaseUrl.trim();

    if (value.isEmpty) {
      return _defaultApiBaseUrl;
    }

    return value.endsWith('/') ? value.substring(0, value.length - 1) : value;
  }
}

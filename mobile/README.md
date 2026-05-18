# PiPay Mobile MVP

Flutter PiPay scaffold for:

- mobile OTP login
- wallet balance and statement
- mock UPI add-money
- QR merchant scan
- static vendor-code payment
- merchant dashboard lookup

Setup after Flutter is installed:

```powershell
Set-Location mobile
flutter pub get
flutter run --dart-define=API_BASE_URL=https://pipay-api.wittyglacier-9b2013dc.centralindia.azurecontainerapps.io/api/v1
```

Use `10.0.2.2` for Android emulator access to host localhost. Use your machine LAN IP for a physical device.

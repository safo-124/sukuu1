# Sukuu Parent Mobile App (Flutter)

This Flutter app lets parents log in and view their children and exam grades using the existing Next.js backend.

## Prerequisites

- Flutter SDK installed (3.3+).
- An emulator/simulator or device.
- Backend running locally or deployed.

## Configure

The app prompts for:

- Base URL: e.g. `http://10.0.2.2:3000` for Android emulator to reach your local backend, or your deployed URL.
- School Subdomain: e.g. `myschool`.
- Email + Password: parent credentials.

Backend must have `NEXTAUTH_SECRET` set and the following endpoints available:

- `POST /api/auth/mobile-login`
- `GET /api/schools/:schoolId/parents/me`
- `GET /api/schools/:schoolId/parents/me/children/grades`

## Run

```bash
flutter pub get
flutter run
```

## Notes

- Tokens are stored in secure storage.
- You can change defaults in `lib/src/pages/login_page.dart`.
- For local dev on iOS simulator, use `http://localhost:3000`; for Android emulator, use `http://10.0.2.2:3000`.

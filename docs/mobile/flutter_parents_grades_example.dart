// Minimal Flutter/Dart client for Parents grades, rankings, analytics.
// Place this in your Flutter project (e.g., lib/api/parents_api.dart) and adapt as needed.

import 'dart:convert';
import 'package:http/http.dart' as http;

class ParentsApiClient {
  final String
      baseUrl; // e.g., https://<subdomain>.your-domain.tld or http://10.0.2.2:3000 for Android emulator
  String? _token;

  ParentsApiClient(this.baseUrl);

  Future<void> login(
      {required String email,
      required String password,
      required String subdomain}) async {
    final uri = Uri.parse('$baseUrl/api/auth/mobile-login');
    final res = await http.post(uri,
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'email': email,
          'password': password,
          'subdomain': subdomain,
        }));
    if (res.statusCode != 200) {
      throw Exception('Login failed: ${res.body}');
    }
    final json = jsonDecode(res.body) as Map<String, dynamic>;
    _token = json['token'] as String;
  }

  Map<String, String> _authHeaders() {
    if (_token == null) throw StateError('Not logged in');
    return {
      'Authorization': 'Bearer $_token',
      'Content-Type': 'application/json',
    };
  }

  Future<Map<String, dynamic>> getChildrenGrades(String schoolId) async {
    final uri =
        Uri.parse('$baseUrl/api/schools/$schoolId/parents/me/children/grades');
    final res = await http.get(uri, headers: _authHeaders());
    if (res.statusCode != 200)
      throw Exception('Grades fetch failed: ${res.body}');
    return jsonDecode(res.body) as Map<String, dynamic>;
  }

  Future<Map<String, dynamic>> getChildrenRankings(String schoolId,
      {String? academicYearId, String? termId, String? sectionId}) async {
    final qp = {
      if (academicYearId != null) 'academicYearId': academicYearId,
      if (termId != null) 'termId': termId,
      if (sectionId != null) 'sectionId': sectionId,
    };
    final uri =
        Uri.parse('$baseUrl/api/schools/$schoolId/parents/me/children/rankings')
            .replace(queryParameters: qp);
    final res = await http.get(uri, headers: _authHeaders());
    if (res.statusCode != 200)
      throw Exception('Rankings fetch failed: ${res.body}');
    return jsonDecode(res.body) as Map<String, dynamic>;
  }

  Future<Map<String, dynamic>> getChildrenAnalytics(String schoolId,
      {String? academicYearId, String? termId}) async {
    final qp = {
      if (academicYearId != null) 'academicYearId': academicYearId,
      if (termId != null) 'termId': termId,
    };
    final uri = Uri.parse(
            '$baseUrl/api/schools/$schoolId/parents/me/children/grades-analytics')
        .replace(queryParameters: qp);
    final res = await http.get(uri, headers: _authHeaders());
    if (res.statusCode != 200)
      throw Exception('Analytics fetch failed: ${res.body}');
    return jsonDecode(res.body) as Map<String, dynamic>;
  }
}

import 'dart:convert';
import 'package:http/http.dart' as http;

class ParentsApiClient {
  final String baseUrl;
  final String token;
  final String schoolId;

  const ParentsApiClient({
    required this.baseUrl,
    required this.token,
    required this.schoolId,
  });

  Map<String, String> get _headers => {
        'Authorization': 'Bearer $token',
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      };

  Future<Map<String, dynamic>> getChildrenGrades() async {
    final uri =
        Uri.parse('$baseUrl/api/schools/$schoolId/parents/me/children/grades');
    final res = await http.get(uri, headers: _headers);
    if (res.statusCode != 200) {
      throw Exception('Grades fetch failed: ${res.statusCode} ${res.body}');
    }
    return jsonDecode(res.body) as Map<String, dynamic>;
  }

  Future<Map<String, dynamic>> getChildrenRankings(
      {String? academicYearId, String? termId, String? sectionId}) async {
    final qp = <String, String>{
      if (academicYearId != null && academicYearId.isNotEmpty)
        'academicYearId': academicYearId,
      if (termId != null && termId.isNotEmpty) 'termId': termId,
      if (sectionId != null && sectionId.isNotEmpty) 'sectionId': sectionId,
    };
    final uri =
        Uri.parse('$baseUrl/api/schools/$schoolId/parents/me/children/rankings')
            .replace(queryParameters: qp.isEmpty ? null : qp);
    final res = await http.get(uri, headers: _headers);
    if (res.statusCode != 200) {
      throw Exception('Rankings fetch failed: ${res.statusCode} ${res.body}');
    }
    return jsonDecode(res.body) as Map<String, dynamic>;
  }

  Future<Map<String, dynamic>> getChildrenAnalytics(
      {String? academicYearId, String? termId}) async {
    final qp = <String, String>{
      if (academicYearId != null && academicYearId.isNotEmpty)
        'academicYearId': academicYearId,
      if (termId != null && termId.isNotEmpty) 'termId': termId,
    };
    final uri = Uri.parse(
            '$baseUrl/api/schools/$schoolId/parents/me/children/grades-analytics')
        .replace(queryParameters: qp.isEmpty ? null : qp);
    final res = await http.get(uri, headers: _headers);
    if (res.statusCode != 200) {
      throw Exception('Analytics fetch failed: ${res.statusCode} ${res.body}');
    }
    return jsonDecode(res.body) as Map<String, dynamic>;
  }

  Future<Map<String, dynamic>> getParentMessagesToTeacher(
      {int limit = 50}) async {
    final uri = Uri.parse(
            '$baseUrl/api/schools/$schoolId/parents/me/messages-to-teacher')
        .replace(queryParameters: {'limit': '$limit'});
    final res = await http.get(uri, headers: _headers);
    if (res.statusCode != 200) {
      throw Exception('Messages fetch failed: ${res.statusCode} ${res.body}');
    }
    return jsonDecode(res.body) as Map<String, dynamic>;
  }

  Future<bool> sendMessageToTeacher({
    required String studentId,
    String? subjectId,
    String? teacherId,
    required String title,
    required String content,
  }) async {
    final uri = Uri.parse(
        '$baseUrl/api/schools/$schoolId/parents/me/messages-to-teacher');
    final res = await http.post(
      uri,
      headers: _headers,
      body: jsonEncode({
        'studentId': studentId,
        if (subjectId != null) 'subjectId': subjectId,
        if (teacherId != null) 'teacherId': teacherId,
        'title': title,
        'content': content,
      }),
    );
    if (res.statusCode != 201) {
      throw Exception('Send message failed: ${res.statusCode} ${res.body}');
    }
    return true;
  }

  Future<Map<String, dynamic>> getChildrenPromotions() async {
    final uri =
        Uri.parse('$baseUrl/api/schools/$schoolId/parents/me/children/promotions');
    final res = await http.get(uri, headers: _headers);
    if (res.statusCode != 200) {
      throw Exception('Promotions fetch failed: ${res.statusCode} ${res.body}');
    }
    return jsonDecode(res.body) as Map<String, dynamic>;
  }
}

import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:http/http.dart' as http;
import 'package:intl/intl.dart';

class GradesPage extends StatefulWidget {
  final String studentId;
  final String studentName;
  const GradesPage({super.key, required this.studentId, required this.studentName});

  @override
  State<GradesPage> createState() => _GradesPageState();
}

class _GradesPageState extends State<GradesPage> {
  final _storage = const FlutterSecureStorage();
  bool _loading = true;
  String? _error;
  List<dynamic> _records = [];

  Future<void> _load() async {
    setState(() { _loading = true; _error = null; });
    try {
      final token = await _storage.read(key: 'token');
      final baseUrl = await _storage.read(key: 'baseUrl');
      final schoolId = await _storage.read(key: 'schoolId');
      if (token == null || baseUrl == null || schoolId == null) throw Exception('Missing auth or config');

      final res = await http.get(
        Uri.parse('$baseUrl/api/schools/$schoolId/parents/me/children/grades'),
        headers: { 'Authorization': 'Bearer $token', 'Accept': 'application/json' },
      );
      if (res.statusCode != 200) throw Exception('Failed: ${res.statusCode} ${res.body}');
      final json = jsonDecode(res.body) as Map<String, dynamic>;
      final children = (json['children'] as List?) ?? [];
      final my = children.cast<Map<String, dynamic>>().where((s) => s['studentId'].toString() == widget.studentId).toList();
      final grades = my.isNotEmpty ? (my.first['grades'] as List? ?? []) : [];
      setState(() { _records = grades; });
    } catch (e) {
      setState(() { _error = 'Error: $e'; });
    } finally {
      setState(() { _loading = false; });
    }
  }

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  Widget build(BuildContext context) {
    final df = DateFormat('yyyy-MM-dd');
    return Scaffold(
      appBar: AppBar(title: Text('Grades • ${widget.studentName}')),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? Center(child: Text(_error!, style: const TextStyle(color: Colors.red)))
              : ListView.separated(
                  itemCount: _records.length,
                  separatorBuilder: (_, __) => const Divider(height: 1),
                  itemBuilder: (context, index) {
                    final g = _records[index] as Map<String, dynamic>;
                    final subject = (g['subject'] as Map?)?['name'] ?? 'Subject';
                    final exam = (((g['examSchedule'] as Map?)?['exam']) as Map?)?['name'] ?? 'Exam';
                    final date = (g['examSchedule'] as Map?)?['date'];
                    final comments = g['comments'] ?? '';
                    final marks = g['marksObtained']?.toString() ?? '-';
                    final term = (g['term'] as Map?)?['name'] ?? '';
                    final year = (g['academicYear'] as Map?)?['name'] ?? '';

                    return ListTile(
                      title: Text('$subject • $exam'),
                      subtitle: Text('${date != null ? df.format(DateTime.parse(date)) : ''}  •  $term $year\nRemarks: $comments'),
                      trailing: Text(marks, style: const TextStyle(fontWeight: FontWeight.bold)),
                    );
                  },
                ),
    );
  }
}

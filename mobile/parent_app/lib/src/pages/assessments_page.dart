import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:http/http.dart' as http;
import 'package:intl/intl.dart';
import '../ui/glass.dart';

class AssessmentsPage extends StatefulWidget {
  const AssessmentsPage({super.key});

  @override
  State<AssessmentsPage> createState() => _AssessmentsPageState();
}

class _AssessmentsPageState extends State<AssessmentsPage> {
  final _storage = const FlutterSecureStorage();
  final _df = DateFormat('EEE, MMM d, yyyy h:mm a');

  bool _loading = true;
  String? _error;
  String? _baseUrl;
  String? _token;
  String? _schoolId;

  List<Map<String, dynamic>> _children = [];
  Map<String, dynamic>? _selectedChild;
  List<Map<String, dynamic>> _assessments = [];

  // Filters
  String _typeFilter = 'ALL'; // ALL | ASSIGNMENT | EXAM
  bool _publishedOnly = true;

  @override
  void initState() {
    super.initState();
    _bootstrap();
  }

  Future<void> _bootstrap() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      _baseUrl = await _storage.read(key: 'baseUrl');
      _token = await _storage.read(key: 'token');
      _schoolId = await _storage.read(key: 'schoolId');
      if (_baseUrl == null || _token == null || _schoolId == null) {
        throw Exception('Missing credentials. Please login again.');
      }
      // Load parent and children
      final meRes = await http.get(
        Uri.parse('$_baseUrl/api/schools/$_schoolId/parents/me'),
        headers: {
          'Authorization': 'Bearer $_token',
          'Accept': 'application/json'
        },
      );
      if (meRes.statusCode != 200) {
        throw Exception('Failed to load profile (${meRes.statusCode})');
      }
      final meJson = jsonDecode(meRes.body) as Map<String, dynamic>;
      _children =
          (meJson['children'] as List? ?? []).cast<Map<String, dynamic>>();
      if (_children.isNotEmpty) _selectedChild = _children.first;
      await _loadAssessments();
    } catch (e) {
      setState(() => _error = e.toString());
    } finally {
      setState(() => _loading = false);
    }
  }

  Future<void> _loadAssessments() async {
    if (_selectedChild == null) {
      setState(() => _assessments = []);
      return;
    }
    try {
      final url = Uri.parse(
          '$_baseUrl/api/schools/$_schoolId/parents/me/children/assessments?publishedOnly=${_publishedOnly ? 'true' : 'false'}&includeUpcoming=true&limit=200');
      final res = await http.get(url, headers: {
        'Authorization': 'Bearer $_token',
        'Accept': 'application/json'
      });
      if (res.statusCode != 200) {
        throw Exception('Failed to load assessments (${res.statusCode})');
      }
      final jsonMap = jsonDecode(res.body) as Map<String, dynamic>;
      final children =
          (jsonMap['children'] as List? ?? []).cast<Map<String, dynamic>>();
      final match = children
          .where((c) => c['studentId'].toString() == _selectedChild!['id'].toString())
          .toList();
      final list = match.isNotEmpty
          ? ((match.first['assessments'] as List? ?? [])
              .cast<Map<String, dynamic>>())
          : <Map<String, dynamic>>[];
      setState(() {
        _assessments = list;
      });
    } catch (e) {
      setState(() => _error = e.toString());
    }
  }

  List<Map<String, dynamic>> get _filtered {
    return _assessments.where((a) {
      final typeOk = _typeFilter == 'ALL' || a['type'] == _typeFilter;
      final pubOk = _publishedOnly ? (a['isPublished'] == true) : true;
      return typeOk && pubOk;
    }).toList()
      ..sort((a, b) {
        final da = DateTime.tryParse(a['date']?.toString() ?? '') ??
            DateTime.fromMillisecondsSinceEpoch(0);
        final db = DateTime.tryParse(b['date']?.toString() ?? '') ??
            DateTime.fromMillisecondsSinceEpoch(0);
        return db.compareTo(da);
      });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        flexibleSpace: const GlassAppBarFlex(),
        title: const Text('Assessments'),
        actions: [
          IconButton(
            tooltip: _publishedOnly ? 'Showing published' : 'Showing all',
            icon: Icon(_publishedOnly ? Icons.visibility : Icons.visibility_off),
            onPressed: () async {
              setState(() => _publishedOnly = !_publishedOnly);
              await _loadAssessments();
            },
          ),
          PopupMenuButton<String>(
            onSelected: (v) => setState(() => _typeFilter = v),
            itemBuilder: (context) => const [
              PopupMenuItem(value: 'ALL', child: Text('All types')),
              PopupMenuItem(value: 'ASSIGNMENT', child: Text('Assignments')),
              PopupMenuItem(value: 'EXAM', child: Text('Exams')),
            ],
            icon: const Icon(Icons.filter_list),
          ),
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _loading ? null : () async {
              setState(() => _loading = true);
              await _loadAssessments();
              setState(() => _loading = false);
            },
          ),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? _ErrorView(message: _error!, onRetry: _bootstrap)
              : RefreshIndicator(
                  onRefresh: () async {
                    await _bootstrap();
                  },
                  child: ListView(
                    padding: const EdgeInsets.all(12),
                    children: [
                      Row(
                        children: [
                          const Icon(Icons.child_care_outlined),
                          const SizedBox(width: 8),
                          Expanded(
                            child: DropdownButtonFormField<String>(
                              value: _selectedChild?['id']?.toString(),
                              items: _children.map((c) {
                                final name = '${c['firstName'] ?? ''} ${c['lastName'] ?? ''}'.trim();
                                return DropdownMenuItem(
                                  value: c['id'].toString(),
                                  child: Text(name.isEmpty ? 'Student ${c['id']}' : name),
                                );
                              }).toList(),
                              onChanged: (v) async {
                                final sel = _children.firstWhere(
                                  (e) => e['id'].toString() == v,
                                  orElse: () => <String, dynamic>{},
                                );
                                setState(() => _selectedChild = sel.isEmpty ? null : sel);
                                await _loadAssessments();
                              },
                              decoration: const InputDecoration(labelText: 'Child'),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),
                      if (_filtered.isEmpty)
                        const Center(
                          child: Padding(
                            padding: EdgeInsets.all(24.0),
                            child: Text('No assessments to show'),
                          ),
                        ),
                      ..._filtered.map((a) => _AssessmentTile(a: a, df: _df)),
                    ],
                  ),
                ),
    );
  }
}

class _AssessmentTile extends StatelessWidget {
  final Map<String, dynamic> a;
  final DateFormat df;
  const _AssessmentTile({required this.a, required this.df});

  @override
  Widget build(BuildContext context) {
    final type = a['type']?.toString() ?? 'ASSIGNMENT';
    final title = a['title']?.toString() ?? (type == 'EXAM' ? 'Exam' : 'Assignment');
    final subject = (a['subject'] as Map?)?['name']?.toString() ?? '';
    final clazz = (a['class'] as Map?)?['name']?.toString();
    final section = (a['section'] as Map?)?['name']?.toString();
    final dateStr = a['date']?.toString();
    final date = dateStr != null ? DateTime.tryParse(dateStr) : null;
    final marks = a['marksObtained']?.toString();
    final max = a['maxMarks']?.toString();
    final isPublished = a['isPublished'] == true;

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: GlassContainer(
        padding: const EdgeInsets.all(12),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            CircleAvatar(
              backgroundColor: type == 'EXAM' ? Colors.pink.shade50 : Colors.blue.shade50,
              child: Icon(type == 'EXAM' ? Icons.fact_check_outlined : Icons.assignment_outlined,
                  color: type == 'EXAM' ? Colors.pink : Colors.blue),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(title, style: const TextStyle(fontWeight: FontWeight.w600)),
                  const SizedBox(height: 4),
                  Text([
                    if (subject.isNotEmpty) subject,
                    if (clazz != null) 'Class: $clazz',
                    if (section != null) 'Section: $section',
                    if (date != null) df.format(date),
                  ].join(' • '), style: const TextStyle(color: Colors.black54)),
                ],
              ),
            ),
            if (isPublished && marks != null)
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                decoration: BoxDecoration(
                  color: Colors.indigo.shade600,
                  borderRadius: BorderRadius.circular(999),
                ),
                child: Text(max != null ? '$marks/$max' : marks,
                    style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
              )
            else
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                decoration: BoxDecoration(
                  color: Colors.grey.shade200,
                  borderRadius: BorderRadius.circular(999),
                ),
                child: Text(isPublished ? '-' : 'Upcoming',
                    style: const TextStyle(color: Colors.black54, fontWeight: FontWeight.w600)),
              ),
          ],
        ),
      ),
    );
  }
}

class _ErrorView extends StatelessWidget {
  final String message;
  final Future<void> Function() onRetry;
  const _ErrorView({required this.message, required this.onRetry});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24.0),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.error_outline, color: Colors.redAccent, size: 48),
            const SizedBox(height: 12),
            Text(
              message,
              style: const TextStyle(fontSize: 16),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 16),
            FilledButton.icon(
              icon: const Icon(Icons.refresh),
              label: const Text('Retry'),
              onPressed: onRetry,
            )
          ],
        ),
      ),
    );
  }
}

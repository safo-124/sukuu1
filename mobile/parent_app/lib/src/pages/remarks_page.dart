import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:http/http.dart' as http;
import 'package:intl/intl.dart';

class RemarksPage extends StatefulWidget {
  final String studentId;
  final String studentName;
  const RemarksPage(
      {super.key, required this.studentId, required this.studentName});

  @override
  State<RemarksPage> createState() => _RemarksPageState();
}

class _RemarksPageState extends State<RemarksPage> {
  final _storage = const FlutterSecureStorage();
  final df = DateFormat('EEE, MMM d');

  bool _loading = true;
  String? _error;
  String? _token;
  String? _baseUrl;
  String? _schoolId;

  String _filter = 'ALL'; // ALL, EXAM, ASSIGNMENT
  List<Map<String, dynamic>> _items = [];

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      _token = await _storage.read(key: 'token');
      _baseUrl = await _storage.read(key: 'baseUrl');
      _schoolId = await _storage.read(key: 'schoolId');
      if (_token == null || _baseUrl == null || _schoolId == null) {
        throw Exception('Missing credentials, please sign in again.');
      }

      final res = await http.get(
        Uri.parse(
            '$_baseUrl/api/schools/$_schoolId/parents/me/children/remarks'),
        headers: {
          'Authorization': 'Bearer $_token',
          'Accept': 'application/json'
        },
      );
      if (res.statusCode != 200) {
        throw Exception('Failed to load remarks (${res.statusCode})');
      }
      final data = jsonDecode(res.body) as Map<String, dynamic>;
      final children =
          (data['children'] as List? ?? []).cast<Map<String, dynamic>>();
      final match = children
          .where((c) => c['studentId'].toString() == widget.studentId)
          .toList();
      final rem = match.isNotEmpty
          ? ((match.first['remarks'] as List? ?? [])
              .cast<Map<String, dynamic>>())
          : <Map<String, dynamic>>[];
      rem.sort((a, b) {
        final da = DateTime.tryParse((a['date'] ?? '').toString()) ??
            DateTime.fromMillisecondsSinceEpoch(0);
        final db = DateTime.tryParse((b['date'] ?? '').toString()) ??
            DateTime.fromMillisecondsSinceEpoch(0);
        return db.compareTo(da);
      });
      setState(() {
        _items = rem;
      });
    } catch (e) {
      setState(() {
        _error = e.toString();
      });
    } finally {
      setState(() {
        _loading = false;
      });
    }
  }

  List<Map<String, dynamic>> get _filteredItems {
    if (_filter == 'ALL') return _items;
    return _items
        .where((e) => (e['source']?.toString() ?? '').toUpperCase() == _filter)
        .toList();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text('Remarks • ${widget.studentName}')),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? Center(
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Icon(Icons.error_outline,
                            color: Colors.red, size: 32),
                        const SizedBox(height: 8),
                        Text(_error!,
                            textAlign: TextAlign.center,
                            style: const TextStyle(color: Colors.red)),
                        const SizedBox(height: 12),
                        FilledButton.icon(
                            onPressed: _load,
                            icon: const Icon(Icons.refresh),
                            label: const Text('Try again')),
                      ],
                    ),
                  ),
                )
              : RefreshIndicator(
                  onRefresh: _load,
                  child: Column(
                    children: [
                      SizedBox(
                        height: 48,
                        child: ListView(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 12, vertical: 8),
                          scrollDirection: Axis.horizontal,
                          children: [
                            _FilterChip(
                                label: 'All',
                                selected: _filter == 'ALL',
                                onTap: () => setState(() => _filter = 'ALL')),
                            _FilterChip(
                                label: 'Exams',
                                selected: _filter == 'EXAM',
                                onTap: () => setState(() => _filter = 'EXAM')),
                            _FilterChip(
                                label: 'Assignments',
                                selected: _filter == 'ASSIGNMENT',
                                onTap: () =>
                                    setState(() => _filter = 'ASSIGNMENT')),
                          ],
                        ),
                      ),
                      Expanded(
                        child: ListView.builder(
                          physics: const AlwaysScrollableScrollPhysics(),
                          itemCount: _filteredItems.length,
                          itemBuilder: (context, i) {
                            final r = _filteredItems[i];
                            final comment = r['comment']?.toString() ?? '';
                            final subject = r['subject']?.toString() ?? '';
                            final src = r['source']?.toString() ?? '';
                            final name =
                                r['examOrAssignment']?.toString() ?? '';
                            final dateStr = r['date']?.toString();
                            final d = dateStr != null && dateStr.isNotEmpty
                                ? DateTime.tryParse(dateStr)
                                : null;
                            return Card(
                              margin: const EdgeInsets.symmetric(
                                  horizontal: 12, vertical: 6),
                              child: ListTile(
                                leading: CircleAvatar(
                                  backgroundColor: Colors.deepOrange.shade50,
                                  child: const Icon(Icons.chat_bubble_outline,
                                      color: Colors.deepOrange),
                                ),
                                title: Text(
                                    subject.isNotEmpty ? subject : 'Remark'),
                                subtitle: Text(
                                    '${src}${name.isNotEmpty ? ' • $name' : ''}${d != null ? ' • ${df.format(d)}' : ''}\n$comment'),
                              ),
                            );
                          },
                        ),
                      ),
                    ],
                  ),
                ),
    );
  }
}

class _FilterChip extends StatelessWidget {
  final String label;
  final bool selected;
  final VoidCallback onTap;
  const _FilterChip(
      {required this.label, required this.selected, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(right: 8),
      child: ChoiceChip(
        label: Text(label),
        selected: selected,
        onSelected: (_) => onTap(),
      ),
    );
  }
}

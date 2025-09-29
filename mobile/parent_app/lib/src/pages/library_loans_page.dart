import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:http/http.dart' as http;
import 'package:intl/intl.dart';

class LibraryLoansPage extends StatefulWidget {
  final String studentId;
  final String studentName;
  final bool showTitle;
  const LibraryLoansPage({
    super.key,
    required this.studentId,
    required this.studentName,
    this.showTitle = true,
  });

  @override
  State<LibraryLoansPage> createState() => _LibraryLoansPageState();
}

class _LibraryLoansPageState extends State<LibraryLoansPage> {
  final _storage = const FlutterSecureStorage();
  bool _loading = true;
  String? _error;
  String? _baseUrl;
  String? _token;
  String? _schoolId;
  String _status = 'ALL';
  List<Map<String, dynamic>> _loans = [];

  final _df = DateFormat('yyyy-MM-dd');

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
      _baseUrl = await _storage.read(key: 'baseUrl');
      _token = await _storage.read(key: 'token');
      _schoolId = await _storage.read(key: 'schoolId');
      if (_baseUrl == null || _token == null || _schoolId == null) {
        throw Exception('Missing credentials. Please login again.');
      }
      final qp = <String, String>{};
      if (_status != 'ALL') qp['status'] = _status;
      final url = Uri.parse(
        '$_baseUrl/api/schools/$_schoolId/parents/me/children/library/loans',
      ).replace(queryParameters: qp.isEmpty ? null : qp);
      final res = await http.get(url, headers: {
        'Authorization': 'Bearer $_token',
        'Accept': 'application/json',
      });
      if (res.statusCode != 200) {
        throw Exception('Failed to load loans (${res.statusCode})');
      }
      final data = jsonDecode(res.body) as Map<String, dynamic>;
      final children = (data['children'] as List? ?? []).cast<Map<String, dynamic>>();
      final child = children.firstWhere(
        (c) => c['studentId'].toString() == widget.studentId,
        orElse: () => <String, dynamic>{},
      );
      setState(() {
        _loans = (child['loans'] as List? ?? []).cast<Map<String, dynamic>>();
      });
    } catch (e) {
      setState(() => _error = e.toString());
    } finally {
      setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final body = _buildBody();
    if (!widget.showTitle) return body;
    return Scaffold(
      appBar: AppBar(title: const Text('Library Loans')),
      body: body,
    );
  }

  Widget _buildBody() {
    if (_loading) return const Center(child: CircularProgressIndicator());
    if (_error != null) {
      return Center(child: Text(_error!, style: const TextStyle(color: Colors.red)));
    }
    return RefreshIndicator(
      onRefresh: _load,
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Row(
            children: [
              const Text('Status:', style: TextStyle(fontWeight: FontWeight.w600)),
              const SizedBox(width: 8),
              DropdownButton<String>(
                value: _status,
                items: const [
                  DropdownMenuItem(value: 'ALL', child: Text('All')),
                  DropdownMenuItem(value: 'BORROWED', child: Text('Borrowed')),
                  DropdownMenuItem(value: 'OVERDUE', child: Text('Overdue')),
                  DropdownMenuItem(value: 'RETURNED', child: Text('Returned')),
                ],
                onChanged: (v) {
                  if (v == null) return;
                  setState(() => _status = v);
                  _load();
                },
              ),
            ],
          ),
          const SizedBox(height: 8),
          if (_loans.isEmpty)
            const Text('No loans found', style: TextStyle(color: Colors.black54)),
          ..._loans.map((l) {
            final book = (l['book'] as Map?) ?? {};
            final title = (book['title'] ?? 'Book').toString();
            final author = (book['author'] ?? '').toString();
            final qty = (l['quantity'] as num? ?? 1).toInt();
            final status = (l['status'] ?? '').toString();
            final borrowedAt = _fmt(l['borrowedAt']);
            final due = _fmt(l['dueDate']);
            final returnedAt = _fmt(l['returnedAt']);
            Color badge = Colors.blueGrey;
            if (status == 'BORROWED') badge = Colors.blue;
            if (status == 'OVERDUE') badge = Colors.red;
            if (status == 'RETURNED') badge = Colors.green;
            return Card(
              child: ListTile(
                leading: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: badge.withOpacity(0.15),
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: Text(status,
                      style: TextStyle(color: badge, fontWeight: FontWeight.w600, fontSize: 12)),
                ),
                title: Text(title, style: const TextStyle(fontWeight: FontWeight.w600)),
                subtitle: Text([
                  if (author.isNotEmpty) 'Author: $author',
                  'Qty: $qty',
                  'Borrowed: $borrowedAt',
                  if (due.isNotEmpty) 'Due: $due',
                  if (returnedAt.isNotEmpty) 'Returned: $returnedAt',
                ].join('  •  ')),
              ),
            );
          }),
        ],
      ),
    );
  }

  String _fmt(dynamic v) {
    final d = (v is String) ? DateTime.tryParse(v) : (v is DateTime ? v : null);
    return d != null ? _df.format(d) : '';
  }
}

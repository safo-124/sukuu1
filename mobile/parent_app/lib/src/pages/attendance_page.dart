import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:http/http.dart' as http;
import 'package:intl/intl.dart';

class AttendancePage extends StatefulWidget {
  final String studentId;
  final String studentName;
  const AttendancePage(
      {super.key, required this.studentId, required this.studentName});

  @override
  State<AttendancePage> createState() => _AttendancePageState();
}

class _AttendancePageState extends State<AttendancePage> {
  final _storage = const FlutterSecureStorage();
  final df = DateFormat('EEE, MMM d');

  bool _loading = true;
  String? _error;
  String? _token;
  String? _baseUrl;
  String? _schoolId;

  String _filter = 'ALL'; // ALL, PRESENT, ABSENT, LATE, EXCUSED
  List<Map<String, dynamic>> _items = [];
  final _ctrl = TextEditingController();
  bool _sending = false;

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
            '$_baseUrl/api/schools/$_schoolId/parents/me/children/attendance'),
        headers: {
          'Authorization': 'Bearer $_token',
          'Accept': 'application/json'
        },
      );
      if (res.statusCode != 200) {
        throw Exception('Failed to load attendance (${res.statusCode})');
      }
      final data = jsonDecode(res.body) as Map<String, dynamic>;
      final children =
          (data['children'] as List? ?? []).cast<Map<String, dynamic>>();
      final match = children
          .where((c) => c['studentId'].toString() == widget.studentId)
          .toList();
      final att = match.isNotEmpty
          ? ((match.first['attendance'] as List? ?? [])
              .cast<Map<String, dynamic>>())
          : <Map<String, dynamic>>[];
      att.sort((a, b) {
        final da = DateTime.tryParse((a['date'] ?? '').toString()) ??
            DateTime.fromMillisecondsSinceEpoch(0);
        final db = DateTime.tryParse((b['date'] ?? '').toString()) ??
            DateTime.fromMillisecondsSinceEpoch(0);
        return db.compareTo(da);
      });
      setState(() {
        _items = att;
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
        .where((e) => (e['status']?.toString() ?? '').toUpperCase() == _filter)
        .toList();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text('Attendance • ${widget.studentName}')),
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
                              onTap: () => setState(() => _filter = 'ALL'),
                            ),
                            _FilterChip(
                                label: 'Present',
                                selected: _filter == 'PRESENT',
                                onTap: () =>
                                    setState(() => _filter = 'PRESENT')),
                            _FilterChip(
                                label: 'Absent',
                                selected: _filter == 'ABSENT',
                                onTap: () =>
                                    setState(() => _filter = 'ABSENT')),
                            _FilterChip(
                                label: 'Late',
                                selected: _filter == 'LATE',
                                onTap: () => setState(() => _filter = 'LATE')),
                            _FilterChip(
                                label: 'Excused',
                                selected: _filter == 'EXCUSED',
                                onTap: () =>
                                    setState(() => _filter = 'EXCUSED')),
                          ],
                        ),
                      ),
                      Expanded(
                        child: ListView.builder(
                          physics: const AlwaysScrollableScrollPhysics(),
                          itemCount: _filteredItems.length,
                          itemBuilder: (context, i) {
                            final a = _filteredItems[i];
                            final dateStr = a['date']?.toString();
                            final d = dateStr != null && dateStr.isNotEmpty
                                ? DateTime.tryParse(dateStr)
                                : null;
                            final status = a['status']?.toString() ?? '-';
                            final remarks = a['remarks']?.toString() ?? '';
                            final explanation =
                                a['explanation'] as Map<String, dynamic>?;
                            final explStatus =
                                (explanation?['status']?.toString() ?? '')
                                    .toUpperCase();
                            final canExplain =
                                status.toUpperCase() == 'ABSENT' &&
                                    (explanation == null ||
                                        (explStatus != 'ANSWERED'));
                            return Card(
                              margin: const EdgeInsets.symmetric(
                                  horizontal: 12, vertical: 6),
                              child: ListTile(
                                leading: CircleAvatar(
                                  backgroundColor: Colors.teal.shade50,
                                  child: const Icon(Icons.check_circle_outline,
                                      color: Colors.teal),
                                ),
                                title: Text(status),
                                subtitle: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                        '${d != null ? df.format(d) : ''}${remarks.isNotEmpty ? ' • $remarks' : ''}'),
                                    const SizedBox(height: 6),
                                    Wrap(
                                      crossAxisAlignment:
                                          WrapCrossAlignment.center,
                                      spacing: 8,
                                      runSpacing: 6,
                                      children: [
                                        _buildExplanationChip(
                                            explStatus, explanation),
                                        if (canExplain)
                                          TextButton(
                                            onPressed: () =>
                                                _openExplainDialog(a),
                                            child: const Text('Explain'),
                                          )
                                        else if (explanation != null)
                                          TextButton(
                                            onPressed: () => _openExplainDialog(
                                                a,
                                                initialText: (explanation[
                                                            'responseText'] ??
                                                        '')
                                                    .toString()),
                                            child: const Text('Edit'),
                                          ),
                                      ],
                                    ),
                                  ],
                                ),
                                // trailing handled within subtitle via action buttons
                                trailing: null,
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

  Future<void> _openExplainDialog(Map<String, dynamic> attendance,
      {String? initialText}) async {
    _ctrl.text = initialText ?? '';
    await showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(initialText == null || initialText.isEmpty
            ? 'Explain Absence'
            : 'Edit Explanation'),
        content: TextField(
          controller: _ctrl,
          maxLines: 4,
          decoration: const InputDecoration(hintText: 'Enter your explanation'),
        ),
        actions: [
          TextButton(
              onPressed: _sending ? null : () => Navigator.of(ctx).pop(),
              child: const Text('Cancel')),
          FilledButton(
            onPressed: _sending
                ? null
                : () async {
                    final text = _ctrl.text.trim();
                    if (text.isEmpty) {
                      _showSnack('Please enter an explanation', false);
                      return;
                    }
                    try {
                      setState(() => _sending = true);
                      final id = attendance['id']?.toString();
                      if (id == null || id.isEmpty) {
                        _showSnack('Invalid attendance item', false);
                        return;
                      }
                      final url =
                          '$_baseUrl/api/schools/$_schoolId/parents/me/attendance/$id/explanation/respond';
                      final res = await http.post(Uri.parse(url),
                          headers: {
                            'Authorization': 'Bearer $_token',
                            'Content-Type': 'application/json',
                          },
                          body: jsonEncode({'responseText': text}));
                      if (res.statusCode >= 200 && res.statusCode < 300) {
                        if (!mounted) return;
                        Navigator.of(context).pop();
                        _showSnack(initialText == null || initialText.isEmpty
                            ? 'Explanation sent'
                            : 'Explanation updated');
                        await _load();
                      } else {
                        String msg = 'Failed (${res.statusCode})';
                        try {
                          final j = jsonDecode(res.body);
                          msg = (j['message'] ?? j['error'] ?? msg).toString();
                        } catch (_) {}
                        _showSnack(msg, false);
                      }
                    } catch (e) {
                      _showSnack('Error: ${e.toString()}', false);
                    } finally {
                      if (mounted) setState(() => _sending = false);
                    }
                  },
            child: _sending
                ? const SizedBox(
                    width: 18,
                    height: 18,
                    child: CircularProgressIndicator(
                        strokeWidth: 2, color: Colors.white),
                  )
                : Text((initialText == null || initialText.isEmpty)
                    ? 'Send'
                    : 'Update'),
          )
        ],
      ),
    );
  }

  Widget _buildExplanationChip(
      String explStatus, Map<String, dynamic>? explanation) {
    Color bg;
    String label;
    switch (explStatus) {
      case 'REQUESTED':
        bg = Colors.amber.shade600;
        label = 'Explanation Requested';
        break;
      case 'ANSWERED':
        bg = Colors.green.shade600;
        label = 'Explanation Answered';
        break;
      default:
        bg = Colors.grey.shade500;
        label = 'No Explanation';
    }
    return Chip(
      label: Text(label, style: const TextStyle(color: Colors.white)),
      backgroundColor: bg,
    );
  }

  void _showSnack(String message, [bool success = true]) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: success ? Colors.green.shade700 : Colors.red.shade700,
        behavior: SnackBarBehavior.floating,
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

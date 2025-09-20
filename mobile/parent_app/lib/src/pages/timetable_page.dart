import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:http/http.dart' as http;

class TimetablePage extends StatefulWidget {
  final String studentId;
  final String studentName;
  const TimetablePage({super.key, required this.studentId, required this.studentName});

  @override
  State<TimetablePage> createState() => _TimetablePageState();
}

class _TimetablePageState extends State<TimetablePage> {
  final _storage = const FlutterSecureStorage();
  bool _loading = true;
  String? _error;
  List<Map<String, dynamic>> _entries = [];

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() { _loading = true; _error = null; });
    try {
      final baseUrl = await _storage.read(key: 'baseUrl');
      final token = await _storage.read(key: 'token');
      final schoolId = await _storage.read(key: 'schoolId');
      if (baseUrl == null || token == null || schoolId == null) throw Exception('Missing auth');

      final res = await http.get(
        Uri.parse('$baseUrl/api/schools/$schoolId/parents/me/children/timetable'),
        headers: { 'Authorization': 'Bearer $token', 'Accept': 'application/json' },
      );
      if (res.statusCode != 200) throw Exception('Failed: ${res.statusCode}');
      final data = jsonDecode(res.body) as Map<String, dynamic>;
      final children = (data['children'] as List? ?? []).cast<Map<String, dynamic>>();
      final match = children.where((c) => c['studentId'].toString() == widget.studentId).toList();
      final list = match.isNotEmpty ? ((match.first['timetable'] as List? ?? []).cast<Map<String, dynamic>>()) : <Map<String, dynamic>>[];
      list.sort((a, b) {
        final da = (a['dayOfWeek'] ?? 0) as int;
        final db = (b['dayOfWeek'] ?? 0) as int;
        if (da != db) return da.compareTo(db);
        return (a['startTime'] ?? '').toString().compareTo((b['startTime'] ?? '').toString());
      });
      setState(() { _entries = list; });
    } catch (e) {
      setState(() { _error = e.toString(); });
    } finally {
      setState(() { _loading = false; });
    }
  }

  static const _days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  Color _colorFor(String key) {
    final colors = [
      Colors.indigo,
      Colors.teal,
      Colors.deepPurple,
      Colors.blue,
      Colors.orange,
      Colors.pink,
      Colors.green,
      Colors.cyan,
    ];
    final h = key.codeUnits.fold<int>(0, (a, b) => (a * 31 + b) & 0x7fffffff);
    return colors[h % colors.length];
  }

  @override
  Widget build(BuildContext context) {
    final grouped = <int, List<Map<String, dynamic>>>{};
    for (final e in _entries) {
      final d = (e['dayOfWeek'] ?? 0) as int;
      grouped.putIfAbsent(d, () => []);
      grouped[d]!.add(e);
    }
    return Scaffold(
      appBar: AppBar(
        title: Text('Timetable • ${widget.studentName}'),
        actions: [IconButton(onPressed: _loading ? null : _load, icon: const Icon(Icons.refresh))],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? Center(child: Text(_error!, style: const TextStyle(color: Colors.red)))
              : RefreshIndicator(
                  onRefresh: _load,
                  child: ListView(
                    children: [
                      const SizedBox(height: 8),
                      ...List.generate(7, (i) => i).where((d) => grouped.containsKey(d)).map((d) {
                        final items = grouped[d]!;
                        return Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                          child: Card(
                            child: Padding(
                              padding: const EdgeInsets.all(12.0),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(_days[(d % 7).clamp(0, 6)], style: const TextStyle(fontWeight: FontWeight.bold)),
                                  const SizedBox(height: 8),
                                  ...items.map((e) {
                                    final subject = (e['subject'] as Map?)?['name']?.toString() ?? 'Subject';
                                    final teacher = (e['staff'] as Map?)?['name']?.toString() ?? '';
                                    final photo = (e['staff'] as Map?)?['photoUrl']?.toString();
                                    final room = (e['room'] as Map?)?['name'];
                                    final time = '${e['startTime']} - ${e['endTime']}';
                                    final color = _colorFor(subject);
                                    return ListTile(
                                      contentPadding: EdgeInsets.zero,
                                      leading: CircleAvatar(
                                        backgroundColor: color.withOpacity(0.15),
                                        foregroundColor: color,
                                        backgroundImage: (photo != null && photo.isNotEmpty) ? NetworkImage(photo) : null,
                                        child: (photo == null || photo.isEmpty)
                                            ? const Icon(Icons.person_outline)
                                            : null,
                                      ),
                                      title: Row(
                                        children: [
                                          Expanded(child: Text(subject)),
                                          Container(
                                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                                            decoration: BoxDecoration(
                                              color: color.withOpacity(0.1),
                                              borderRadius: BorderRadius.circular(10),
                                            ),
                                            child: Text(subject, style: TextStyle(color: color, fontSize: 12)),
                                          ),
                                        ],
                                      ),
                                      subtitle: Text([time, if (teacher.isNotEmpty) teacher, if (room != null) 'Room: $room'].join('  •  ')),
                                    );
                                  }),
                                ],
                              ),
                            ),
                          ),
                        );
                      }).toList(),
                      if (grouped.isEmpty)
                        const Padding(
                          padding: EdgeInsets.all(24.0),
                          child: Center(child: Text('No timetable entries found.')),
                        ),
                    ],
                  ),
                ),
    );
  }
}

import 'package:flutter/material.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import 'home_page.dart';
import 'messages_page.dart';
import 'timetable_page.dart';

class _PlaceholderPage extends StatelessWidget {
  final String title;
  const _PlaceholderPage({required this.title});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(title)),
      body: Center(
        child: Text('$title coming soon', style: const TextStyle(color: Colors.black54)),
      ),
    );
  }
}

class MainTabsPage extends StatefulWidget {
  const MainTabsPage({super.key});

  @override
  State<MainTabsPage> createState() => _MainTabsPageState();
}

class _MainTabsPageState extends State<MainTabsPage> {
  int _index = 0;
  late final List<Widget> _pages;
  final _storage = const FlutterSecureStorage();
  int _unread = 0;

  @override
  void initState() {
    super.initState();
    _pages = [
      const HomePage(),
      const _PlaceholderPage(title: 'Grades'),
      const _PlaceholderPage(title: 'Attendance'),
      MessagesPage(onAnyRead: _loadUnreadCount),
      const _TimetableTab(),
    ];
    _loadUnreadCount();
  }

  Future<void> _loadUnreadCount() async {
    try {
      final baseUrl = await _storage.read(key: 'baseUrl');
      final token = await _storage.read(key: 'token');
      final schoolId = await _storage.read(key: 'schoolId');
      if (baseUrl == null || token == null || schoolId == null) return;
      final res = await http.get(
        Uri.parse('$baseUrl/api/schools/$schoolId/parents/me/messages?publishedOnly=true&limit=100'),
        headers: { 'Authorization': 'Bearer $token', 'Accept': 'application/json' },
      );
      if (res.statusCode != 200) return;
      final data = jsonDecode(res.body) as Map<String, dynamic>;
      final msgs = (data['messages'] as List? ?? []).cast<Map<String, dynamic>>();
      final unread = msgs.where((m) => m['isRead'] != true).length;
      if (mounted) setState(() => _unread = unread);
    } catch (_) {}
  }
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: IndexedStack(index: _index, children: _pages),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _index,
        onDestinationSelected: (i) => setState(() => _index = i),
        destinations: [
          const NavigationDestination(icon: Icon(Icons.home_outlined), selectedIcon: Icon(Icons.home), label: 'Home'),
          const NavigationDestination(icon: Icon(Icons.leaderboard_outlined), selectedIcon: Icon(Icons.leaderboard), label: 'Grades'),
          const NavigationDestination(icon: Icon(Icons.calendar_month_outlined), selectedIcon: Icon(Icons.calendar_month), label: 'Attendance'),
          NavigationDestination(
            icon: Stack(
              clipBehavior: Clip.none,
              children: [
                const Icon(Icons.chat_bubble_outline),
                if (_unread > 0)
                  Positioned(
                    right: -2,
                    top: -2,
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
                      decoration: const BoxDecoration(color: Colors.red, borderRadius: BorderRadius.all(Radius.circular(10))),
                      constraints: const BoxConstraints(minWidth: 16),
                      child: Text('${_unread > 99 ? 99 : _unread}',
                          textAlign: TextAlign.center,
                          style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold)),
                    ),
                  ),
              ],
            ),
            selectedIcon: const Icon(Icons.chat_bubble),
            label: 'Messages',
          ),
          const NavigationDestination(icon: Icon(Icons.schedule_outlined), selectedIcon: Icon(Icons.schedule), label: 'Timetable'),
        ],
      ),
    );
  }
}

class _TimetableTab extends StatefulWidget {
  const _TimetableTab();

  @override
  State<_TimetableTab> createState() => _TimetableTabState();
}

class _TimetableTabState extends State<_TimetableTab> {
  final _storage = const FlutterSecureStorage();
  bool _loading = true;
  String? _error;
  List<Map<String, dynamic>> _children = [];
  Map<String, dynamic>? _selectedChild;
  List<Map<String, dynamic>> _entries = [];

  @override
  void initState() {
    super.initState();
    _bootstrap();
  }

  Future<void> _bootstrap() async {
    setState(() { _loading = true; _error = null; });
    try {
      final baseUrl = await _storage.read(key: 'baseUrl');
      final token = await _storage.read(key: 'token');
      final schoolId = await _storage.read(key: 'schoolId');
      if (baseUrl == null || token == null || schoolId == null) throw Exception('Missing auth');

      final meRes = await http.get(
        Uri.parse('$baseUrl/api/schools/$schoolId/parents/me'),
        headers: { 'Authorization': 'Bearer $token', 'Accept': 'application/json' },
      );
      if (meRes.statusCode != 200) throw Exception('Profile failed (${meRes.statusCode})');
      final meJson = jsonDecode(meRes.body) as Map<String, dynamic>;
      _children = (meJson['children'] as List? ?? []).cast<Map<String, dynamic>>();
      if (_children.isNotEmpty) _selectedChild = _children.first;
      await _loadTimetable();
    } catch (e) {
      setState(() { _error = e.toString(); });
    } finally {
      setState(() { _loading = false; });
    }
  }

  Future<void> _loadTimetable() async {
    try {
      final baseUrl = await _storage.read(key: 'baseUrl');
      final token = await _storage.read(key: 'token');
      final schoolId = await _storage.read(key: 'schoolId');
      if (baseUrl == null || token == null || schoolId == null) return;
      final res = await http.get(
        Uri.parse('$baseUrl/api/schools/$schoolId/parents/me/children/timetable'),
        headers: { 'Authorization': 'Bearer $token', 'Accept': 'application/json' },
      );
      if (res.statusCode != 200) throw Exception('Timetable failed (${res.statusCode})');
      final data = jsonDecode(res.body) as Map<String, dynamic>;
      final all = (data['children'] as List? ?? []).cast<Map<String, dynamic>>();
      final match = _selectedChild == null
          ? <Map<String, dynamic>>[]
          : all.where((c) => c['studentId'].toString() == _selectedChild!['id'].toString()).toList();
      _entries = match.isNotEmpty ? ((match.first['timetable'] as List? ?? []).cast<Map<String, dynamic>>()) : <Map<String, dynamic>>[];
      setState(() {});
    } catch (e) {
      setState(() { _error = e.toString(); });
    }
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
      appBar: AppBar(title: const Text('Timetable')),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? Center(child: Text(_error!, style: const TextStyle(color: Colors.red)))
              : RefreshIndicator(
                  onRefresh: _bootstrap,
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
                                return DropdownMenuItem(value: c['id'].toString(), child: Text(name.isEmpty ? 'Student ${c['id']}' : name));
                              }).toList(),
                              onChanged: (v) {
                                final found = _children.firstWhere(
                                  (c) => c['id'].toString() == v,
                                  orElse: () => <String, dynamic>{},
                                );
                                setState(() { _selectedChild = found.isEmpty ? null : found; });
                                _loadTimetable();
                              },
                              decoration: const InputDecoration(labelText: 'Select child'),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),
                      ...List.generate(7, (i) => i).where((d) => grouped.containsKey(d)).map((d) {
                        final items = grouped[d]!;
                        items.sort((a,b){
                          final sa = (a['startTime'] ?? '').toString();
                          final sb = (b['startTime'] ?? '').toString();
                          return sa.compareTo(sb);
                        });
                        return Card(
                          child: Padding(
                            padding: const EdgeInsets.all(12.0),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(['Mon','Tue','Wed','Thu','Fri','Sat','Sun'][(d % 7).clamp(0,6)], style: const TextStyle(fontWeight: FontWeight.bold)),
                                const SizedBox(height: 8),
                                ...items.map((e) {
                                  final subject = (e['subject'] as Map?)?['name'] ?? 'Subject';
                                  final teacher = (e['staff'] as Map?)?['name'] ?? '';
                                  final room = (e['room'] as Map?)?['name'];
                                  final time = '${e['startTime']} - ${e['endTime']}';
                                  return ListTile(
                                    contentPadding: EdgeInsets.zero,
                                    leading: const Icon(Icons.book_outlined),
                                    title: Text(subject.toString()),
                                    subtitle: Text([time, if (teacher.toString().isNotEmpty) teacher, if (room != null) 'Room: $room'].join('  •  ')),
                                    onTap: () {
                                      final name = '${_selectedChild?['firstName'] ?? ''} ${_selectedChild?['lastName'] ?? ''}'.trim();
                                      Navigator.of(context).push(
                                        MaterialPageRoute(
                                          builder: (_) => TimetablePage(
                                            studentId: _selectedChild!['id'].toString(),
                                            studentName: name.isEmpty ? 'Student' : name,
                                          ),
                                        ),
                                      );
                                    },
                                  );
                                }),
                              ],
                            ),
                          ),
                        );
                      }),
                      if (grouped.isEmpty) const Center(child: Padding(padding: EdgeInsets.all(24), child: Text('No timetable entries.'))),
                    ],
                  ),
                ),
    );
  }
}
 

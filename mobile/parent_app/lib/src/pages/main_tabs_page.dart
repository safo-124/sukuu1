import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import 'home_page.dart';
import 'messages_page.dart';
import 'timetable_page.dart';
import 'grades_page.dart';
import 'attendance_page.dart';
import 'fees_page.dart';
import 'profile_page.dart'; // used for AppBar actions navigation
import '../ui/glass.dart';

class _PlaceholderPage extends StatelessWidget {
  final String title;
  const _PlaceholderPage({required this.title});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(title)),
      body: Center(
        child: Text('$title coming soon',
            style: const TextStyle(color: Colors.black54)),
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
  int _currentIndex = 0;
  late final List<Widget> _pages;
  final _storage = const FlutterSecureStorage();
  int _unread = 0;

  @override
  void initState() {
    super.initState();
    _pages = [
      HomePage(goToTab: (i) => setState(() => _currentIndex = i)),
      MessagesPage(onAnyRead: _loadUnreadCount),
      const _FeesTab(),
      const _MoreTab(),
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
        Uri.parse(
            '$baseUrl/api/schools/$schoolId/parents/me/messages?publishedOnly=true&limit=100'),
        headers: {
          'Authorization': 'Bearer $token',
          'Accept': 'application/json'
        },
      );
      if (res.statusCode != 200) return;
      final data = jsonDecode(res.body) as Map<String, dynamic>;
      final msgs =
          (data['messages'] as List? ?? []).cast<Map<String, dynamic>>();
      final unread = msgs.where((m) => m['isRead'] != true).length;
      if (mounted) setState(() => _unread = unread);
    } catch (_) {}
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: IndexedStack(index: _currentIndex, children: _pages),
      bottomNavigationBar: GlassBottomBar(
        child: Theme(
          data: Theme.of(context).copyWith(
            navigationBarTheme: Theme.of(context).navigationBarTheme.copyWith(
                  backgroundColor: Colors.transparent,
                  surfaceTintColor: Colors.transparent,
                ),
          ),
          child: NavigationBar(
            selectedIndex: _currentIndex,
            onDestinationSelected: (i) => setState(() => _currentIndex = i),
              labelBehavior: (Theme.of(context).platform == TargetPlatform.iOS)
                  ? NavigationDestinationLabelBehavior.alwaysHide
                  : NavigationDestinationLabelBehavior.onlyShowSelected,
            destinations: [
          const NavigationDestination(
              icon: Icon(Icons.home_outlined),
              selectedIcon: Icon(Icons.home),
              label: 'Home'),
          NavigationDestination(
              icon: _badgeIcon(Icons.mail_outline, _unread),
              selectedIcon: _badgeIcon(Icons.mail, _unread),
              label: 'Messages'),
              const NavigationDestination(
                  icon: Icon(Icons.receipt_long_outlined),
                  selectedIcon: Icon(Icons.receipt_long),
                  label: 'Fees'),
              const NavigationDestination(
                  icon: Icon(Icons.more_horiz),
                  selectedIcon: Icon(Icons.more_horiz),
                  label: 'More'),
            ],
          ),
        ),
      ),
    );
  }

  static Widget _badgeIcon(IconData icon, int count) {
    return Stack(
      clipBehavior: Clip.none,
      children: [
        Icon(icon),
        if (count > 0)
          Positioned(
            right: -6,
            top: -4,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1.5),
              decoration: BoxDecoration(
                color: Colors.redAccent,
                borderRadius: BorderRadius.circular(10),
              ),
              constraints: const BoxConstraints(minWidth: 18),
              child: Text(
                count > 99 ? '99+' : '$count',
                textAlign: TextAlign.center,
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 10,
                  fontWeight: FontWeight.w700,
                  height: 1.1,
                ),
              ),
            ),
          )
      ],
    );
  }
}

class _GradesTab extends StatefulWidget {
  const _GradesTab();

  @override
  State<_GradesTab> createState() => _GradesTabState();
}

class _GradesTabState extends State<_GradesTab> {
  final _storage = const FlutterSecureStorage();
  bool _loading = true;
  String? _error;
  List<Map<String, dynamic>> _children = [];
  Map<String, dynamic>? _selectedChild;
  Key _contentKey = UniqueKey();

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
      final baseUrl = await _storage.read(key: 'baseUrl');
      final token = await _storage.read(key: 'token');
      final schoolId = await _storage.read(key: 'schoolId');
      if (baseUrl == null || token == null || schoolId == null) {
        throw Exception('Missing auth');
      }

      final meRes = await http.get(
        Uri.parse('$baseUrl/api/schools/$schoolId/parents/me'),
        headers: {
          'Authorization': 'Bearer $token',
          'Accept': 'application/json'
        },
      );
      if (meRes.statusCode != 200) {
        throw Exception('Profile failed (${meRes.statusCode})');
      }
      final meJson = jsonDecode(meRes.body) as Map<String, dynamic>;
      _children =
          (meJson['children'] as List? ?? []).cast<Map<String, dynamic>>();
      if (_children.isNotEmpty) _selectedChild = _children.first;
    } catch (e) {
      _error = e.toString();
    } finally {
      setState(() {
        _loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return Scaffold(
        appBar: AppBar(title: const Text('Grades'), actions: [
          IconButton(
            tooltip: 'Profile',
            icon: const Icon(Icons.person_outline),
            onPressed: () {
              Navigator.of(context).push(
                MaterialPageRoute(builder: (_) => const ProfilePage()),
              );
            },
          )
        ]),
        body: const Center(child: CircularProgressIndicator()),
      );
    }
    if (_error != null) {
      return Scaffold(
        appBar: AppBar(title: const Text('Grades'), actions: [
          IconButton(
            tooltip: 'Profile',
            icon: const Icon(Icons.person_outline),
            onPressed: () {
              Navigator.of(context).push(
                MaterialPageRoute(builder: (_) => const ProfilePage()),
              );
            },
          )
        ]),
        body: Center(
            child: Text(_error!, style: const TextStyle(color: Colors.red))),
      );
    }
    if (_selectedChild == null) {
      return Scaffold(
        appBar: AppBar(title: const Text('Grades'), actions: [
          IconButton(
            tooltip: 'Profile',
            icon: const Icon(Icons.person_outline),
            onPressed: () {
              Navigator.of(context).push(
                MaterialPageRoute(builder: (_) => const ProfilePage()),
              );
            },
          )
        ]),
        body: const Center(child: Text('No linked children')),
      );
    }
    final name =
        '${_selectedChild!['firstName'] ?? ''} ${_selectedChild!['lastName'] ?? ''}'
            .trim();
    final sid = _selectedChild!['id'].toString();
    return Scaffold(
      appBar: AppBar(title: const Text('Grades'), actions: [
        IconButton(
          tooltip: 'Profile',
          icon: const Icon(Icons.person_outline),
          onPressed: () {
            Navigator.of(context).push(
              MaterialPageRoute(builder: (_) => const ProfilePage()),
            );
          },
        )
      ]),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(12.0),
            child: Row(
              children: [
                const Icon(Icons.child_care_outlined),
                const SizedBox(width: 8),
                Expanded(
                  child: DropdownButtonFormField<String>(
                    value: _selectedChild?['id']?.toString(),
                    items: _children.map((c) {
                      final cname =
                          '${c['firstName'] ?? ''} ${c['lastName'] ?? ''}'
                              .trim();
                      return DropdownMenuItem(
                          value: c['id'].toString(), child: Text(cname));
                    }).toList(),
                    onChanged: (v) {
                      final sel = _children.firstWhere(
                          (e) => e['id'].toString() == v,
                          orElse: () => {});
                      setState(() {
                        _selectedChild = sel.isEmpty ? null : sel;
                        _contentKey = UniqueKey();
                      });
                    },
                    decoration: const InputDecoration(labelText: 'Child'),
                  ),
                ),
              ],
            ),
          ),
          Expanded(
            child: KeyedSubtree(
              key: _contentKey,
              child: GradesPage(
                studentId: sid,
                studentName: name,
                showTitle: false,
              ),
            ),
          ),
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

class _MoreTab extends StatelessWidget {
  const _MoreTab();

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        flexibleSpace: const GlassAppBarFlex(),
        title: const Text('More'),
        actions: [
          IconButton(
            tooltip: 'Profile',
            icon: const Icon(Icons.person_outline),
            onPressed: () {
              Navigator.of(context).push(
                MaterialPageRoute(builder: (_) => const ProfilePage()),
              );
            },
          ),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.all(12),
        children: [
          GlassContainer(
            margin: const EdgeInsets.only(bottom: 12),
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 14),
            child: Row(
              children: const [
                Icon(Icons.widgets_outlined),
                SizedBox(width: 8),
                Expanded(
                  child: Text(
                    'Quick links',
                    style: TextStyle(fontWeight: FontWeight.w700),
                  ),
                ),
              ],
            ),
          ),
          const Padding(
            padding: EdgeInsets.fromLTRB(4, 8, 4, 4),
            child: Text('Student',
                style: TextStyle(fontWeight: FontWeight.w700, fontSize: 12)),
          ),
          const _MoreItem(
            icon: Icons.school_outlined,
            title: 'Grades',
            subtitle: 'View recent grades and report cards',
            target: _MoreTarget.grades,
          ),
          const _MoreItem(
            icon: Icons.fact_check_outlined,
            title: 'Attendance',
            subtitle: 'Check attendance and explain absences',
            target: _MoreTarget.attendance,
          ),
          const _MoreItem(
            icon: Icons.calendar_month_outlined,
            title: 'Timetable',
            subtitle: 'Daily subjects and teachers',
            target: _MoreTarget.timetable,
          ),
          const Padding(
            padding: EdgeInsets.fromLTRB(4, 12, 4, 4),
            child: Text('Account',
                style: TextStyle(fontWeight: FontWeight.w700, fontSize: 12)),
          ),
          const _MoreItem(
            icon: Icons.person_outline,
            title: 'Profile & Settings',
            subtitle: null,
            target: _MoreTarget.profile,
          ),
        ],
      ),
    );
  }
}

enum _MoreTarget { grades, attendance, timetable, profile }

class _MoreItem extends StatelessWidget {
  final IconData icon;
  final String title;
  final String? subtitle;
  final _MoreTarget target;
  const _MoreItem({
    required this.icon,
    required this.title,
    required this.target,
    this.subtitle,
  });

  @override
  Widget build(BuildContext context) {
    return GlassContainer(
      margin: const EdgeInsets.symmetric(vertical: 6),
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      child: ListTile(
        contentPadding: const EdgeInsets.symmetric(horizontal: 4, vertical: 2),
        leading: Icon(icon),
        title: Text(title, style: const TextStyle(fontWeight: FontWeight.w600)),
        subtitle: subtitle == null ? null : Text(subtitle!),
        trailing: const Icon(Icons.chevron_right),
        onTap: () {
          switch (target) {
            case _MoreTarget.grades:
              Navigator.of(context).push(
                MaterialPageRoute(builder: (_) => const _GradesTab()),
              );
              break;
            case _MoreTarget.attendance:
              Navigator.of(context).push(
                MaterialPageRoute(builder: (_) => const _AttendanceTab()),
              );
              break;
            case _MoreTarget.timetable:
              Navigator.of(context).push(
                MaterialPageRoute(builder: (_) => const _TimetableTab()),
              );
              break;
            case _MoreTarget.profile:
              Navigator.of(context).push(
                MaterialPageRoute(builder: (_) => const ProfilePage()),
              );
              break;
          }
        },
      ),
    );
  }
}

// (fixed broken _MoreItem by redefining above)

class _AttendanceTab extends StatefulWidget {
  const _AttendanceTab();

  @override
  State<_AttendanceTab> createState() => _AttendanceTabState();
}

class _AttendanceTabState extends State<_AttendanceTab> {
  final _storage = const FlutterSecureStorage();
  bool _loading = true;
  String? _error;
  List<Map<String, dynamic>> _children = [];
  Map<String, dynamic>? _selectedChild;
  Key _contentKey = UniqueKey();

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
      final baseUrl = await _storage.read(key: 'baseUrl');
      final token = await _storage.read(key: 'token');
      final schoolId = await _storage.read(key: 'schoolId');
      if (baseUrl == null || token == null || schoolId == null) {
        throw Exception('Missing auth');
      }

      final meRes = await http.get(
        Uri.parse('$baseUrl/api/schools/$schoolId/parents/me'),
        headers: {
          'Authorization': 'Bearer $token',
          'Accept': 'application/json'
        },
      );
      if (meRes.statusCode != 200) {
        throw Exception('Profile failed (${meRes.statusCode})');
      }
      final meJson = jsonDecode(meRes.body) as Map<String, dynamic>;
      _children =
          (meJson['children'] as List? ?? []).cast<Map<String, dynamic>>();
      if (_children.isNotEmpty) _selectedChild = _children.first;
    } catch (e) {
      _error = e.toString();
    } finally {
      setState(() {
        _loading = false;
      });
    }
}

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return Scaffold(
        appBar: AppBar(title: const Text('Attendance'), actions: [
          IconButton(
            tooltip: 'Profile',
            icon: const Icon(Icons.person_outline),
            onPressed: () {
              Navigator.of(context).push(
                MaterialPageRoute(builder: (_) => const ProfilePage()),
              );
            },
          )
        ]),
        body: const Center(child: CircularProgressIndicator()),
      );
    }
    if (_error != null) {
      return Scaffold(
        appBar: AppBar(title: const Text('Attendance'), actions: [
          IconButton(
            tooltip: 'Profile',
            icon: const Icon(Icons.person_outline),
            onPressed: () {
              Navigator.of(context).push(
                MaterialPageRoute(builder: (_) => const ProfilePage()),
              );
            },
          )
        ]),
        body: Center(
            child: Text(_error!, style: const TextStyle(color: Colors.red))),
      );
    }
    if (_selectedChild == null) {
      return Scaffold(
        appBar: AppBar(title: const Text('Attendance'), actions: [
          IconButton(
            tooltip: 'Profile',
            icon: const Icon(Icons.person_outline),
            onPressed: () {
              Navigator.of(context).push(
                MaterialPageRoute(builder: (_) => const ProfilePage()),
              );
            },
          )
        ]),
        body: const Center(child: Text('No linked children')),
      );
    }
    final name =
        '${_selectedChild!['firstName'] ?? ''} ${_selectedChild!['lastName'] ?? ''}'
            .trim();
    final sid = _selectedChild!['id'].toString();
    return Scaffold(
      appBar: AppBar(title: const Text('Attendance'), actions: [
        IconButton(
          tooltip: 'Profile',
          icon: const Icon(Icons.person_outline),
          onPressed: () {
            Navigator.of(context).push(
              MaterialPageRoute(builder: (_) => const ProfilePage()),
            );
          },
        )
      ]),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(12.0),
            child: Row(
              children: [
                const Icon(Icons.child_care_outlined),
                const SizedBox(width: 8),
                Expanded(
                  child: DropdownButtonFormField<String>(
                    value: _selectedChild?['id']?.toString(),
                    items: _children.map((c) {
                      final cname =
                          '${c['firstName'] ?? ''} ${c['lastName'] ?? ''}'
                              .trim();
                      return DropdownMenuItem(
                          value: c['id'].toString(), child: Text(cname));
                    }).toList(),
                    onChanged: (v) {
                      final sel = _children.firstWhere(
                          (e) => e['id'].toString() == v,
                          orElse: () => {});
                      setState(() {
                        _selectedChild = sel.isEmpty ? null : sel;
                        _contentKey = UniqueKey();
                      });
                    },
                    decoration: const InputDecoration(labelText: 'Child'),
                  ),
                ),
              ],
            ),
          ),
          Expanded(
            child: KeyedSubtree(
              key: _contentKey,
              child: AttendancePage(
                studentId: sid,
                studentName: name,
              ),
            ),
          ),
        ],
      ),
    );
  }

}

class _FeesTab extends StatefulWidget {
  const _FeesTab();

  @override
  State<_FeesTab> createState() => _FeesTabState();
}

class _FeesTabState extends State<_FeesTab> {
  final _storage = const FlutterSecureStorage();
  bool _loading = true;
  String? _error;
  List<Map<String, dynamic>> _children = [];
  Map<String, dynamic>? _selectedChild;
  Key _contentKey = UniqueKey();

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
      final baseUrl = await _storage.read(key: 'baseUrl');
      final token = await _storage.read(key: 'token');
      final schoolId = await _storage.read(key: 'schoolId');
      if (baseUrl == null || token == null || schoolId == null) {
        throw Exception('Missing auth');
      }
      final meRes = await http.get(
        Uri.parse('$baseUrl/api/schools/$schoolId/parents/me'),
        headers: {
          'Authorization': 'Bearer $token',
          'Accept': 'application/json'
        },
      );
      if (meRes.statusCode != 200) {
        throw Exception('Profile failed (${meRes.statusCode})');
      }
      final meJson = jsonDecode(meRes.body) as Map<String, dynamic>;
      _children =
          (meJson['children'] as List? ?? []).cast<Map<String, dynamic>>();
      if (_children.isNotEmpty) _selectedChild = _children.first;
    } catch (e) {
      _error = e.toString();
    } finally {
      setState(() {
        _loading = false;
        _contentKey = UniqueKey();
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return Scaffold(
          appBar: AppBar(title: const Text('Fees'), actions: [
            IconButton(
              tooltip: 'Profile',
              icon: const Icon(Icons.person_outline),
              onPressed: () {
                Navigator.of(context).push(
                  MaterialPageRoute(builder: (_) => const ProfilePage()),
                );
              },
            )
          ]),
          body: const Center(child: CircularProgressIndicator()));
    }
    if (_error != null) {
      return Scaffold(
          appBar: AppBar(title: const Text('Fees'), actions: [
            IconButton(
              tooltip: 'Profile',
              icon: const Icon(Icons.person_outline),
              onPressed: () {
                Navigator.of(context).push(
                  MaterialPageRoute(builder: (_) => const ProfilePage()),
                );
              },
            )
          ]),
          body: Center(
              child: Text(_error!, style: const TextStyle(color: Colors.red))));
    }
    if (_selectedChild == null) {
      return Scaffold(
          appBar: AppBar(title: const Text('Fees'), actions: [
            IconButton(
              tooltip: 'Profile',
              icon: const Icon(Icons.person_outline),
              onPressed: () {
                Navigator.of(context).push(
                  MaterialPageRoute(builder: (_) => const ProfilePage()),
                );
              },
            )
          ]),
          body: const Center(child: Text('No linked children')));
    }
    final name =
        '${_selectedChild!['firstName'] ?? ''} ${_selectedChild!['lastName'] ?? ''}'
            .trim();
    final sid = _selectedChild!['id'].toString();
    return Scaffold(
      appBar: AppBar(title: const Text('Fees'), actions: [
        IconButton(
          tooltip: 'Profile',
          icon: const Icon(Icons.person_outline),
          onPressed: () {
            Navigator.of(context).push(
              MaterialPageRoute(builder: (_) => const ProfilePage()),
            );
          },
        )
      ]),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(12.0),
            child: Row(
              children: [
                const Icon(Icons.child_care_outlined),
                const SizedBox(width: 8),
                Expanded(
                  child: DropdownButtonFormField<String>(
                    value: _selectedChild?['id']?.toString(),
                    items: _children.map((c) {
                      final cname =
                          '${c['firstName'] ?? ''} ${c['lastName'] ?? ''}'
                              .trim();
                      return DropdownMenuItem(
                          value: c['id'].toString(), child: Text(cname));
                    }).toList(),
                    onChanged: (v) {
                      final sel = _children.firstWhere(
                          (e) => e['id'].toString() == v,
                          orElse: () => {});
                      setState(() {
                        _selectedChild = sel.isEmpty ? null : sel;
                        _contentKey = UniqueKey();
                      });
                    },
                    decoration: const InputDecoration(labelText: 'Child'),
                  ),
                ),
              ],
            ),
          ),
          Expanded(
            child: KeyedSubtree(
              key: _contentKey,
              child:
                  FeesPage(studentId: sid, studentName: name, showTitle: false),
            ),
          ),
        ],
      ),
    );
  }
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
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final baseUrl = await _storage.read(key: 'baseUrl');
      final token = await _storage.read(key: 'token');
      final schoolId = await _storage.read(key: 'schoolId');
      if (baseUrl == null || token == null || schoolId == null)
        throw Exception('Missing auth');

      final meRes = await http.get(
        Uri.parse('$baseUrl/api/schools/$schoolId/parents/me'),
        headers: {
          'Authorization': 'Bearer $token',
          'Accept': 'application/json'
        },
      );
      if (meRes.statusCode != 200)
        throw Exception('Profile failed (${meRes.statusCode})');
      final meJson = jsonDecode(meRes.body) as Map<String, dynamic>;
      _children =
          (meJson['children'] as List? ?? []).cast<Map<String, dynamic>>();
      if (_children.isNotEmpty) _selectedChild = _children.first;
      await _loadTimetable();
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

  Future<void> _loadTimetable() async {
    try {
      final baseUrl = await _storage.read(key: 'baseUrl');
      final token = await _storage.read(key: 'token');
      final schoolId = await _storage.read(key: 'schoolId');
      if (baseUrl == null || token == null || schoolId == null) return;
      final res = await http.get(
        Uri.parse(
            '$baseUrl/api/schools/$schoolId/parents/me/children/timetable'),
        headers: {
          'Authorization': 'Bearer $token',
          'Accept': 'application/json'
        },
      );
      if (res.statusCode != 200)
        throw Exception('Timetable failed (${res.statusCode})');
      final data = jsonDecode(res.body) as Map<String, dynamic>;
      final all =
          (data['children'] as List? ?? []).cast<Map<String, dynamic>>();
      final match = _selectedChild == null
          ? <Map<String, dynamic>>[]
          : all
              .where((c) =>
                  c['studentId'].toString() == _selectedChild!['id'].toString())
              .toList();
      _entries = match.isNotEmpty
          ? ((match.first['timetable'] as List? ?? [])
              .cast<Map<String, dynamic>>())
          : <Map<String, dynamic>>[];
      setState(() {});
    } catch (e) {
      setState(() {
        _error = e.toString();
      });
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
      appBar: AppBar(title: const Text('Timetable'), flexibleSpace: const GlassAppBarFlex(), actions: [
        IconButton(
          tooltip: 'Profile',
          icon: const Icon(Icons.person_outline),
          onPressed: () {
            Navigator.of(context).push(
              MaterialPageRoute(builder: (_) => const ProfilePage()),
            );
          },
        )
      ]),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? Center(
                  child:
                      Text(_error!, style: const TextStyle(color: Colors.red)))
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
                                final name =
                                    '${c['firstName'] ?? ''} ${c['lastName'] ?? ''}'
                                        .trim();
                                return DropdownMenuItem(
                                    value: c['id'].toString(),
                                    child: Text(name.isEmpty
                                        ? 'Student ${c['id']}'
                                        : name));
                              }).toList(),
                              onChanged: (v) {
                                final found = _children.firstWhere(
                                  (c) => c['id'].toString() == v,
                                  orElse: () => <String, dynamic>{},
                                );
                                setState(() {
                                  _selectedChild = found.isEmpty ? null : found;
                                });
                                _loadTimetable();
                              },
                              decoration: const InputDecoration(
                                  labelText: 'Select child'),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),
                      ...List.generate(7, (i) => i)
                          .where((d) => grouped.containsKey(d))
                          .map((d) {
                        final items = grouped[d]!;
                        items.sort((a, b) {
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
                                Text(
                                    [
                                      'Mon',
                                      'Tue',
                                      'Wed',
                                      'Thu',
                                      'Fri',
                                      'Sat',
                                      'Sun'
                                    ][(d % 7).clamp(0, 6)],
                                    style: const TextStyle(
                                        fontWeight: FontWeight.bold)),
                                const SizedBox(height: 8),
                                ...items.map((e) {
                                  final subject =
                                      (e['subject'] as Map?)?['name'] ??
                                          'Subject';
                                  final teacher =
                                      (e['staff'] as Map?)?['name'] ?? '';
                                  final room = (e['room'] as Map?)?['name'];
                                  final time =
                                      '${e['startTime']} - ${e['endTime']}';
                                  return ListTile(
                                    contentPadding: EdgeInsets.zero,
                                    leading: const Icon(Icons.book_outlined),
                                    title: Text(subject.toString()),
                                    subtitle: Text([
                                      time,
                                      if (teacher.toString().isNotEmpty)
                                        teacher,
                                      if (room != null) 'Room: $room'
                                    ].join('  •  ')),
                                    onTap: () {
                                      final name =
                                          '${_selectedChild?['firstName'] ?? ''} ${_selectedChild?['lastName'] ?? ''}'
                                              .trim();
                                      Navigator.of(context).push(
                                        MaterialPageRoute(
                                          builder: (_) => TimetablePage(
                                            studentId: _selectedChild!['id']
                                                .toString(),
                                            studentName:
                                                name.isEmpty ? 'Student' : name,
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
                      if (grouped.isEmpty)
                        const Center(
                            child: Padding(
                                padding: EdgeInsets.all(24),
                                child: Text('No timetable entries.'))),
                    ],
                  ),
                ),
    );
  }
}

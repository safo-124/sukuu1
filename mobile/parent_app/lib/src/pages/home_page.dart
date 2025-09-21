import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:http/http.dart' as http;
import 'package:intl/intl.dart';
import 'grades_page.dart';
import 'attendance_page.dart';
import 'remarks_page.dart';
import 'timetable_page.dart';

class HomePage extends StatefulWidget {
  final void Function(int index)?
      goToTab; // allow switching tabs from home quick actions
  const HomePage({super.key, this.goToTab});

  @override
  State<HomePage> createState() => _HomePageState();
}

class _HomePageState extends State<HomePage> {
  final _storage = const FlutterSecureStorage();

  bool _loading = true;
  bool _loadingGrades = false;
  bool _loadingAttendance = false;
  bool _loadingRemarks = false;
  String? _error;
  String? _parentName;
  String? _schoolName;
  String? _schoolLogoUrl;
  String? _schoolId;
  String? _baseUrl;
  String? _token;

  List<Map<String, dynamic>> _children = [];
  Map<String, dynamic>? _selectedChild;
  List<Map<String, dynamic>> _recentGrades = [];
  List<Map<String, dynamic>> _recentAttendance = [];
  List<Map<String, dynamic>> _recentRemarks = [];
  int _pendingExplanations =
      0; // number of attendance items requesting explanation

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
      _token = await _storage.read(key: 'token');
      _baseUrl = await _storage.read(key: 'baseUrl');
      _schoolId = await _storage.read(key: 'schoolId');
      if (_token == null || _baseUrl == null || _schoolId == null) {
        throw Exception('Missing credentials, please sign in again.');
      }

      // Load parent profile and children
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
      final kids =
          (meJson['children'] as List? ?? []).cast<Map<String, dynamic>>();
      _parentName = (meJson['name'] as String?)?.trim();
      _schoolName = (meJson['schoolName'] as String?)?.trim();
      _schoolLogoUrl = (meJson['schoolLogoUrl'] as String?)?.trim();
      _children = kids;
      if (_children.isNotEmpty) {
        _selectedChild = _children.first;
      }
      setState(() {});

      // Load sections for selected child
      await _loadGrades();
      await _loadAttendance();
      await _loadRemarks();
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

  Future<void> _loadGrades() async {
    if (_selectedChild == null) {
      setState(() {
        _recentGrades = [];
      });
      return;
    }
    setState(() {
      _loadingGrades = true;
    });
    try {
      final res = await http.get(
        Uri.parse(
            '$_baseUrl/api/schools/$_schoolId/parents/me/children/grades'),
        headers: {
          'Authorization': 'Bearer $_token',
          'Accept': 'application/json'
        },
      );
      if (res.statusCode != 200) {
        throw Exception('Failed to load grades (${res.statusCode})');
      }
      final data = jsonDecode(res.body) as Map<String, dynamic>;
      final children =
          (data['children'] as List? ?? []).cast<Map<String, dynamic>>();
      final match = children
          .where((c) =>
              c['studentId'].toString() == _selectedChild!['id'].toString())
          .toList();
      final grades = match.isNotEmpty
          ? ((match.first['grades'] as List? ?? [])
              .cast<Map<String, dynamic>>())
          : <Map<String, dynamic>>[];
      grades.sort((a, b) {
        final da = DateTime.tryParse(
                ((a['examSchedule'] as Map?)?['date'] ?? '') as String? ??
                    '') ??
            DateTime.fromMillisecondsSinceEpoch(0);
        final db = DateTime.tryParse(
                ((b['examSchedule'] as Map?)?['date'] ?? '') as String? ??
                    '') ??
            DateTime.fromMillisecondsSinceEpoch(0);
        return db.compareTo(da);
      });
      setState(() {
        _recentGrades = grades.take(5).toList();
      });
    } catch (e) {
      setState(() {
        _error = e.toString();
      });
    } finally {
      setState(() {
        _loadingGrades = false;
      });
    }
  }

  Future<void> _loadAttendance() async {
    if (_selectedChild == null) {
      setState(() {
        _recentAttendance = [];
      });
      return;
    }
    setState(() {
      _loadingAttendance = true;
    });
    try {
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
          .where((c) =>
              c['studentId'].toString() == _selectedChild!['id'].toString())
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
        _recentAttendance = att.take(5).toList();
        _pendingExplanations = att
            .where((e) =>
                ((e['explanation'] as Map?)?['status']?.toString() ?? '')
                    .toUpperCase() ==
                'REQUESTED')
            .length;
      });
    } catch (e) {
      setState(() {
        _error = e.toString();
      });
    } finally {
      setState(() {
        _loadingAttendance = false;
      });
    }
  }

  Future<void> _loadRemarks() async {
    if (_selectedChild == null) {
      setState(() {
        _recentRemarks = [];
      });
      return;
    }
    setState(() {
      _loadingRemarks = true;
    });
    try {
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
          .where((c) =>
              c['studentId'].toString() == _selectedChild!['id'].toString())
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
        _recentRemarks = rem.take(5).toList();
      });
    } catch (e) {
      setState(() {
        _error = e.toString();
      });
    } finally {
      setState(() {
        _loadingRemarks = false;
      });
    }
  }

  Future<void> _refresh() async {
    await _bootstrap();
  }

  @override
  Widget build(BuildContext context) {
    final df = DateFormat('EEE, MMM d');
    return Scaffold(
      appBar: AppBar(
        title: Text(_schoolName?.isNotEmpty == true ? _schoolName! : 'Home'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _loading ? null : _refresh,
            tooltip: 'Refresh',
          ),
        ],
      ),
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
                          onPressed: _bootstrap,
                          icon: const Icon(Icons.refresh),
                          label: const Text('Try again'),
                        ),
                      ],
                    ),
                  ),
                )
              : RefreshIndicator(
                  onRefresh: _refresh,
                  child: ListView(
                    padding: EdgeInsets.zero,
                    children: [
                      // Hero header
                      Container(
                        decoration: const BoxDecoration(
                          gradient: LinearGradient(
                            colors: [Color(0xFF3F51B5), Color(0xFF673AB7)],
                            begin: Alignment.topLeft,
                            end: Alignment.bottomRight,
                          ),
                        ),
                        padding: const EdgeInsets.fromLTRB(16, 24, 16, 20),
                        child: SafeArea(
                          bottom: false,
                          child: Row(
                            children: [
                              CircleAvatar(
                                radius: 28,
                                backgroundColor: Colors.white.withOpacity(0.2),
                                backgroundImage: (_schoolLogoUrl != null &&
                                        _schoolLogoUrl!.isNotEmpty)
                                    ? NetworkImage(_schoolLogoUrl!)
                                    : null,
                                child: (_schoolLogoUrl == null ||
                                        _schoolLogoUrl!.isEmpty)
                                    ? const Icon(Icons.school,
                                        color: Colors.white)
                                    : null,
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      _schoolName?.isNotEmpty == true
                                          ? _schoolName!
                                          : 'Welcome',
                                      style: const TextStyle(
                                          color: Colors.white,
                                          fontSize: 20,
                                          fontWeight: FontWeight.w700),
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                    ),
                                    const SizedBox(height: 4),
                                    Text(
                                      'Hello, ${_parentName ?? 'Parent'}',
                                      style: TextStyle(
                                          color: Colors.white.withOpacity(0.9)),
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),

                      const SizedBox(height: 12),
                      Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 16),
                        child: _ChildSelectorCard(
                          children: _children,
                          selectedChildId: _selectedChild?['id']?.toString(),
                          onChildChanged: (id) {
                            final found = _children.firstWhere(
                              (c) => c['id'].toString() == id,
                              orElse: () => <String, dynamic>{},
                            );
                            setState(() {
                              _selectedChild = found.isEmpty ? null : found;
                            });
                            _loadGrades();
                            _loadAttendance();
                            _loadRemarks();
                          },
                        ),
                      ),
                      const SizedBox(height: 16),

                      // Quick Actions (grid style)
                      Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 16),
                        child: Column(
                          children: [
                            Row(
                              children: [
                                Expanded(
                                  child: _QuickActionCard(
                                    color: Colors.indigo,
                                    icon: Icons.leaderboard_outlined,
                                    title: 'Grades',
                                    onTap: _selectedChild == null
                                        ? null
                                        : () {
                                            final name =
                                                '${_selectedChild?['firstName'] ?? ''} ${_selectedChild?['lastName'] ?? ''}'
                                                    .trim();
                                            Navigator.of(context).push(
                                              MaterialPageRoute(
                                                builder: (_) => GradesPage(
                                                  studentId:
                                                      _selectedChild!['id']
                                                          .toString(),
                                                  studentName: name.isEmpty
                                                      ? 'Student'
                                                      : name,
                                                ),
                                              ),
                                            );
                                          },
                                  ),
                                ),
                                const SizedBox(width: 12),
                                Expanded(
                                  child: _QuickActionCard(
                                    color: Colors.teal,
                                    icon: Icons.calendar_month_outlined,
                                    title: 'Attendance',
                                    badgeCount: _pendingExplanations > 0
                                        ? _pendingExplanations
                                        : null,
                                    onTap: _selectedChild == null
                                        ? null
                                        : () {
                                            if (widget.goToTab != null) {
                                              widget.goToTab!(2);
                                            } else {
                                              final name =
                                                  '${_selectedChild?['firstName'] ?? ''} ${_selectedChild?['lastName'] ?? ''}'
                                                      .trim();
                                              Navigator.of(context).push(
                                                MaterialPageRoute(
                                                  builder: (_) =>
                                                      AttendancePage(
                                                    studentId:
                                                        _selectedChild!['id']
                                                            .toString(),
                                                    studentName: name.isEmpty
                                                        ? 'Student'
                                                        : name,
                                                  ),
                                                ),
                                              );
                                            }
                                          },
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 12),
                            Row(
                              children: [
                                Expanded(
                                  child: _QuickActionCard(
                                    color: Colors.deepOrange,
                                    icon: Icons.chat_bubble_outline,
                                    title: 'Remarks',
                                    onTap: _selectedChild == null
                                        ? null
                                        : () {
                                            final name =
                                                '${_selectedChild?['firstName'] ?? ''} ${_selectedChild?['lastName'] ?? ''}'
                                                    .trim();
                                            Navigator.of(context).push(
                                              MaterialPageRoute(
                                                builder: (_) => RemarksPage(
                                                  studentId:
                                                      _selectedChild!['id']
                                                          .toString(),
                                                  studentName: name.isEmpty
                                                      ? 'Student'
                                                      : name,
                                                ),
                                              ),
                                            );
                                          },
                                  ),
                                ),
                                const SizedBox(width: 12),
                                Expanded(
                                  child: _QuickActionCard(
                                    color: Colors.deepPurple,
                                    icon: Icons.schedule,
                                    title: 'Timetable',
                                    onTap: _selectedChild == null
                                        ? null
                                        : () {
                                            final name =
                                                '${_selectedChild?['firstName'] ?? ''} ${_selectedChild?['lastName'] ?? ''}'
                                                    .trim();
                                            Navigator.of(context).push(
                                              MaterialPageRoute(
                                                builder: (_) => TimetablePage(
                                                  studentId:
                                                      _selectedChild!['id']
                                                          .toString(),
                                                  studentName: name.isEmpty
                                                      ? 'Student'
                                                      : name,
                                                ),
                                              ),
                                            );
                                          },
                                  ),
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),

                      const SizedBox(height: 20),

                      // Recent Grades
                      _SectionHeader(
                        icon: Icons.history,
                        title: 'Recent grades',
                        actionLabel: 'View all',
                        onAction: _selectedChild == null
                            ? null
                            : () {
                                if (widget.goToTab != null) {
                                  widget.goToTab!(1); // Grades tab index
                                } else {
                                  final name =
                                      '${_selectedChild?['firstName'] ?? ''} ${_selectedChild?['lastName'] ?? ''}'
                                          .trim();
                                  Navigator.of(context).push(
                                    MaterialPageRoute(
                                      builder: (_) => GradesPage(
                                        studentId:
                                            _selectedChild!['id'].toString(),
                                        studentName:
                                            name.isEmpty ? 'Student' : name,
                                      ),
                                    ),
                                  );
                                }
                              },
                      ),
                      const SizedBox(height: 8),
                      if (_loadingGrades)
                        const LinearProgressIndicator(minHeight: 2),
                      if (_recentGrades.isEmpty && !_loadingGrades)
                        const Padding(
                          padding: EdgeInsets.symmetric(vertical: 16),
                          child: Text('No grades yet',
                              style: TextStyle(color: Colors.black54)),
                        ),
                      ..._recentGrades.map((g) {
                        final subject =
                            (g['subject'] as Map?)?['name'] ?? 'Subject';
                        final examName = ((g['examSchedule'] as Map?)?['exam']
                                as Map?)?['name'] ??
                            'Exam';
                        final dateStr = (g['examSchedule'] as Map?)?['date'];
                        final date = dateStr is String && dateStr.isNotEmpty
                            ? DateTime.tryParse(dateStr)
                            : null;
                        final marks = g['marksObtained']?.toString() ?? '-';
                        return Card(
                          child: Padding(
                            padding: const EdgeInsets.all(12.0),
                            child: Row(
                              children: [
                                CircleAvatar(
                                  backgroundColor: Colors.indigo.shade50,
                                  child: const Icon(Icons.book_outlined,
                                      color: Colors.indigo),
                                ),
                                const SizedBox(width: 12),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                      Text(subject.toString(),
                                          style: const TextStyle(
                                              fontWeight: FontWeight.w600)),
                                      const SizedBox(height: 4),
                                      Text(
                                        '${examName.toString()} • ${date != null ? df.format(date) : ''}',
                                        style: const TextStyle(
                                            color: Colors.black54),
                                      ),
                                    ],
                                  ),
                                ),
                                Container(
                                  padding: const EdgeInsets.symmetric(
                                      horizontal: 10, vertical: 6),
                                  decoration: BoxDecoration(
                                    color: Colors.indigo.shade600,
                                    borderRadius: BorderRadius.circular(999),
                                  ),
                                  child: Text(marks,
                                      style: const TextStyle(
                                          color: Colors.white,
                                          fontWeight: FontWeight.bold)),
                                ),
                              ],
                            ),
                          ),
                        );
                      }),

                      const SizedBox(height: 20),

                      // Recent Attendance
                      _SectionHeader(
                        icon: Icons.calendar_month_outlined,
                        title: 'Recent attendance',
                        actionLabel: 'View all',
                        onAction: _selectedChild == null
                            ? null
                            : () {
                                if (widget.goToTab != null) {
                                  widget.goToTab!(2);
                                } else {
                                  final name =
                                      '${_selectedChild?['firstName'] ?? ''} ${_selectedChild?['lastName'] ?? ''}'
                                          .trim();
                                  Navigator.of(context).push(
                                    MaterialPageRoute(
                                      builder: (_) => AttendancePage(
                                        studentId:
                                            _selectedChild!['id'].toString(),
                                        studentName:
                                            name.isEmpty ? 'Student' : name,
                                      ),
                                    ),
                                  );
                                }
                              },
                      ),
                      const SizedBox(height: 8),
                      if (_loadingAttendance)
                        const LinearProgressIndicator(minHeight: 2),
                      if (_recentAttendance.isEmpty && !_loadingAttendance)
                        const Padding(
                          padding: EdgeInsets.symmetric(vertical: 16),
                          child: Text('No attendance yet',
                              style: TextStyle(color: Colors.black54)),
                        ),
                      ..._recentAttendance.map((a) {
                        final dateStr = a['date']?.toString();
                        final d = dateStr != null && dateStr.isNotEmpty
                            ? DateTime.tryParse(dateStr)
                            : null;
                        final status = a['status']?.toString() ?? '-';
                        final remarks = a['remarks']?.toString() ?? '';
                        final explanation = a['explanation'] as Map?;
                        final explStatus =
                            (explanation?['status']?.toString() ?? '')
                                .toUpperCase();
                        return Card(
                          child: Padding(
                            padding: const EdgeInsets.all(12.0),
                            child: Row(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                CircleAvatar(
                                  backgroundColor: Colors.teal.shade50,
                                  child: const Icon(Icons.check_circle_outline,
                                      color: Colors.teal),
                                ),
                                const SizedBox(width: 12),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                      Row(
                                        children: [
                                          _chip(status, _statusColor(status)),
                                          const SizedBox(width: 8),
                                          if (explStatus == 'REQUESTED')
                                            _chip('Explanation requested',
                                                Colors.amber.shade700),
                                          if (explStatus == 'ANSWERED')
                                            _chip('Explained',
                                                Colors.green.shade700),
                                        ],
                                      ),
                                      const SizedBox(height: 6),
                                      Text(
                                          '${d != null ? df.format(d) : ''}${remarks.isNotEmpty ? ' • $remarks' : ''}',
                                          style: const TextStyle(
                                              color: Colors.black87)),
                                    ],
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ).onTap(() {
                          // Tapping recent attendance navigates to the Attendance tab
                          if (widget.goToTab != null) {
                            widget.goToTab!(2);
                          } else {
                            final name =
                                '${_selectedChild?['firstName'] ?? ''} ${_selectedChild?['lastName'] ?? ''}'
                                    .trim();
                            Navigator.of(context).push(
                              MaterialPageRoute(
                                builder: (_) => AttendancePage(
                                  studentId: _selectedChild!['id'].toString(),
                                  studentName: name.isEmpty ? 'Student' : name,
                                ),
                              ),
                            );
                          }
                        });
                      }),

                      const SizedBox(height: 20),

                      // Recent Remarks
                      _SectionHeader(
                        icon: Icons.chat_bubble_outline,
                        title: 'Recent remarks',
                        actionLabel: _selectedChild == null ? null : 'View all',
                        onAction: _selectedChild == null
                            ? null
                            : () {
                                final name =
                                    '${_selectedChild?['firstName'] ?? ''} ${_selectedChild?['lastName'] ?? ''}'
                                        .trim();
                                Navigator.of(context).push(
                                  MaterialPageRoute(
                                    builder: (_) => RemarksPage(
                                      studentId:
                                          _selectedChild!['id'].toString(),
                                      studentName:
                                          name.isEmpty ? 'Student' : name,
                                    ),
                                  ),
                                );
                              },
                      ),
                      const SizedBox(height: 8),
                      if (_loadingRemarks)
                        const LinearProgressIndicator(minHeight: 2),
                      if (_recentRemarks.isEmpty && !_loadingRemarks)
                        const Padding(
                          padding: EdgeInsets.symmetric(vertical: 16),
                          child: Text('No remarks yet',
                              style: TextStyle(color: Colors.black54)),
                        ),
                      ..._recentRemarks.map((r) {
                        final comment = r['comment']?.toString() ?? '';
                        final subject = r['subject']?.toString() ?? '';
                        final src = r['source']?.toString() ?? '';
                        final name = r['examOrAssignment']?.toString() ?? '';
                        final dateStr = r['date']?.toString();
                        final d = dateStr != null && dateStr.isNotEmpty
                            ? DateTime.tryParse(dateStr)
                            : null;
                        return Card(
                          child: Padding(
                            padding: const EdgeInsets.all(12.0),
                            child: Row(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                CircleAvatar(
                                  backgroundColor: Colors.deepOrange.shade50,
                                  child: const Icon(Icons.chat_bubble_outline,
                                      color: Colors.deepOrange),
                                ),
                                const SizedBox(width: 12),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                          subject.isNotEmpty
                                              ? subject
                                              : 'Remark',
                                          style: const TextStyle(
                                              fontWeight: FontWeight.w600)),
                                      const SizedBox(height: 4),
                                      Text(
                                        [
                                          src,
                                          if (name.isNotEmpty) name,
                                          if (d != null) df.format(d)
                                        ].join(' • '),
                                        style: const TextStyle(
                                            color: Colors.black54),
                                      ),
                                      const SizedBox(height: 6),
                                      Text(
                                        comment,
                                        maxLines: 3,
                                        overflow: TextOverflow.ellipsis,
                                      ),
                                    ],
                                  ),
                                ),
                              ],
                            ),
                          ),
                        );
                      }),
                    ],
                  ),
                ),
    );
  }

  // Helper widgets and styles
  Color _statusColor(String status) {
    switch (status.toUpperCase()) {
      case 'PRESENT':
        return Colors.green.shade700;
      case 'ABSENT':
        return Colors.red.shade700;
      case 'LATE':
        return Colors.orange.shade700;
      case 'EXCUSED':
        return Colors.blueGrey.shade700;
      default:
        return Colors.grey.shade600;
    }
  }

  Widget _chip(String label, Color color) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(
        color: color,
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(label,
          style: const TextStyle(color: Colors.white, fontSize: 12)),
    );
  }
}

class _Header extends StatelessWidget {
  final List<Map<String, dynamic>> children;
  final String? selectedChildId;
  final void Function(String id) onChildChanged;

  const _Header({
    required this.children,
    required this.selectedChildId,
    required this.onChildChanged,
  });

  @override
  Widget build(BuildContext context) {
    return _ChildSelectorCard(
      children: children,
      selectedChildId: selectedChildId,
      onChildChanged: onChildChanged,
    );
  }
}

class _QuickActionCard extends StatelessWidget {
  final Color color;
  final IconData icon;
  final String title;
  final VoidCallback? onTap;
  final int? badgeCount;
  const _QuickActionCard({
    required this.color,
    required this.icon,
    required this.title,
    this.onTap,
    this.badgeCount,
  });

  @override
  Widget build(BuildContext context) {
    final gradient = LinearGradient(
      colors: [color, color.withOpacity(0.75)],
      begin: Alignment.topLeft,
      end: Alignment.bottomRight,
    );
    return Material(
      color: Colors.transparent,
      borderRadius: BorderRadius.circular(16),
      child: InkWell(
        borderRadius: BorderRadius.circular(16),
        onTap: onTap,
        child: Ink(
          decoration: BoxDecoration(
            gradient: gradient,
            borderRadius: BorderRadius.circular(16),
            boxShadow: [
              BoxShadow(
                  color: color.withOpacity(0.3),
                  blurRadius: 12,
                  offset: const Offset(0, 6)),
            ],
          ),
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 18),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Stack(
                  clipBehavior: Clip.none,
                  children: [
                    Icon(icon, color: Colors.white),
                    if (badgeCount != null && (badgeCount ?? 0) > 0)
                      Positioned(
                        right: -8,
                        top: -8,
                        child: Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 6, vertical: 2),
                          decoration: const BoxDecoration(
                              color: Colors.red,
                              borderRadius:
                                  BorderRadius.all(Radius.circular(10))),
                          constraints: const BoxConstraints(minWidth: 16),
                          child: Text('${(badgeCount! > 99) ? 99 : badgeCount}',
                              textAlign: TextAlign.center,
                              style: const TextStyle(
                                  color: Colors.white,
                                  fontSize: 10,
                                  fontWeight: FontWeight.bold)),
                        ),
                      ),
                  ],
                ),
                const SizedBox(height: 6),
                Text(title,
                    style: const TextStyle(
                        color: Colors.white, fontWeight: FontWeight.w700)),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _SectionHeader extends StatelessWidget {
  final IconData icon;
  final String title;
  final String? actionLabel;
  final VoidCallback? onAction;
  const _SectionHeader({
    required this.icon,
    required this.title,
    this.actionLabel,
    this.onAction,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Row(
        children: [
          Icon(icon, size: 18),
          const SizedBox(width: 6),
          Expanded(
            child: Text(title,
                style: const TextStyle(fontWeight: FontWeight.w600)),
          ),
          if (actionLabel != null && onAction != null)
            TextButton(onPressed: onAction, child: Text(actionLabel!)),
        ],
      ),
    );
  }
}

// Tiny extension to add onTap to any widget easily
extension _InkOnTap on Widget {
  Widget onTap(VoidCallback onTap) => Material(
        color: Colors.transparent,
        child: InkWell(onTap: onTap, child: this),
      );
}

class _ChildSelectorCard extends StatelessWidget {
  final List<Map<String, dynamic>> children;
  final String? selectedChildId;
  final void Function(String id) onChildChanged;

  const _ChildSelectorCard({
    required this.children,
    required this.selectedChildId,
    required this.onChildChanged,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
              color: Colors.black.withOpacity(0.05),
              blurRadius: 12,
              offset: const Offset(0, 6)),
        ],
      ),
      padding: const EdgeInsets.all(12),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: Colors.indigo.withOpacity(0.08),
              borderRadius: BorderRadius.circular(10),
            ),
            child: const Icon(Icons.child_care_outlined, color: Colors.indigo),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: DropdownButtonFormField<String>(
              value: selectedChildId,
              items: children.map((c) {
                final name =
                    '${c['firstName'] ?? ''} ${c['lastName'] ?? ''}'.trim();
                return DropdownMenuItem<String>(
                  value: c['id'].toString(),
                  child: Text(name.isEmpty ? 'Student ${c['id']}' : name),
                );
              }).toList(),
              onChanged: (v) {
                if (v != null) onChildChanged(v);
              },
              decoration: const InputDecoration(
                labelText: 'Select child',
                border: OutlineInputBorder(borderSide: BorderSide.none),
                filled: true,
                fillColor: Color(0xFFF5F6FB),
                isDense: true,
                contentPadding:
                    EdgeInsets.symmetric(horizontal: 12, vertical: 12),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

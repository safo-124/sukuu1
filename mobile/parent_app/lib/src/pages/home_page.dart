import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:http/http.dart' as http;
import 'package:intl/intl.dart';
import 'grades_page.dart';
import 'attendance_page.dart';
import 'remarks_page.dart';
import 'timetable_page.dart';
import 'landing_page.dart';
import 'profile_page.dart';
import '../ui/glass.dart';
import 'messages_page.dart';
import 'fees_page.dart';
import 'library_loans_page.dart';
import 'meetings_page.dart';

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
  // Full attendance list for calendar markers
  List<Map<String, dynamic>> _attendanceAll = [];
  // Calendar anchor month (first day of month)
  DateTime _calendarMonth = DateTime(DateTime.now().year, DateTime.now().month, 1);

  // Promotion summary state
  Map<String, dynamic>? _latestPromotion;
  bool _loadingPromotion = false;

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
      _children =
          (meJson['children'] as List? ?? []).cast<Map<String, dynamic>>();
      _parentName = (meJson['name'] as String?)?.trim();
      _schoolName = (meJson['schoolName'] as String?)?.trim();
      _schoolLogoUrl = (meJson['schoolLogoUrl'] as String?)?.trim();
      if (_children.isNotEmpty) _selectedChild = _children.first;

      await _loadLatestPromotion();
      await _loadGrades();
      await _loadAttendance();
      await _loadRemarks();
    } catch (e) {
      _error = e.toString();
    } finally {
      setState(() {
        _loading = false;
      });
    }
  }

  Future<void> _loadGrades() async {
    if (_selectedChild == null) {
      setState(() => _recentGrades = []);
      return;
    }
    setState(() => _loadingGrades = true);
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
      setState(() => _recentGrades = grades.take(5).toList());
    } catch (e) {
      setState(() => _error = e.toString());
    } finally {
      setState(() => _loadingGrades = false);
    }
  }

  Future<void> _loadAttendance() async {
    if (_selectedChild == null) {
      setState(() {
        _recentAttendance = [];
        _attendanceAll = [];
      });
      return;
    }
    setState(() => _loadingAttendance = true);
    try {
      // Build from/to for current calendar month window
      final ym = _calendarMonth;
      final from = DateTime(ym.year, ym.month, 1);
      final to = DateTime(ym.year, ym.month + 1, 0);
      final fromStr = DateFormat('yyyy-MM-dd').format(from);
      final toStr = DateFormat('yyyy-MM-dd').format(to);
      final url = Uri.parse('$_baseUrl/api/schools/$_schoolId/parents/me/children/attendance')
          .replace(queryParameters: {
        'from': fromStr,
        'to': toStr,
      });
      final res = await http.get(
        url,
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
        _attendanceAll = att;
        // Keep recent list for card and Recent section (latest 5 by date)
        _recentAttendance = att.take(5).toList();
        _pendingExplanations = att
            .where((e) =>
                ((e['explanation'] as Map?)?['status']?.toString() ?? '')
                    .toUpperCase() ==
                'REQUESTED')
            .length;
      });
    } catch (e) {
      setState(() => _error = e.toString());
    } finally {
      setState(() => _loadingAttendance = false);
    }
  }

  Future<void> _loadRemarks() async {
    if (_selectedChild == null) {
      setState(() => _recentRemarks = []);
      return;
    }
    setState(() => _loadingRemarks = true);
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
      setState(() => _recentRemarks = rem.take(5).toList());
    } catch (e) {
      setState(() => _error = e.toString());
    } finally {
      setState(() => _loadingRemarks = false);
    }
  }

  Future<void> _refresh() async => _bootstrap();

  Future<void> _loadLatestPromotion() async {
    if (_selectedChild == null) {
      setState(() => _latestPromotion = null);
      return;
    }
    setState(() => _loadingPromotion = true);
    try {
      final token = await _storage.read(key: 'token');
      final baseUrl = await _storage.read(key: 'baseUrl');
      final schoolId = await _storage.read(key: 'schoolId');
      if (token == null || baseUrl == null || schoolId == null)
        throw Exception('Missing auth or config');
      final res = await http.get(
        Uri.parse(
            '$baseUrl/api/schools/$schoolId/parents/me/children/promotions'),
        headers: {
          'Authorization': 'Bearer $token',
          'Accept': 'application/json'
        },
      );
      if (res.statusCode != 200)
        throw Exception('Failed: ${res.statusCode} ${res.body}');
      final json = jsonDecode(res.body) as Map<String, dynamic>;
      final children = (json['children'] as List?) ?? [];
      final match = children
          .where((c) =>
              c['studentId'].toString() == _selectedChild!['id'].toString())
          .toList();
      if (match.isNotEmpty && (match.first['promotions'] as List).isNotEmpty) {
        final promos = (match.first['promotions'] as List);
        _latestPromotion = promos.last as Map<String, dynamic>?;
      } else {
        _latestPromotion = null;
      }
    } catch (e) {
      _latestPromotion = null;
    } finally {
      setState(() => _loadingPromotion = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final df = DateFormat('EEE, MMM d');
    return Scaffold(
      backgroundColor: Colors.white, // Clean white background
      appBar: AppBar(
        flexibleSpace: const GlassAppBarFlex(),
        title: Text(_schoolName?.isNotEmpty == true ? _schoolName! : 'Home'),
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
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _loading ? null : _refresh,
            tooltip: 'Refresh',
          ),
          PopupMenuButton<String>(
            onSelected: (value) async {
              if (value == 'logout') {
                await _storage.delete(key: 'token');
                await _storage.delete(key: 'schoolId');
                if (!mounted) return;
                Navigator.of(context).pushAndRemoveUntil(
                  MaterialPageRoute(builder: (_) => const LandingPage()),
                  (route) => false,
                );
              }
            },
            itemBuilder: (context) => const [
              PopupMenuItem(value: 'logout', child: Text('Logout')),
            ],
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
                      // Clean header + search (light style)
                      Container(
                        color: Colors.white,
                        padding: const EdgeInsets.fromLTRB(20, 24, 20, 8),
                        child: SafeArea(
                          bottom: false,
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                children: [
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          'Good Morning',
                                          style: TextStyle(
                                            color: Colors.grey[600],
                                            fontSize: 13,
                                            fontWeight: FontWeight.w500,
                                          ),
                                        ),
                                        const SizedBox(height: 4),
                                        Text(
                                          _parentName?.isNotEmpty == true ? _parentName! : 'Parent',
                                          style: const TextStyle(
                                            fontSize: 26,
                                            fontWeight: FontWeight.w800,
                                            color: Color(0xFF0F172A),
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                  // Right-side icons (notification + avatar)
                                  IconButton(
                                    onPressed: (){},
                                    icon: const Icon(Icons.notifications_none),
                                  ),
                                  const SizedBox(width: 4),
                                  CircleAvatar(
                                    radius: 18,
                                    backgroundImage: (_schoolLogoUrl != null && _schoolLogoUrl!.isNotEmpty)
                                        ? NetworkImage(_schoolLogoUrl!)
                                        : null,
                                    child: (_schoolLogoUrl == null || _schoolLogoUrl!.isEmpty)
                                        ? const Icon(Icons.person_outline)
                                        : null,
                                  ),
                                ],
                              ),
                              const SizedBox(height: 16),
                              // Search bar
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                                decoration: BoxDecoration(
                                  color: const Color(0xFFF3F4F6),
                                  borderRadius: BorderRadius.circular(14),
                                  border: Border.all(color: const Color(0xFFE5E7EB)),
                                ),
                                child: Row(
                                  children: [
                                    Icon(Icons.search, color: Colors.grey[600]),
                                    const SizedBox(width: 10),
                                    Expanded(
                                      child: Text(
                                        'Search any thing',
                                        style: TextStyle(color: Colors.grey[600], fontSize: 15),
                                      ),
                                    ),
                                    Icon(Icons.mic_none, color: Colors.grey[600]),
                                  ],
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),

                      // Promotion summary card
                      if (_loadingPromotion)
                        const Padding(
                          padding: EdgeInsets.symmetric(horizontal: 16),
                          child: GlassContainer(
                            padding: EdgeInsets.all(16),
                            child: Center(child: CircularProgressIndicator()),
                          ),
                        )
                      else if (_selectedChild != null)
                        Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 16),
                          child: GlassContainer(
                            padding: const EdgeInsets.all(16),
                            child: _latestPromotion == null
                                ? Row(
                                    children: const [
                                      Icon(Icons.trending_up,
                                          color: Colors.grey),
                                      SizedBox(width: 12),
                                      Expanded(
                                          child: Text(
                                              'No promotion or transfer history for this child.',
                                              style: TextStyle(
                                                  color: Colors.grey))),
                                    ],
                                  )
                                : Row(
                                    children: [
                                      Icon(
                                        _latestPromotion!['type'] == 'PROMOTED'
                                            ? Icons.trending_up
                                            : Icons.swap_horiz,
                                        color: Colors.blueAccent,
                                      ),
                                      const SizedBox(width: 12),
                                      Expanded(
                                        child: Column(
                                          crossAxisAlignment:
                                              CrossAxisAlignment.start,
                                          children: [
                                            Text(
                                              _latestPromotion!['type'] ==
                                                      'PROMOTED'
                                                  ? 'Last promoted'
                                                  : 'Last transferred',
                                              style: const TextStyle(
                                                  fontWeight: FontWeight.bold),
                                            ),
                                            const SizedBox(height: 2),
                                            Text(
                                              '${_latestPromotion!['from']?['academicYear'] ?? ''} • ${_latestPromotion!['from']?['className'] ?? ''} → ${_latestPromotion!['to']?['academicYear'] ?? ''} • ${_latestPromotion!['to']?['className'] ?? ''}',
                                              style: const TextStyle(
                                                  color: Colors.black87),
                                            ),
                                            if (_latestPromotion!['date'] !=
                                                null)
                                              Text(
                                                'On ${_latestPromotion!['date'].toString().substring(0, 10)}',
                                                style: const TextStyle(
                                                    color: Colors.black54,
                                                    fontSize: 12),
                                              ),
                                          ],
                                        ),
                                      ),
                                    ],
                                  ),
                          ),
                        ),
                      // Child selector in glass card
                      Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 16),
                        child: GlassContainer(
                          padding: const EdgeInsets.all(12),
                          child: _ChildSelectorCard(
                            children: _children,
                            selectedChildId: _selectedChild?['id']?.toString(),
                            onChildChanged: (id) {
                              final found = _children.firstWhere(
                                (c) => c['id'].toString() == id,
                                orElse: () => <String, dynamic>{},
                              );
                              setState(() => _selectedChild =
                                  found.isEmpty ? null : found);
                              _loadLatestPromotion();
                              _loadGrades();
                              _loadAttendance();
                              _loadRemarks();
                            },
                          ),
                        ),
                      ),

                      const SizedBox(height: 16),

                      // Icon grid (8 items) like the reference design
                      Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 20),
                        child: GridView.count(
                          shrinkWrap: true,
                          physics: const NeverScrollableScrollPhysics(),
                          crossAxisCount: 4,
                          crossAxisSpacing: 14,
                          mainAxisSpacing: 18,
                          children: [
                            _menuIcon(
                              title: 'Attendance',
                              icon: Icons.menu_book_outlined,
                              color: Colors.blue,
                              onTap: () => _openAttendance(),
                              selected: true,
                            ),
                            _menuIcon(
                              title: 'Classes',
                              icon: Icons.class_outlined,
                              color: Colors.green,
                              onTap: () => _openTimetable(),
                            ),
                            _menuIcon(
                              title: 'Circular',
                              icon: Icons.campaign_outlined,
                              color: Colors.orange,
                              onTap: () => _openMessages(),
                            ),
                            _menuIcon(
                              title: 'Result',
                              icon: Icons.assessment_outlined,
                              color: Colors.purple,
                              onTap: () => _openGrades(),
                            ),
                            _menuIcon(
                              title: 'Behavior',
                              icon: Icons.emoji_emotions_outlined,
                              color: Colors.teal,
                              onTap: () => _openRemarks(),
                            ),
                            _menuIcon(
                              title: 'Fees',
                              icon: Icons.account_balance_wallet_outlined,
                              color: Colors.red,
                              onTap: () => _openFees(),
                            ),
                            _menuIcon(
                              title: 'Library',
                              icon: Icons.local_library_outlined,
                              color: Colors.indigo,
                              onTap: () => _openLibrary(),
                            ),
                            _menuIcon(
                              title: 'Meeting',
                              icon: Icons.video_call_outlined,
                              color: Colors.pink,
                              onTap: () => _openMeetings(),
                            ),
                          ],
                        ),
                      ),

                      const SizedBox(height: 16),

                      // Attendance section (title + action)
                      Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 20),
                        child: Row(
                          children: [
                            const Expanded(
                              child: Text(
                                'Attendance',
                                style: TextStyle(
                                  fontSize: 20,
                                  fontWeight: FontWeight.w700,
                                  color: Color(0xFF0F172A),
                                ),
                              ),
                            ),
                            TextButton(
                              onPressed: _openAttendance,
                              child: const Text('Detailed view >'),
                            )
                          ],
                        ),
                      ),

                      // Today Attendance card
                      Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 20),
                        child: Container(
                          padding: const EdgeInsets.all(16),
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(14),
                            border: Border.all(color: const Color(0xFFE5E7EB)),
                          ),
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  const Text(
                                    'Today Attendance',
                                    style: TextStyle(
                                      fontSize: 16,
                                      fontWeight: FontWeight.w600,
                                    ),
                                  ),
                                  const SizedBox(height: 4),
                                  Text(
                                    _todayCheckInText(),
                                    style: TextStyle(color: Colors.grey[600]),
                                  ),
                                ],
                              ),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                                decoration: BoxDecoration(
                                  color: _todayStatusColor().withOpacity(0.1),
                                  borderRadius: BorderRadius.circular(20),
                                  border: Border.all(color: _todayStatusColor()),
                                ),
                                child: Text(
                                  _todayStatusText(),
                                  style: TextStyle(
                                    color: _todayStatusColor(),
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),

                      const SizedBox(height: 12),

                      // Simple Calendar
                      Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 20),
                        child: _simpleCalendar(_calendarMonth),
                      ),

                      const SizedBox(height: 20),

                      // Recent Grades
                      _SectionHeader(
                        icon: Icons.history,
                        title: 'Recent grades',
                        actionLabel: _selectedChild == null ? null : 'View all',
                        onAction: _selectedChild == null
                            ? null
                            : () {
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
                              },
                      ),
                      const SizedBox(height: 8),
                      if (_loadingGrades)
                        const LinearProgressIndicator(minHeight: 2),
                      if (_recentGrades.isEmpty && !_loadingGrades)
                        Padding(
                          padding: const EdgeInsets.symmetric(vertical: 20),
                          child: Column(
                            children: const [
                              Icon(Icons.school_outlined,
                                  size: 34, color: Colors.black26),
                              SizedBox(height: 6),
                              Text('No grades yet',
                                  style: TextStyle(color: Colors.black54)),
                            ],
                          ),
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
                        return Padding(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 16, vertical: 6),
                          child: GlassContainer(
                            padding: const EdgeInsets.all(12),
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
                                              color: Colors.black54)),
                                    ],
                                  ),
                                ),
                                Container(
                                  padding: const EdgeInsets.symmetric(
                                      horizontal: 10, vertical: 6),
                                  decoration: BoxDecoration(
                                      color: Colors.indigo.shade600,
                                      borderRadius: BorderRadius.circular(999)),
                                  child: Text(marks,
                                      style: const TextStyle(
                                          color: Colors.white,
                                          fontWeight: FontWeight.bold)),
                                ),
                              ],
                            ),
                          ),
                        );
                      }).toList(),

                      const SizedBox(height: 20),

                      // Recent Attendance
                      _SectionHeader(
                        icon: Icons.calendar_month_outlined,
                        title: 'Recent attendance',
                        actionLabel: 'View all',
                        onAction: _selectedChild == null
                            ? null
                            : () {
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
                              },
                      ),
                      const SizedBox(height: 8),
                      if (_loadingAttendance)
                        const LinearProgressIndicator(minHeight: 2),
                      if (_recentAttendance.isEmpty && !_loadingAttendance)
                        Padding(
                          padding: const EdgeInsets.symmetric(vertical: 20),
                          child: Column(
                            children: const [
                              Icon(Icons.event_busy_outlined,
                                  size: 34, color: Colors.black26),
                              SizedBox(height: 6),
                              Text('No attendance yet',
                                  style: TextStyle(color: Colors.black54)),
                            ],
                          ),
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
                        return GestureDetector(
                          onTap: () {
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
                          },
                          child: Padding(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 16, vertical: 6),
                            child: GlassContainer(
                              padding: const EdgeInsets.all(12),
                              child: Row(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  CircleAvatar(
                                    backgroundColor: Colors.teal.shade50,
                                    child: const Icon(
                                        Icons.check_circle_outline,
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
                          ),
                        );
                      }).toList(),

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
                        Padding(
                          padding: const EdgeInsets.symmetric(vertical: 20),
                          child: Column(
                            children: const [
                              Icon(Icons.chat_bubble_outline,
                                  size: 34, color: Colors.black26),
                              SizedBox(height: 6),
                              Text('No remarks yet',
                                  style: TextStyle(color: Colors.black54)),
                            ],
                          ),
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
                        return Padding(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 16, vertical: 6),
                          child: GlassContainer(
                            padding: const EdgeInsets.all(12),
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
                                            if (d != null) df.format(d),
                                          ]
                                              .where((e) =>
                                                  e.toString().isNotEmpty)
                                              .join(' • '),
                                          style: const TextStyle(
                                              color: Colors.black54)),
                                      const SizedBox(height: 6),
                                      Text(comment,
                                          maxLines: 3,
                                          overflow: TextOverflow.ellipsis),
                                    ],
                                  ),
                                ),
                              ],
                            ),
                          ),
                        );
                      }).toList(),

                      const SizedBox(height: 24),
                    ],
                  ),
                ),
    );
  }

  // Helpers
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
      decoration:
          BoxDecoration(color: color, borderRadius: BorderRadius.circular(999)),
      child: Text(label,
          style: const TextStyle(color: Colors.white, fontSize: 12)),
    );
  }

  // New UI helpers
  Widget _menuIcon({
    required String title,
    required IconData icon,
    required Color color,
    required VoidCallback onTap,
    bool selected = false,
  }) {
    final bg = color.withOpacity(0.08);
    return InkWell(
      onTap: _selectedChild == null ? null : onTap,
      borderRadius: BorderRadius.circular(14),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 56,
            height: 56,
            decoration: BoxDecoration(
              color: bg,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: color.withOpacity(0.15)),
            ),
            child: Icon(icon, color: color),
          ),
          const SizedBox(height: 8),
          Text(
            title,
            textAlign: TextAlign.center,
            style: TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w600,
              color: _selectedChild == null
                  ? Colors.grey
                  : const Color(0xFF0F172A),
            ),
          ),
          if (selected) ...[
            const SizedBox(height: 6),
            Container(
              width: 20,
              height: 4,
              decoration: BoxDecoration(
                color: Colors.blue,
                borderRadius: BorderRadius.circular(999),
              ),
            ),
          ],
        ],
      ),
    );
  }

  void _openGrades() {
    if (_selectedChild == null) return;
    final name =
        '${_selectedChild?['firstName'] ?? ''} ${_selectedChild?['lastName'] ?? ''}'
            .trim();
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => GradesPage(
          studentId: _selectedChild!['id'].toString(),
          studentName: name.isEmpty ? 'Student' : name,
        ),
      ),
    );
  }

  void _openAttendance() {
    if (_selectedChild == null) return;
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

  void _openTimetable() {
    if (_selectedChild == null) return;
    final name =
        '${_selectedChild?['firstName'] ?? ''} ${_selectedChild?['lastName'] ?? ''}'
            .trim();
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => TimetablePage(
          studentId: _selectedChild!['id'].toString(),
          studentName: name.isEmpty ? 'Student' : name,
        ),
      ),
    );
  }

  void _openMessages() {
    Navigator.of(context).push(
      MaterialPageRoute(builder: (_) => const MessagesPage()),
    );
  }

  void _openFees() {
    if (_selectedChild == null) return;
    final name = '${_selectedChild?['firstName'] ?? ''} ${_selectedChild?['lastName'] ?? ''}'.trim();
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => FeesPage(
          studentId: _selectedChild!['id'].toString(),
          studentName: name.isEmpty ? 'Student' : name,
        ),
      ),
    );
  }

  void _openLibrary() {
    if (_selectedChild == null) return;
    final name = '${_selectedChild?['firstName'] ?? ''} ${_selectedChild?['lastName'] ?? ''}'.trim();
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => LibraryLoansPage(
          studentId: _selectedChild!['id'].toString(),
          studentName: name.isEmpty ? 'Student' : name,
        ),
      ),
    );
  }

  void _openRemarks() {
    if (_selectedChild == null) return;
    final name = '${_selectedChild?['firstName'] ?? ''} ${_selectedChild?['lastName'] ?? ''}'.trim();
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => RemarksPage(
          studentId: _selectedChild!['id'].toString(),
          studentName: name.isEmpty ? 'Student' : name,
        ),
      ),
    );
  }

  void _openMeetings() {
    Navigator.of(context).push(
      MaterialPageRoute(builder: (_) => const MeetingsPage()),
    );
  }

  void _comingSoon(String feature) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text('$feature is coming soon')),
    );
  }

  String _todayCheckInText() {
    // Find today's attendance for the selected child
    if (_recentAttendance.isEmpty) return 'No record for today';
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);
    Map<String, dynamic>? todayEntry;
    for (final a in _recentAttendance) {
      final ds = a['date']?.toString();
      if (ds == null) continue;
      final d = DateTime.tryParse(ds);
      if (d == null) continue;
      final dd = DateTime(d.year, d.month, d.day);
      if (dd == today) {
        todayEntry = a;
        break;
      }
    }
    if (todayEntry == null) return 'No record for today';
    final checkIn = todayEntry['checkInTime'] ?? todayEntry['checkIn'] ?? todayEntry['in'];
    if (checkIn is String && checkIn.isNotEmpty) {
      return 'Check in: $checkIn';
    }
    return 'Check in: —';
  }

  String _todayStatusText() {
    if (_recentAttendance.isEmpty) return '—';
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);
    for (final a in _recentAttendance) {
      final ds = a['date']?.toString();
      if (ds == null) continue;
      final d = DateTime.tryParse(ds);
      if (d == null) continue;
      final dd = DateTime(d.year, d.month, d.day);
      if (dd == today) {
        final s = (a['status']?.toString() ?? '').toUpperCase();
        switch (s) {
          case 'PRESENT':
            return 'Present';
          case 'ABSENT':
            return 'Absent';
          case 'LATE':
            return 'Late';
          case 'EXCUSED':
            return 'Excused';
          default:
            return '—';
        }
      }
    }
    return '—';
  }

  Color _todayStatusColor() {
    final s = _todayStatusText();
    return _statusColor(s);
  }

  String _dayStatus(DateTime date) {
    // Return PRESENT, ABSENT, LATE, EXCUSED or '' if none for that date
    for (final a in _attendanceAll) {
      final ds = a['date']?.toString();
      if (ds == null) continue;
      final d = DateTime.tryParse(ds);
      if (d == null) continue;
      if (d.year == date.year && d.month == date.month && d.day == date.day) {
        return (a['status']?.toString() ?? '').toUpperCase();
      }
    }
    return '';
  }

  Color _statusDotColor(String status) {
    switch (status) {
      case 'PRESENT':
        return Colors.green;
      case 'ABSENT':
        return Colors.red;
      case 'LATE':
        return Colors.orange;
      case 'EXCUSED':
        return Colors.blueGrey;
      default:
        return Colors.transparent;
    }
  }

  Widget _simpleCalendar(DateTime anchorMonth) {
    final year = anchorMonth.year;
    final month = anchorMonth.month;
    final first = DateTime(year, month, 1);
    final nextMonth = DateTime(year, month + 1, 1);
    final lastDay = nextMonth.subtract(const Duration(days: 1)).day;
    final firstWeekday = first.weekday; // 1=Mon .. 7=Sun

    // Weekday labels Mon..Sun
    const weekNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    final cells = <Widget>[];
    // Leading blanks (firstWeekday-1)
    for (int i = 0; i < firstWeekday - 1; i++) {
      cells.add(const SizedBox());
    }
    final today = DateTime.now();
    for (int day = 1; day <= lastDay; day++) {
      final date = DateTime(year, month, day);
      final isToday = today.year == year && today.month == month && today.day == day;
      final wd = date.weekday; // 6=Sat,7=Sun
      final isWeekend = wd == 6 || wd == 7;
      final textColor = isToday
          ? Colors.white
          : isWeekend
              ? Colors.grey[500]
              : const Color(0xFF0F172A);
      final bgColor = isToday ? Colors.blue : Colors.transparent;
      final status = _dayStatus(date);
      final dotColor = _statusDotColor(status);
      cells.add(
        Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 36,
                height: 36,
                decoration: BoxDecoration(
                  color: bgColor,
                  borderRadius: BorderRadius.circular(999),
                ),
                alignment: Alignment.center,
                child: Text(
                  '$day',
                  style: TextStyle(fontWeight: FontWeight.w600, color: textColor),
                ),
              ),
              const SizedBox(height: 4),
              Container(
                width: 6,
                height: 6,
                decoration: BoxDecoration(
                  color: dotColor,
                  borderRadius: BorderRadius.circular(999),
                ),
              ),
            ],
          ),
        ),
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              DateFormat('MMMM yyyy').format(anchorMonth),
              style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700),
            ),
            Row(
              children: [
                IconButton(
                  onPressed: () {
                    setState(() {
                      _calendarMonth = DateTime(
                        anchorMonth.year,
                        anchorMonth.month - 1,
                        1,
                      );
                    });
                    // Refresh attendance for the new month
                    _loadAttendance();
                  },
                  icon: const Icon(Icons.chevron_left, color: Colors.grey),
                ),
                IconButton(
                  onPressed: () {
                    setState(() {
                      _calendarMonth = DateTime(
                        anchorMonth.year,
                        anchorMonth.month + 1,
                        1,
                      );
                    });
                    // Refresh attendance for the new month
                    _loadAttendance();
                  },
                  icon: const Icon(Icons.chevron_right, color: Colors.grey),
                ),
              ],
            )
          ],
        ),
        const SizedBox(height: 10),
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: weekNames
              .map((w) => Expanded(
                    child: Center(
                      child: Text(
                        w,
                        style: const TextStyle(
                            fontSize: 12, color: Color(0xFF6B7280)),
                      ),
                    ),
                  ))
              .toList(),
        ),
        const SizedBox(height: 8),
        GridView.count(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          crossAxisCount: 7,
          children: [
            ...List.generate(firstWeekday - 1, (_) => const SizedBox()),
            ...cells,
          ],
        ),
        const SizedBox(height: 8),
        Row(
          children: [
            _legendDot(Colors.green, 'Present'),
            const SizedBox(width: 12),
            _legendDot(Colors.red, 'Absent'),
            const SizedBox(width: 12),
            _legendDot(Colors.orange, 'Late'),
            const SizedBox(width: 12),
            _legendDot(Colors.blueGrey, 'Excused'),
          ],
        )
      ],
    );
  }

  Widget _legendDot(Color color, String label) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: 8,
          height: 8,
          decoration: BoxDecoration(
            color: color,
            borderRadius: BorderRadius.circular(999),
          ),
        ),
        const SizedBox(width: 6),
        Text(label, style: const TextStyle(fontSize: 12, color: Color(0xFF6B7280))),
      ],
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
                            borderRadius: BorderRadius.all(Radius.circular(10)),
                          ),
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
                  style: const TextStyle(fontWeight: FontWeight.w600))),
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
    return Row(
      children: [
        Container(
          padding: const EdgeInsets.all(8),
          decoration: BoxDecoration(
              color: Colors.indigo.withOpacity(0.08),
              borderRadius: BorderRadius.circular(10)),
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
    );
  }
}

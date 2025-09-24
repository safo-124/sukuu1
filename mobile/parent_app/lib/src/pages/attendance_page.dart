import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:http/http.dart' as http;
import 'package:intl/intl.dart';
import 'package:fl_chart/fl_chart.dart';
import '../api/parents_api.dart';

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

  // Date filter state
  String _dateFilter = 'ALL'; // ALL, 30D, 90D, THIS_MONTH, CUSTOM
  DateTimeRange? _customRange;

  // Calendar view state
  bool _calendarView = false;
  DateTime _currentMonth = DateTime(DateTime.now().year, DateTime.now().month);

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

  DateTime? _parseDate(Map<String, dynamic> e) {
    final dateStr = e['date']?.toString();
    if (dateStr == null || dateStr.isEmpty) return null;
    return DateTime.tryParse(dateStr);
  }

  bool _inDateFilter(DateTime d) {
    final now = DateTime.now();
    switch (_dateFilter) {
      case '30D':
        return d.isAfter(now.subtract(const Duration(days: 30)));
      case '90D':
        return d.isAfter(now.subtract(const Duration(days: 90)));
      case 'THIS_MONTH':
        return d.year == now.year && d.month == now.month;
      case 'CUSTOM':
        if (_customRange == null) return true;
        final start = DateTime(_customRange!.start.year,
            _customRange!.start.month, _customRange!.start.day);
        final end = DateTime(_customRange!.end.year, _customRange!.end.month,
            _customRange!.end.day, 23, 59, 59);
        return !d.isBefore(start) && !d.isAfter(end);
      case 'ALL':
      default:
        return true;
    }
  }

  List<Map<String, dynamic>> get _filteredItems {
    return _items.where((e) {
      final statusOk = _filter == 'ALL' ||
          (e['status']?.toString() ?? '').toUpperCase() == _filter;
      final d = _parseDate(e);
      final dateOk = d == null ? true : _inDateFilter(d);
      return statusOk && dateOk;
    }).toList();
  }

  Map<String, int> get _statusCounts {
    final out = {'PRESENT': 0, 'ABSENT': 0, 'LATE': 0, 'EXCUSED': 0};
    for (final e in _filteredItems) {
      final s = (e['status']?.toString() ?? '').toUpperCase();
      if (out.containsKey(s)) out[s] = out[s]! + 1;
    }
    return out;
  }

  double get _attendanceRate {
    final total = _filteredItems.length;
    if (total == 0) return 0;
    final present = _statusCounts['PRESENT'] ?? 0;
    return (present / total) * 100.0;
  }

  int get _maxAbsentStreak {
    // Assumes _items are sorted desc by date in _load; we'll re-sort asc here.
    final list = [..._filteredItems];
    list.sort((a, b) {
      final da = _parseDate(a) ?? DateTime.fromMillisecondsSinceEpoch(0);
      final db = _parseDate(b) ?? DateTime.fromMillisecondsSinceEpoch(0);
      return da.compareTo(db);
    });
    int maxStreak = 0;
    int cur = 0;
    for (final e in list) {
      final s = (e['status']?.toString() ?? '').toUpperCase();
      if (s == 'ABSENT') {
        cur += 1;
        if (cur > maxStreak) maxStreak = cur;
      } else {
        cur = 0;
      }
    }
    return maxStreak;
  }

  Map<String, double> get _monthlyPresentRate {
    // Key: yyyy-MM, value: percent present in that month for filtered range
    final Map<String, int> totalByMonth = {};
    final Map<String, int> presentByMonth = {};
    for (final e in _filteredItems) {
      final d = _parseDate(e);
      if (d == null) continue;
      final key =
          '${d.year.toString().padLeft(4, '0')}-${d.month.toString().padLeft(2, '0')}';
      totalByMonth[key] = (totalByMonth[key] ?? 0) + 1;
      if ((e['status']?.toString() ?? '').toUpperCase() == 'PRESENT') {
        presentByMonth[key] = (presentByMonth[key] ?? 0) + 1;
      }
    }
    final Map<String, double> rate = {};
    for (final key in totalByMonth.keys) {
      final t = totalByMonth[key] ?? 0;
      final p = presentByMonth[key] ?? 0;
      rate[key] = t == 0 ? 0 : (p / t) * 100.0;
    }
    final sortedKeys = rate.keys.toList()..sort((a, b) => a.compareTo(b));
    // Keep recent 6-12 months depending on data size
    final maxKeep = 12;
    final start = sortedKeys.length > maxKeep ? sortedKeys.length - maxKeep : 0;
    final sel = sortedKeys.sublist(start);
    return {for (final k in sel) k: rate[k] ?? 0.0};
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
                      // View toggle
                      Padding(
                        padding: const EdgeInsets.fromLTRB(12, 10, 12, 0),
                        child: Row(
                          children: [
                            const Text('View:'),
                            const SizedBox(width: 8),
                            ChoiceChip(
                              label: const Text('List'),
                              selected: !_calendarView,
                              onSelected: (_) =>
                                  setState(() => _calendarView = false),
                            ),
                            const SizedBox(width: 8),
                            ChoiceChip(
                              label: const Text('Calendar'),
                              selected: _calendarView,
                              onSelected: (_) =>
                                  setState(() => _calendarView = true),
                            ),
                          ],
                        ),
                      ),
                      // (duplicate view toggle removed)
                      // Status filter row
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
                      // Date filter row
                      SizedBox(
                        height: 48,
                        child: ListView(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 12, vertical: 8),
                          scrollDirection: Axis.horizontal,
                          children: [
                            _FilterChip(
                              label: 'All time',
                              selected: _dateFilter == 'ALL',
                              onTap: () => setState(() => _dateFilter = 'ALL'),
                            ),
                            _FilterChip(
                              label: 'Last 30 days',
                              selected: _dateFilter == '30D',
                              onTap: () => setState(() => _dateFilter = '30D'),
                            ),
                            _FilterChip(
                              label: 'Last 90 days',
                              selected: _dateFilter == '90D',
                              onTap: () => setState(() => _dateFilter = '90D'),
                            ),
                            _FilterChip(
                              label: 'This month',
                              selected: _dateFilter == 'THIS_MONTH',
                              onTap: () =>
                                  setState(() => _dateFilter = 'THIS_MONTH'),
                            ),
                            Padding(
                              padding: const EdgeInsets.only(right: 8),
                              child: ChoiceChip(
                                label: Text(
                                  _dateFilter == 'CUSTOM' && _customRange != null
                                      ? '${DateFormat('MMM d').format(_customRange!.start)} – ${DateFormat('MMM d').format(_customRange!.end)}'
                                      : 'Custom range',
                                ),
                                selected: _dateFilter == 'CUSTOM',
                                onSelected: (sel) async {
                                  final now = DateTime.now();
                                  final picked = await showDateRangePicker(
                                    context: context,
                                    firstDate: DateTime(now.year - 5),
                                    lastDate: DateTime(now.year + 1),
                                    initialDateRange: _customRange ??
                                        DateTimeRange(
                                          start:
                                              now.subtract(const Duration(days: 7)),
                                          end: now,
                                        ),
                                  );
                                  if (picked != null) {
                                    setState(() {
                                      _customRange = picked;
                                      _dateFilter = 'CUSTOM';
                                    });
                                  }
                                },
                              ),
                            ),
                          ],
                        ),
                      ),

                      // Summary stats
                      Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 12),
                        child: Card(
                          child: Padding(
                            padding: const EdgeInsets.all(12.0),
                            child: Wrap(
                              runSpacing: 8,
                              children: [
                                _StatPill(
                                    label: 'Attendance',
                                    value:
                                        '${_attendanceRate.toStringAsFixed(1)}%'),
                                _StatPill(
                                    label: 'Present',
                                    value: (_statusCounts['PRESENT'] ?? 0)
                                        .toString(),
                                    icon: Icons.check_circle),
                                _StatPill(
                                    label: 'Absent',
                                    value: (_statusCounts['ABSENT'] ?? 0)
                                        .toString(),
                                    icon: Icons.cancel),
                                _StatPill(
                                    label: 'Late',
                                    value:
                                        (_statusCounts['LATE'] ?? 0).toString(),
                                    icon: Icons.access_time),
                                _StatPill(
                                    label: 'Excused',
                                    value: (_statusCounts['EXCUSED'] ?? 0)
                                        .toString(),
                                    icon: Icons.assignment_turned_in),
                              ],
                            ),
                          ),
                        ),
                      ),

                      // Risk banner
                      if (_filteredItems.isNotEmpty &&
                          (_attendanceRate < 90 || _maxAbsentStreak >= 3))
                        Padding(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 12, vertical: 6),
                          child: Card(
                            color: Theme.of(context)
                                .colorScheme
                                .error
                                .withOpacity(0.06),
                            shape: RoundedRectangleBorder(
                                side: BorderSide(
                                    color: Theme.of(context)
                                        .colorScheme
                                        .error
                                        .withOpacity(0.28)),
                                borderRadius: BorderRadius.circular(8)),
                            child: Padding(
                              padding: const EdgeInsets.all(12.0),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  const Text('Attendance alert',
                                      style: TextStyle(fontWeight: FontWeight.w600)),
                                  const SizedBox(height: 6),
                                  Wrap(
                                    spacing: 8,
                                    runSpacing: 6,
                                    children: [
                                      if (_attendanceRate < 90)
                                        _badge('Rate ${_attendanceRate.toStringAsFixed(1)}%',
                                            Theme.of(context)
                                                .colorScheme
                                                .error),
                                      if (_maxAbsentStreak >= 3)
                                        _badge('Absent ${_maxAbsentStreak} days in a row',
                                            Theme.of(context)
                                                .colorScheme
                                                .error),
                                    ],
                                  ),
                                  const SizedBox(height: 6),
                                  const Text(
                                      'Tip: consistent attendance strongly supports learning. If there are challenges, consider messaging the class teacher.'),
                                  const SizedBox(height: 8),
                                  Align(
                                    alignment: Alignment.centerRight,
                                    child: TextButton.icon(
                                      onPressed: _openMessageTeacherDialog,
                                      icon: const Icon(Icons.mail_outline),
                                      label: const Text('Message teacher'),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ),

                      // Monthly trend chart
                      if (_monthlyPresentRate.isNotEmpty)
                        Padding(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 12, vertical: 6),
                          child: Card(
                            child: Padding(
                              padding: const EdgeInsets.all(12.0),
                              child: SizedBox(
                                height: 180,
                                child: BarChart(
                                  BarChartData(
                                    barTouchData: BarTouchData(
                                      enabled: true,
                                      touchTooltipData: BarTouchTooltipData(
                                        tooltipBgColor: Colors.black87,
                                        getTooltipItem:
                                            (group, groupIndex, rod, rodIndex) {
                                          final key = _monthlyPresentRate.keys
                                              .elementAt(group.x.toInt());
                                          final rate =
                                              _monthlyPresentRate[key] ?? 0.0;
                                          return BarTooltipItem(
                                              '$key\n${rate.toStringAsFixed(1)}%',
                                              const TextStyle(
                                                  color: Colors.white));
                                        },
                                      ),
                                    ),
                                    gridData: FlGridData(
                                        show: true, horizontalInterval: 25),
                                    borderData: FlBorderData(show: false),
                                    titlesData: FlTitlesData(
                                      leftTitles: const AxisTitles(
                                          sideTitles: SideTitles(
                                              showTitles: true,
                                              reservedSize: 30)),
                                      bottomTitles: AxisTitles(
                                        sideTitles: SideTitles(
                                          showTitles: true,
                                          getTitlesWidget: (value, _) {
                                            final i = value.toInt();
                                            if (i < 0 ||
                                                i >= _monthlyPresentRate.length)
                                              return const SizedBox.shrink();
                                            final key = _monthlyPresentRate.keys
                                                .elementAt(i);
                                            return Padding(
                                              padding: const EdgeInsets.only(
                                                  top: 4.0),
                                              child: Text(key.substring(5),
                                                  style: const TextStyle(
                                                      fontSize: 10)),
                                            );
                                          },
                                        ),
                                      ),
                                      topTitles: const AxisTitles(
                                          sideTitles:
                                              SideTitles(showTitles: false)),
                                      rightTitles: const AxisTitles(
                                          sideTitles:
                                              SideTitles(showTitles: false)),
                                    ),
                                    barGroups: [
                                      for (int i = 0;
                                          i < _monthlyPresentRate.length;
                                          i++)
                                        BarChartGroupData(x: i, barRods: [
                                          BarChartRodData(
                                            toY: _monthlyPresentRate.values
                                                .elementAt(i),
                                            width: 14,
                                            borderRadius:
                                                BorderRadius.circular(4),
                                            color: Theme.of(context)
                                                .colorScheme
                                                .primary,
                                          )
                                        ])
                                    ],
                                    maxY: 100,
                                  ),
                                ),
                              ),
                            ),
                          ),
                        ),
                      Expanded(
                        child: _calendarView
                            ? SingleChildScrollView(
                                physics: const AlwaysScrollableScrollPhysics(),
                                child: Padding(
                                  padding: const EdgeInsets.symmetric(
                                      horizontal: 12, vertical: 6),
                                  child: Column(
                                    children: [
                                      _monthHeader(),
                                      const SizedBox(height: 8),
                                      _calendarCard(),
                                      const SizedBox(height: 12),
                                      _legendRow(),
                                      const SizedBox(height: 24),
                                    ],
                                  ),
                                ),
                              )
                            : ListView.builder(
                                physics: const AlwaysScrollableScrollPhysics(),
                                itemCount: _filteredItems.length,
                                itemBuilder: (context, i) {
                                  final a = _filteredItems[i];
                                  final dateStr = a['date']?.toString();
                                  final d =
                                      dateStr != null && dateStr.isNotEmpty
                                          ? DateTime.tryParse(dateStr)
                                          : null;
                                  final status = a['status']?.toString() ?? '-';
                                  final remarks =
                                      a['remarks']?.toString() ?? '';
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
                                      leading: _statusIcon(status),
                                      title: Text(status),
                                      subtitle: Column(
                                        crossAxisAlignment:
                                            CrossAxisAlignment.start,
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

  // Messaging helper
  Future<void> _openMessageTeacherDialog() async {
    final titleController = TextEditingController(
        text: 'Attendance concern for ${widget.studentName}');
    final bodyController = TextEditingController();
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Message teacher'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
              controller: titleController,
              decoration: const InputDecoration(labelText: 'Title'),
            ),
            const SizedBox(height: 8),
            TextField(
              controller: bodyController,
              maxLines: 5,
              decoration: const InputDecoration(labelText: 'Message'),
            ),
          ],
        ),
        actions: [
          TextButton(
              onPressed: () => Navigator.of(ctx).pop(false),
              child: const Text('Cancel')),
          FilledButton(
              onPressed: () => Navigator.of(ctx).pop(true),
              child: const Text('Send')),
        ],
      ),
    );
    if (ok == true) {
      try {
        if (_token == null || _baseUrl == null || _schoolId == null)
          throw Exception('Missing credentials');
        final api = ParentsApiClient(
            baseUrl: _baseUrl!, token: _token!, schoolId: _schoolId!);
        await api.sendMessageToTeacher(
          studentId: widget.studentId,
          title: titleController.text.trim().isEmpty
              ? 'Attendance concern'
              : titleController.text.trim(),
          content: bodyController.text.trim(),
        );
        _showSnack('Message sent');
      } catch (e) {
        _showSnack('Failed to send message: $e', false);
      }
    }
  }

  // Calendar helpers
  Widget _monthHeader() {
    // Use _currentMonth in the UI so it's not flagged as unused
    return Row(
      children: [
        IconButton(
          onPressed: () => setState(() {
            final m = DateTime(_currentMonth.year, _currentMonth.month - 1, 1);
            _currentMonth = DateTime(m.year, m.month);
          }),
          icon: const Icon(Icons.chevron_left),
        ),
        Expanded(
          child: Center(
            child: Text(DateFormat('MMMM yyyy').format(_currentMonth),
                style: const TextStyle(fontWeight: FontWeight.w600)),
          ),
        ),
        IconButton(
          onPressed: () => setState(() {
            final m = DateTime(_currentMonth.year, _currentMonth.month + 1, 1);
            _currentMonth = DateTime(m.year, m.month);
          }),
          icon: const Icon(Icons.chevron_right),
        ),
      ],
    );
  }

  Widget _calendarCard() {
    final dates = _monthGridDates(_currentMonth);
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(12.0),
        child: Column(
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: const [
                Expanded(child: Center(child: Text('Mon'))),
                Expanded(child: Center(child: Text('Tue'))),
                Expanded(child: Center(child: Text('Wed'))),
                Expanded(child: Center(child: Text('Thu'))),
                Expanded(child: Center(child: Text('Fri'))),
                Expanded(child: Center(child: Text('Sat'))),
                Expanded(child: Center(child: Text('Sun'))),
              ],
            ),
            const SizedBox(height: 8),
            GridView.builder(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                  crossAxisCount: 7, mainAxisSpacing: 6, crossAxisSpacing: 6),
              itemCount: dates.length,
              itemBuilder: (context, i) {
                final day = dates[i];
                if (day == null) return const SizedBox.shrink();
                final isOutMonth = day.month != _currentMonth.month;
                final entries = _entriesForDay(day);
                final statusColor = _dayStatusColor(entries);
                return InkWell(
                  borderRadius: BorderRadius.circular(8),
                  onTap: entries.isEmpty
                      ? null
                      : () => _openDayDetails(day, entries),
                  child: Container(
                    decoration: BoxDecoration(
                      color: statusColor?.withOpacity(0.08),
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(
                          color: (statusColor ??
                                  Theme.of(context).colorScheme.outline)
                              .withOpacity(0.28)),
                    ),
                    padding: const EdgeInsets.all(6),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('${day.day}',
                            style: TextStyle(
                                color: isOutMonth
                                    ? Theme.of(context)
                                        .colorScheme
                                        .outline
                                    : Theme.of(context)
                                        .colorScheme
                                        .onSurface)),
                        const Spacer(),
                        if (entries.isNotEmpty)
                          Align(
                            alignment: Alignment.bottomRight,
                            child: _statusDot(statusColor ??
                                Theme.of(context).colorScheme.outline),
                          ),
                      ],
                    ),
                  ),
                );
              },
            ),
          ],
        ),
      ),
    );
  }

  List<Map<String, dynamic>> _entriesForDay(DateTime day) {
    return _items.where((e) {
      final d = _parseDate(e);
      if (d == null) return false;
      return d.year == day.year && d.month == day.month && d.day == day.day;
    }).toList();
  }

  Color? _dayStatusColor(List<Map<String, dynamic>> entries) {
    if (entries.isEmpty) return null;
    // Severity order: ABSENT > LATE > EXCUSED > PRESENT
    int severity(String s) {
      switch (s.toUpperCase()) {
        case 'ABSENT':
          return 4;
        case 'LATE':
          return 3;
        case 'EXCUSED':
          return 2;
        case 'PRESENT':
          return 1;
        default:
          return 0;
      }
    }

    String worst = 'PRESENT';
    for (final e in entries) {
      final s = (e['status']?.toString() ?? '');
      if (severity(s) > severity(worst)) worst = s;
    }
    final scheme = Theme.of(context).colorScheme;
    switch (worst.toUpperCase()) {
      case 'ABSENT':
        return scheme.error;
      case 'LATE':
        return scheme.tertiary;
      case 'EXCUSED':
        return scheme.secondary;
      case 'PRESENT':
        return scheme.primary;
      default:
        return Colors.grey;
    }
  }

  Widget _statusDot(Color color) {
    return Container(
      width: 10,
      height: 10,
      decoration: BoxDecoration(color: color, shape: BoxShape.circle),
    );
  }

  List<DateTime?> _monthGridDates(DateTime month) {
    final first = DateTime(month.year, month.month, 1);
    // Week starts Monday (1) to Sunday (7)
    final startWeekday = first.weekday; // 1..7
    final daysInMonth = DateTime(month.year, month.month + 1, 0).day;
    final List<DateTime?> out = [];
    // Leading blanks: if first is Monday, 0 blanks; else (weekday - 1)
    for (int i = 1; i < startWeekday; i++) {
      out.add(null);
    }
    // Month days
    for (int d = 1; d <= daysInMonth; d++) {
      out.add(DateTime(month.year, month.month, d));
    }
    // Trailing to complete rows to multiple of 7
    while (out.length % 7 != 0) {
      out.add(null);
    }
    return out;
  }

  void _openDayDetails(DateTime day, List<Map<String, dynamic>> entries) {
    showModalBottomSheet(
      context: context,
      showDragHandle: true,
      builder: (ctx) {
        return Padding(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(DateFormat('EEEE, MMM d').format(day),
                  style: const TextStyle(fontWeight: FontWeight.w600)),
              const SizedBox(height: 8),
              ...entries.map((a) {
                final status = (a['status']?.toString() ?? '-');
                final remarks = (a['remarks']?.toString() ?? '');
                final explanation = a['explanation'] as Map<String, dynamic>?;
                final explStatus =
                    (explanation?['status']?.toString() ?? '').toUpperCase();
                final canExplain = status.toUpperCase() == 'ABSENT' &&
                    (explanation == null || (explStatus != 'ANSWERED'));
                return Card(
                  margin: const EdgeInsets.symmetric(vertical: 6),
                  child: ListTile(
                    leading: _statusIcon(status),
                    title: Text(status),
                    subtitle: Text(remarks),
                    trailing: canExplain
                        ? TextButton(
                            onPressed: () => _openExplainDialog(a),
                            child: const Text('Explain'))
                        : (explanation != null
                            ? TextButton(
                                onPressed: () => _openExplainDialog(a,
                                    initialText:
                                        (explanation['responseText'] ?? '')
                                            .toString()),
                                child: const Text('Edit'),
                              )
                            : null),
                  ),
                );
              }),
              const SizedBox(height: 8),
            ],
          ),
        );
      },
    );
  }

  Widget _legendRow() {
    return Wrap(
      spacing: 8,
      runSpacing: 6,
      children: [
        _LegendItem(
            color: Theme.of(context).colorScheme.primary, label: 'Present'),
        _LegendItem(
            color: Theme.of(context).colorScheme.error, label: 'Absent'),
        _LegendItem(
            color: Theme.of(context).colorScheme.tertiary, label: 'Late'),
        _LegendItem(
            color: Theme.of(context).colorScheme.secondary, label: 'Excused'),
      ],
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
        bg = Theme.of(context).colorScheme.tertiary;
        label = 'Explanation Requested';
        break;
      case 'ANSWERED':
        bg = Theme.of(context).colorScheme.primary;
        label = 'Explanation Answered';
        break;
      default:
        bg = Theme.of(context).colorScheme.outlineVariant;
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
        backgroundColor: success
            ? Theme.of(context).colorScheme.primary
            : Theme.of(context).colorScheme.error,
        behavior: SnackBarBehavior.floating,
      ),
    );
  }

  // UI helpers
  Widget _statusIcon(String status) {
    final scheme = Theme.of(context).colorScheme;
    switch (status.toUpperCase()) {
      case 'PRESENT':
        return CircleAvatar(
          backgroundColor: scheme.primary.withOpacity(0.12),
          child:
              Icon(Icons.check_circle_outline, color: scheme.primary),
        );
      case 'ABSENT':
        return CircleAvatar(
          backgroundColor: scheme.error.withOpacity(0.12),
          child: Icon(Icons.cancel_outlined, color: scheme.error),
        );
      case 'LATE':
        return CircleAvatar(
          backgroundColor: scheme.tertiary.withOpacity(0.12),
          child: Icon(Icons.access_time, color: scheme.tertiary),
        );
      case 'EXCUSED':
        return CircleAvatar(
          backgroundColor: scheme.secondary.withOpacity(0.12),
          child:
              Icon(Icons.assignment_turned_in, color: scheme.secondary),
        );
      default:
        return CircleAvatar(
          backgroundColor: Colors.grey.shade200,
          child: const Icon(Icons.help_outline, color: Colors.grey),
        );
    }
  }
}

class _StatPill extends StatelessWidget {
  final String label;
  final String value;
  final IconData? icon;
  const _StatPill({required this.label, required this.value, this.icon});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.primary.withOpacity(0.08),
        borderRadius: BorderRadius.circular(10),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (icon != null) ...[
            Icon(icon, size: 14, color: Theme.of(context).colorScheme.primary),
            const SizedBox(width: 6),
          ],
          Text(label,
              style: TextStyle(
                  color: Theme.of(context).colorScheme.primary, fontSize: 12)),
          const SizedBox(width: 6),
          Text(value,
              style: TextStyle(
                  color: Theme.of(context).colorScheme.primary,
                  fontWeight: FontWeight.w600)),
        ],
      ),
    );
  }
}

Widget _badge(String text, Color color) {
  return Container(
    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
    decoration: BoxDecoration(
      color: color.withOpacity(0.08),
      borderRadius: BorderRadius.circular(10),
      border: Border.all(color: color.withOpacity(0.4)),
    ),
    child: Text(text, style: TextStyle(color: color, fontSize: 12)),
  );
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

class _LegendItem extends StatelessWidget {
  final Color color;
  final String label;
  const _LegendItem({required this.color, required this.label});

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
            width: 10,
            height: 10,
            decoration: BoxDecoration(color: color, shape: BoxShape.circle)),
        const SizedBox(width: 6),
        Text(label, style: const TextStyle(fontSize: 12)),
      ],
    );
  }
}

import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:http/http.dart' as http;
import 'package:intl/intl.dart';
import 'package:url_launcher/url_launcher.dart';

class MeetingsPage extends StatefulWidget {
  final bool showTitle;
  const MeetingsPage({super.key, this.showTitle = true});

  @override
  State<MeetingsPage> createState() => _MeetingsPageState();
}

class _MeetingsPageState extends State<MeetingsPage> {
  final _storage = const FlutterSecureStorage();
  bool _loading = true;
  String? _error;
  String? _baseUrl;
  String? _token;
  String? _schoolId;
  // Month-based calendar state
  DateTime _calendarMonth =
      DateTime(DateTime.now().year, DateTime.now().month, 1);
  DateTime _selectedDate = DateTime(
      DateTime.now().year, DateTime.now().month, DateTime.now().day);
  // Index events by yyyy-mm-dd for quick day lookups
  final Map<String, List<Map<String, dynamic>>> _eventsByDate = {};

  final _dtf = DateFormat('EEE, MMM d • h:mm a');
  final _dayFmt = DateFormat('yyyy-MM-dd');

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
      await _fetchMonthEvents();
    } catch (e) {
      setState(() => _error = e.toString());
    } finally {
      setState(() => _loading = false);
    }
  }

  Future<void> _fetchMonthEvents() async {
    // Compute month window [first..last]
    final ym = _calendarMonth;
    final first = DateTime(ym.year, ym.month, 1);
    final last = DateTime(ym.year, ym.month + 1, 0);
    final qp = {
      'from': _dayFmt.format(first),
      'to': _dayFmt.format(last),
      'limit': '500',
    };
    final url = Uri.parse(
            '$_baseUrl/api/schools/$_schoolId/parents/me/events')
        .replace(queryParameters: qp);
    final res = await http.get(url, headers: {
      'Authorization': 'Bearer $_token',
      'Accept': 'application/json',
    });
    if (res.statusCode != 200) {
      throw Exception('Failed to load events (${res.statusCode})');
    }
  final json = jsonDecode(res.body) as Map<String, dynamic>;
  final items = (json['events'] as List? ?? [])
        .cast<Map<String, dynamic>>();
    // Rebuild indices
    _eventsByDate.clear();
    for (final e in items) {
      final startStr = e['startDate']?.toString();
      final endStr = e['endDate']?.toString();
      final start = startStr != null ? DateTime.tryParse(startStr) : null;
      final end = endStr != null ? DateTime.tryParse(endStr) : null;
      if (start == null) continue;
      final sDate = DateTime(start.year, start.month, start.day);
      final eDate = end != null
          ? DateTime(end.year, end.month, end.day)
          : sDate;
      DateTime cur = sDate;
      while (!cur.isAfter(eDate)) {
        final key = _dayFmt.format(cur);
        final list = _eventsByDate.putIfAbsent(key, () => []);
        list.add(e);
        cur = cur.add(const Duration(days: 1));
      }
    }
    // Default selected date: keep current if in month, else pick today if in month, else 1st
    final inMonth = (_selectedDate.year == ym.year &&
        _selectedDate.month == ym.month);
    if (!inMonth) {
      final now = DateTime.now();
      if (now.year == ym.year && now.month == ym.month) {
        _selectedDate = DateTime(now.year, now.month, now.day);
      } else {
        _selectedDate = first;
      }
    }
    setState(() {});
  }

  Uri? _extractFirstUrl(String text) {
    final match = RegExp(r'(https?:\/\/[^\s]+)').firstMatch(text);
    if (match != null) {
      final url = match.group(0)!;
      return Uri.tryParse(url);
    }
    return null;
  }

  Future<void> _openUrl(Uri url) async {
    if (await canLaunchUrl(url)) {
      await launchUrl(url, mode: LaunchMode.externalApplication);
    } else {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Unable to open link')));
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final body = _buildBody();
    if (!widget.showTitle) return body;
    return Scaffold(appBar: AppBar(title: const Text('Meetings & Events')), body: body);
  }

  Widget _buildBody() {
    if (_loading) return const Center(child: CircularProgressIndicator());
    if (_error != null) return Center(child: Text(_error!, style: const TextStyle(color: Colors.red)));
    final dayKey = _dayFmt.format(_selectedDate);
    final dayEvents = _eventsByDate[dayKey] ?? const [];
    return RefreshIndicator(
      onRefresh: _fetchMonthEvents,
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          _calendarHeader(),
          const SizedBox(height: 8),
          _calendarGrid(),
          const SizedBox(height: 12),
          Row(
            children: [
              const Icon(Icons.event_note, size: 18),
              const SizedBox(width: 6),
              Text(DateFormat('EEE, MMM d').format(_selectedDate),
                  style: const TextStyle(fontWeight: FontWeight.w600)),
            ],
          ),
          const SizedBox(height: 8),
          if (dayEvents.isEmpty)
            const Text('No events for this day',
                style: TextStyle(color: Colors.black54)),
          ...dayEvents.map((e) {
            final startStr = e['startDate']?.toString();
            final endStr = e['endDate']?.toString();
            final start = startStr != null ? DateTime.tryParse(startStr) : null;
            final end = endStr != null ? DateTime.tryParse(endStr) : null;
            final location = e['location']?.toString() ?? '';
            final explicitJoin = e['joinUrl']?.toString();
            final parsedJoin =
                explicitJoin != null && explicitJoin.isNotEmpty
                    ? Uri.tryParse(explicitJoin)
                    : null;
            final when = start != null ? _dtf.format(start) : '';
            final whenEnd = end != null ? _dtf.format(end) : '';
            return Card(
              child: ListTile(
                leading: const Icon(Icons.calendar_today),
                title: Text(e['title']?.toString() ?? 'Event',
                    style: const TextStyle(fontWeight: FontWeight.w600)),
                subtitle: Text([
                  if (when.isNotEmpty) when,
                  if (whenEnd.isNotEmpty) 'to $whenEnd',
                  if (location.isNotEmpty) 'at $location',
                ].join('  •  ')),
                trailing: parsedJoin != null
                    ? IconButton(
                        tooltip: 'Join',
                        icon: const Icon(Icons.link),
                        onPressed: () {
                          _openUrl(parsedJoin);
                        },
                      )
                    : null,
                onTap: () => _showEventDetails(e, start, end),
              ),
            );
          }),
        ],
      ),
    );
  }

  Widget _calendarHeader() {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          DateFormat('MMMM yyyy').format(_calendarMonth),
          style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700),
        ),
        Row(
          children: [
            IconButton(
              tooltip: 'Previous month',
              onPressed: () async {
                setState(() {
                  _calendarMonth = DateTime(
                      _calendarMonth.year, _calendarMonth.month - 1, 1);
                });
                setState(() => _loading = true);
                try {
                  await _fetchMonthEvents();
                } catch (e) {
                  setState(() => _error = e.toString());
                } finally {
                  setState(() => _loading = false);
                }
              },
              icon: const Icon(Icons.chevron_left, color: Colors.grey),
            ),
            IconButton(
              tooltip: 'Next month',
              onPressed: () async {
                setState(() {
                  _calendarMonth = DateTime(
                      _calendarMonth.year, _calendarMonth.month + 1, 1);
                });
                setState(() => _loading = true);
                try {
                  await _fetchMonthEvents();
                } catch (e) {
                  setState(() => _error = e.toString());
                } finally {
                  setState(() => _loading = false);
                }
              },
              icon: const Icon(Icons.chevron_right, color: Colors.grey),
            ),
          ],
        )
      ],
    );
  }

  Widget _calendarGrid() {
    final anchor = _calendarMonth;
    final year = anchor.year;
    final month = anchor.month;
    final first = DateTime(year, month, 1);
    final nextMonth = DateTime(year, month + 1, 1);
    final lastDay = nextMonth.subtract(const Duration(days: 1)).day;
    final firstWeekday = first.weekday; // 1=Mon..7=Sun

    const weekNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    final cells = <Widget>[];
    for (int i = 0; i < firstWeekday - 1; i++) {
      cells.add(const SizedBox());
    }
    final today = DateTime.now();
    for (int day = 1; day <= lastDay; day++) {
      final date = DateTime(year, month, day);
      final isToday = today.year == year && today.month == month && today.day == day;
      final isSelected = _selectedDate.year == year && _selectedDate.month == month && _selectedDate.day == day;
      final wd = date.weekday;
      final isWeekend = wd == 6 || wd == 7;
      final textColor = isSelected
          ? Colors.white
          : isToday
              ? Colors.blue
              : isWeekend
                  ? Colors.grey[500]
                  : const Color(0xFF0F172A);
      final bgColor = isSelected ? Colors.indigo : Colors.transparent;
      final key = _dayFmt.format(date);
      final hasEvents = (_eventsByDate[key]?.isNotEmpty ?? false);
      cells.add(
        InkWell(
          borderRadius: BorderRadius.circular(999),
          onTap: () {
            setState(() {
              _selectedDate = date;
            });
          },
          child: Center(
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
                  child: Text('$day',
                      style: TextStyle(
                          fontWeight: FontWeight.w600, color: textColor)),
                ),
                const SizedBox(height: 4),
                Container(
                  width: 6,
                  height: 6,
                  decoration: BoxDecoration(
                    color: hasEvents ? Colors.indigo : Colors.transparent,
                    borderRadius: BorderRadius.circular(999),
                  ),
                ),
              ],
            ),
          ),
        ),
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: weekNames
              .map((w) => Expanded(
                    child: Center(
                      child: Text(w,
                          style: const TextStyle(
                              fontSize: 12, color: Color(0xFF6B7280))),
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
          children: const [
            _LegendDot(color: Colors.indigo, label: 'Event'),
          ],
        )
      ],
    );
  }

  void _showEventDetails(Map<String, dynamic> e, DateTime? start, DateTime? end) {
    final desc = (e['description']?.toString() ?? '');
    final explicit = e['joinUrl']?.toString();
    Uri? joinUrl = explicit != null && explicit.isNotEmpty ? Uri.tryParse(explicit) : null;
    joinUrl ??= _extractFirstUrl(desc);
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (_) => Padding(
        padding: const EdgeInsets.fromLTRB(16, 16, 16, 24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(e['title']?.toString() ?? 'Event', style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
            const SizedBox(height: 8),
            if (start != null) Text('Starts: ${_dtf.format(start)}'),
            if (end != null) Text('Ends: ${_dtf.format(end)}'),
            if ((e['location']?.toString() ?? '').isNotEmpty) Text('Location: ${e['location']}'),
            const Divider(height: 20),
            if (desc.isNotEmpty) SelectableText(desc),
            if (joinUrl != null) ...[
              const SizedBox(height: 12),
              Row(
                children: [
                  const Icon(Icons.link, size: 18),
                  const SizedBox(width: 6),
                  Expanded(
                    child: InkWell(
                      onTap: () { final uri = joinUrl; if (uri != null) _openUrl(uri); },
                      child: Text(
                        joinUrl.toString(),
                        style: const TextStyle(color: Colors.blue, decoration: TextDecoration.underline),
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  FilledButton.icon(
                    icon: const Icon(Icons.video_camera_front_outlined),
                    label: const Text('Join'),
                    onPressed: () {
                      final uri = joinUrl;
                      if (uri != null) _openUrl(uri);
                    },
                  ),
                ],
              )
            ],
          ],
        ),
      ),
    );
  }
}

class _LegendDot extends StatelessWidget {
  final Color color;
  final String label;
  const _LegendDot({required this.color, required this.label});

  @override
  Widget build(BuildContext context) {
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
        Text(label,
            style: const TextStyle(fontSize: 12, color: Color(0xFF6B7280))),
      ],
    );
  }
}

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
  List<Map<String, dynamic>> _events = [];
  bool _upcomingOnly = true;

  final _dtf = DateFormat('EEE, MMM d • h:mm a');

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
      final qp = _upcomingOnly ? {'upcoming': 'true', 'limit': '100'} : {'limit': '100'};
      final url = Uri.parse('$_baseUrl/api/schools/$_schoolId/parents/me/events').replace(queryParameters: qp);
      final res = await http.get(url, headers: {
        'Authorization': 'Bearer $_token',
        'Accept': 'application/json',
      });
      if (res.statusCode != 200) throw Exception('Failed (${res.statusCode})');
      final json = jsonDecode(res.body) as Map<String, dynamic>;
      setState(() {
        _events = (json['events'] as List? ?? []).cast<Map<String, dynamic>>();
      });
    } catch (e) {
      setState(() => _error = e.toString());
    } finally {
      setState(() => _loading = false);
    }
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
    return RefreshIndicator(
      onRefresh: _load,
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Row(
            children: [
              const Icon(Icons.event),
              const SizedBox(width: 8),
              const Text('Upcoming only'),
              const SizedBox(width: 8),
              Switch(
                value: _upcomingOnly,
                onChanged: (v) {
                  setState(() => _upcomingOnly = v);
                  _load();
                },
              ),
            ],
          ),
          const SizedBox(height: 8),
          if (_events.isEmpty) const Text('No events found', style: TextStyle(color: Colors.black54)),
          ..._events.map((e) {
            final startStr = e['startDate']?.toString();
            final endStr = e['endDate']?.toString();
            final start = startStr != null ? DateTime.tryParse(startStr) : null;
            final end = endStr != null ? DateTime.tryParse(endStr) : null;
            final location = e['location']?.toString() ?? '';
            final when = start != null ? _dtf.format(start) : '';
            final whenEnd = end != null ? _dtf.format(end) : '';
            return Card(
              child: ListTile(
                leading: const Icon(Icons.calendar_today),
                title: Text(e['title']?.toString() ?? 'Event', style: const TextStyle(fontWeight: FontWeight.w600)),
                subtitle: Text([
                  if (when.isNotEmpty) when,
                  if (whenEnd.isNotEmpty) 'to $whenEnd',
                  if (location.isNotEmpty) 'at $location',
                ].join('  •  ')),
                onTap: () => _showEventDetails(e, start, end),
              ),
            );
          }),
        ],
      ),
    );
  }

  void _showEventDetails(Map<String, dynamic> e, DateTime? start, DateTime? end) {
    final desc = (e['description']?.toString() ?? '');
    final joinUrl = _extractFirstUrl(desc);
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
            if (desc.isNotEmpty) Text(desc),
            if (joinUrl != null) ...[
              const SizedBox(height: 12),
              Align(
                alignment: Alignment.centerRight,
                child: FilledButton.icon(
                  icon: const Icon(Icons.link),
                  label: const Text('Join'),
                  onPressed: () => _openUrl(joinUrl),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

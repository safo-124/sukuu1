import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:http/http.dart' as http;
import 'package:intl/intl.dart';
import 'profile_page.dart';
import '../ui/glass.dart';

class MessagesPage extends StatefulWidget {
  final VoidCallback? onAnyRead;
  const MessagesPage({super.key, this.onAnyRead});

  @override
  State<MessagesPage> createState() => _MessagesPageState();
}

class _MessagesPageState extends State<MessagesPage> {
  final _storage = const FlutterSecureStorage();
  final _df = DateFormat('MMM d, yyyy • h:mm a');

  bool _loading = true;
  String? _error;
  String? _baseUrl;
  String? _token;
  String? _schoolId;
  List<Map<String, dynamic>> _messages = [];

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
      final res = await http.get(
        Uri.parse(
            '$_baseUrl/api/schools/$_schoolId/parents/me/messages?publishedOnly=true&limit=50'),
        headers: {
          'Authorization': 'Bearer $_token',
          'Accept': 'application/json'
        },
      );
      if (res.statusCode != 200) {
        throw Exception('Failed to load messages (${res.statusCode})');
      }
      final json = jsonDecode(res.body) as Map<String, dynamic>;
      final msgs =
          (json['messages'] as List? ?? []).cast<Map<String, dynamic>>();
      setState(() {
        _messages = msgs;
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

  Future<void> _markRead(String id) async {
    try {
      final res = await http.post(
        Uri.parse('$_baseUrl/api/schools/$_schoolId/parents/me/messages'),
        headers: {
          'Authorization': 'Bearer $_token',
          'Content-Type': 'application/json'
        },
        body: jsonEncode({'messageId': id}),
      );
      if (res.statusCode == 200) {
        setState(() {
          final idx = _messages.indexWhere((m) => m['id'] == id);
          if (idx != -1) _messages[idx] = {..._messages[idx], 'isRead': true};
        });
        widget.onAnyRead?.call();
      }
    } catch (_) {}
  }

  void _openMessage(Map<String, dynamic> m) {
    Navigator.of(context)
        .push(MaterialPageRoute(
          builder: (_) => _MessageDetailPage(message: m),
        ))
        .then((_) => _markRead(m['id'].toString()));
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        flexibleSpace: const GlassAppBarFlex(),
        title: const Text('Messages'),
        actions: [
          IconButton(
            tooltip: 'Profile',
            icon: const Icon(Icons.person_outline),
            onPressed: () {
              Navigator.of(context).push(
                MaterialPageRoute(
                  builder: (_) => const ProfilePage(),
                ),
              );
            },
          ),
          IconButton(
              onPressed: _loading ? null : _load,
              icon: const Icon(Icons.refresh)),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? _ErrorView(message: _error!, onRetry: _load)
              : RefreshIndicator(
                  onRefresh: _load,
                  child: ListView.builder(
                    itemCount: _messages.length,
                    itemBuilder: (context, index) {
                      final m = _messages[index];
                      final isRead = m['isRead'] == true;
                      final dtStr =
                          (m['publishedAt'] ?? m['createdAt'])?.toString();
                      final dt =
                          dtStr != null ? DateTime.tryParse(dtStr) : null;
                      return Card(
                        child: ListTile(
                          leading: CircleAvatar(
                            backgroundColor: isRead
                                ? Colors.grey.shade200
                                : Colors.indigo.shade50,
                            child: Icon(
                              isRead ? Icons.mark_email_read : Icons.markunread,
                              color: isRead ? Colors.grey : Colors.indigo,
                            ),
                          ),
                          title: Text(m['title']?.toString() ?? 'Message',
                              style: TextStyle(
                                  fontWeight: isRead
                                      ? FontWeight.w500
                                      : FontWeight.w700)),
                          subtitle: Text(dt != null ? _df.format(dt) : ''),
                          trailing: isRead
                              ? null
                              : const Icon(Icons.fiber_manual_record,
                                  size: 12, color: Colors.indigo),
                          onTap: () => _openMessage(m),
                        ),
                      );
                    },
                  ),
                ),
    );
  }
}

class _MessageDetailPage extends StatefulWidget {
  final Map<String, dynamic> message;
  const _MessageDetailPage({required this.message});

  @override
  State<_MessageDetailPage> createState() => _MessageDetailPageState();
}

class _MessageDetailPageState extends State<_MessageDetailPage> {
  bool _openedAutomatically = false;

  @override
  void initState() {
    super.initState();
    // Auto-open assignment modal if deep link exists
    final content = widget.message['content']?.toString() ?? '';
    final deepLinkMatch =
        RegExp(r'assignment:\/\/([a-zA-Z0-9_-]+)').firstMatch(content);
    final assignmentId = deepLinkMatch != null ? deepLinkMatch.group(1) : null;
    if (assignmentId != null) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted && !_openedAutomatically) {
          _openedAutomatically = true;
          _openAssignment(assignmentId);
        }
      });
    }
  }

  Future<void> _openAssignment(String assignmentId) async {
    final storage = const FlutterSecureStorage();
    final baseUrl = await storage.read(key: 'baseUrl');
    final token = await storage.read(key: 'token');
    final schoolId = await storage.read(key: 'schoolId');
    if (baseUrl == null || token == null || schoolId == null) return;
    final url = Uri.parse(
        '$baseUrl/api/schools/$schoolId/parents/me/assignments/$assignmentId');
    try {
      final res = await http.get(url,
          headers: {
            'Authorization': 'Bearer $token',
            'Accept': 'application/json'
          });
      if (res.statusCode != 200) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(content: Text('Failed to load assignment')));
        }
        return;
      }
      final jsonMap = jsonDecode(res.body) as Map<String, dynamic>;
      final a = jsonMap['assignment'] as Map<String, dynamic>;
      if (!mounted) return;
      showModalBottomSheet(
        context: context,
        isScrollControlled: true,
        builder: (_) {
          final subj = a['subject']?['name']?.toString() ?? '';
          final sec = a['section']?['name']?.toString();
          final cls = a['class']?['name']?.toString();
          final due = a['dueDate']?.toString();
          final dueDt = due != null ? DateTime.tryParse(due) : null;
          final teacherName = [
            a['teacher']?['user']?['firstName'],
            a['teacher']?['user']?['lastName']
          ].whereType<String>().join(' ');
          return Padding(
            padding: MediaQuery.of(context)
                .viewInsets
                .add(const EdgeInsets.all(16)),
            child: SafeArea(
              child: SingleChildScrollView(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(a['title']?.toString() ?? 'Assignment',
                        style: const TextStyle(
                            fontSize: 18, fontWeight: FontWeight.bold)),
                    const SizedBox(height: 8),
                    Text(
                        'Subject: $subj${sec != null ? ' • Section: ' + sec : ''}${cls != null ? ' • Class: ' + cls : ''}'),
                    if (dueDt != null)
                      Text(
                          'Due: ${DateFormat('MMM d, yyyy h:mm a').format(dueDt)}'),
                    if (teacherName.isNotEmpty)
                      Text('Teacher: $teacherName'),
                    const Divider(height: 24),
                    if (a['description'] != null)
                      Text(a['description'].toString()),
                    const SizedBox(height: 16),
                  ],
                ),
              ),
            ),
          );
        },
      );
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Failed to load assignment')));
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final df = DateFormat('EEEE, MMM d, yyyy h:mm a');
    final dtStr =
        (widget.message['publishedAt'] ?? widget.message['createdAt'])
            ?.toString();
    final dt = dtStr != null ? DateTime.tryParse(dtStr) : null;
    final content = widget.message['content']?.toString() ?? '';
    final deepLinkMatch =
        RegExp(r'assignment:\/\/([a-zA-Z0-9_-]+)').firstMatch(content);
    final assignmentId = deepLinkMatch != null ? deepLinkMatch.group(1) : null;
    return Scaffold(
      appBar: AppBar(title: const Text('Message')),
      body: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(widget.message['title']?.toString() ?? 'Message',
                style: const TextStyle(
                    fontSize: 20, fontWeight: FontWeight.bold)),
            const SizedBox(height: 8),
            if (dt != null)
              Text(df.format(dt),
                  style: const TextStyle(color: Colors.black54)),
            const Divider(height: 24),
            Text(content, style: const TextStyle(fontSize: 16)),
            if (assignmentId != null) ...[
              const SizedBox(height: 16),
              FilledButton.icon(
                icon: const Icon(Icons.assignment_outlined),
                label: const Text('View assignment details'),
                onPressed: () => _openAssignment(assignmentId),
              ),
            ]
          ],
        ),
      ),
    );
  }
}

class _ErrorView extends StatelessWidget {
  final String message;
  final Future<void> Function() onRetry;
  const _ErrorView({required this.message, required this.onRetry});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24.0),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.error_outline, color: Colors.redAccent, size: 48),
            const SizedBox(height: 12),
            Text(
              message,
              style: const TextStyle(fontSize: 16),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 16),
            FilledButton.icon(
              icon: const Icon(Icons.refresh),
              label: const Text('Retry'),
              onPressed: onRetry,
            )
          ],
        ),
      ),
    );
  }
}

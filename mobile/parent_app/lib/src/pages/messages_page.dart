import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:http/http.dart' as http;
import 'package:intl/intl.dart';

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
    setState(() { _loading = true; _error = null; });
    try {
      _baseUrl = await _storage.read(key: 'baseUrl');
      _token = await _storage.read(key: 'token');
      _schoolId = await _storage.read(key: 'schoolId');
      if (_baseUrl == null || _token == null || _schoolId == null) {
        throw Exception('Missing credentials. Please login again.');
      }
      final res = await http.get(
        Uri.parse('$_baseUrl/api/schools/$_schoolId/parents/me/messages?publishedOnly=true&limit=50'),
        headers: { 'Authorization': 'Bearer $_token', 'Accept': 'application/json' },
      );
      if (res.statusCode != 200) {
        throw Exception('Failed to load messages (${res.statusCode})');
      }
      final json = jsonDecode(res.body) as Map<String, dynamic>;
      final msgs = (json['messages'] as List? ?? []).cast<Map<String, dynamic>>();
      setState(() { _messages = msgs; });
    } catch (e) {
      setState(() { _error = e.toString(); });
    } finally {
      setState(() { _loading = false; });
    }
  }

  Future<void> _markRead(String id) async {
    try {
      final res = await http.post(
        Uri.parse('$_baseUrl/api/schools/$_schoolId/parents/me/messages'),
        headers: { 'Authorization': 'Bearer $_token', 'Content-Type': 'application/json' },
        body: jsonEncode({ 'messageId': id }),
      );
      if (res.statusCode == 200) {
        setState(() {
          final idx = _messages.indexWhere((m) => m['id'] == id);
          if (idx != -1) _messages[idx] = { ..._messages[idx], 'isRead': true };
        });
        widget.onAnyRead?.call();
      }
    } catch (_) {}
  }

  void _openMessage(Map<String, dynamic> m) {
    Navigator.of(context).push(MaterialPageRoute(
      builder: (_) => _MessageDetailPage(message: m),
    )).then((_) => _markRead(m['id'].toString()));
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Messages'),
        actions: [
          IconButton(onPressed: _loading ? null : _load, icon: const Icon(Icons.refresh)),
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
                      final dtStr = (m['publishedAt'] ?? m['createdAt'])?.toString();
                      final dt = dtStr != null ? DateTime.tryParse(dtStr) : null;
                      return Card(
                        child: ListTile(
                          leading: CircleAvatar(
                            backgroundColor: isRead ? Colors.grey.shade200 : Colors.indigo.shade50,
                            child: Icon(
                              isRead ? Icons.mark_email_read : Icons.markunread,
                              color: isRead ? Colors.grey : Colors.indigo,
                            ),
                          ),
                          title: Text(m['title']?.toString() ?? 'Message',
                              style: TextStyle(fontWeight: isRead ? FontWeight.w500 : FontWeight.w700)),
                          subtitle: Text(dt != null ? _df.format(dt) : ''),
                          trailing: isRead ? null : const Icon(Icons.fiber_manual_record, size: 12, color: Colors.indigo),
                          onTap: () => _openMessage(m),
                        ),
                      );
                    },
                  ),
                ),
    );
  }
}

class _MessageDetailPage extends StatelessWidget {
  final Map<String, dynamic> message;
  const _MessageDetailPage({required this.message});

  @override
  Widget build(BuildContext context) {
    final df = DateFormat('EEEE, MMM d, yyyy h:mm a');
    final dtStr = (message['publishedAt'] ?? message['createdAt'])?.toString();
    final dt = dtStr != null ? DateTime.tryParse(dtStr) : null;
    return Scaffold(
      appBar: AppBar(title: const Text('Message')),
      body: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(message['title']?.toString() ?? 'Message', style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
            const SizedBox(height: 8),
            if (dt != null) Text(df.format(dt), style: const TextStyle(color: Colors.black54)),
            const Divider(height: 24),
            Text(message['content']?.toString() ?? '', style: const TextStyle(fontSize: 16)),
          ],
        ),
      ),
    );
  }
}

class _ErrorView extends StatelessWidget {
  final String message;
  final VoidCallback onRetry;
  const _ErrorView({required this.message, required this.onRetry});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.error_outline, color: Colors.red, size: 32),
            const SizedBox(height: 8),
            Text(message, textAlign: TextAlign.center, style: const TextStyle(color: Colors.red)),
            const SizedBox(height: 12),
            FilledButton.icon(onPressed: onRetry, icon: const Icon(Icons.refresh), label: const Text('Retry')),
          ],
        ),
      ),
    );
  }
}

import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:http/http.dart' as http;
import 'grades_page.dart';

class ChildrenPage extends StatefulWidget {
  const ChildrenPage({super.key});

  @override
  State<ChildrenPage> createState() => _ChildrenPageState();
}

class _ChildrenPageState extends State<ChildrenPage> {
  final _storage = const FlutterSecureStorage();
  bool _loading = true;
  String? _error;
  List<dynamic> _children = [];

  Future<void> _load() async {
    setState(() { _loading = true; _error = null; });
    try {
      final token = await _storage.read(key: 'token');
      final baseUrl = await _storage.read(key: 'baseUrl');
      final schoolId = await _storage.read(key: 'schoolId');
      if (token == null || baseUrl == null || schoolId == null) throw Exception('Missing auth or config');

      final res = await http.get(
        Uri.parse('$baseUrl/api/schools/$schoolId/parents/me'),
        headers: { 'Authorization': 'Bearer $token', 'Accept': 'application/json' },
      );
      if (res.statusCode != 200) throw Exception('Failed: ${res.statusCode} ${res.body}');
      final json = jsonDecode(res.body) as Map<String, dynamic>;
      setState(() {
        _children = (json['children'] as List?) ?? [];
      });
    } catch (e) {
      setState(() { _error = 'Error: $e'; });
    } finally {
      setState(() { _loading = false; });
    }
  }

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('My Children')),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? Center(child: Text(_error!, style: const TextStyle(color: Colors.red)))
              : ListView.separated(
                  itemCount: _children.length,
                  separatorBuilder: (_, __) => const Divider(height: 1),
                  itemBuilder: (context, index) {
                    final c = _children[index] as Map<String, dynamic>;
                    final name = (c['firstName'] ?? '') + ' ' + (c['lastName'] ?? '');
                    return ListTile(
                      title: Text(name.trim().isEmpty ? 'Student ${c['id']}' : name.trim()),
                      subtitle: Text('ID: ${c['studentId'] ?? c['id']}'),
                      trailing: const Icon(Icons.chevron_right),
                      onTap: () {
                        Navigator.of(context).push(
                          MaterialPageRoute(builder: (_) => GradesPage(studentId: c['id'].toString(), studentName: name.trim())),
                        );
                      },
                    );
                  },
                ),
    );
  }
}

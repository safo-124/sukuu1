import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:http/http.dart' as http;

class PromotionsPage extends StatefulWidget {
  const PromotionsPage({super.key});

  @override
  State<PromotionsPage> createState() => _PromotionsPageState();
}

class _PromotionsPageState extends State<PromotionsPage> {
  final _storage = const FlutterSecureStorage();
  bool _loading = true;
  String? _error;
  List<dynamic> _children = [];

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
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
      setState(() {
        _children = (json['children'] as List?) ?? [];
      });
    } catch (e) {
      setState(() {
        _error = 'Error: $e';
      });
    } finally {
      setState(() {
        _loading = false;
      });
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
      appBar: AppBar(title: const Text('Promotions / Transfers')),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? Center(
                  child:
                      Text(_error!, style: const TextStyle(color: Colors.red)))
              : ListView.builder(
                  itemCount: _children.length,
                  itemBuilder: (context, idx) {
                    final c = _children[idx] as Map<String, dynamic>;
                    final name = ((c['firstName'] ?? '').toString() +
                            ' ' +
                            (c['lastName'] ?? '').toString())
                        .trim();
                    final promos = (c['promotions'] as List?) ?? [];
                    final current = c['current'] as Map<String, dynamic>?;
                    return ExpansionTile(
                      title: Text(name.isEmpty
                          ? c['studentId']?.toString() ?? 'Student'
                          : name),
                      subtitle: current == null
                          ? const Text('No current enrollment')
                          : Text(
                              'Current: ${current['academicYear'] ?? ''} • ${current['className'] ?? ''} • ${current['sectionName'] ?? ''}'),
                      children: promos.isEmpty
                          ? [
                              const ListTile(
                                  title: Text('No promotion/transfer history'))
                            ]
                          : promos.map<Widget>((p) {
                              final mp = p as Map<String, dynamic>;
                              final type = (mp['type'] ?? '').toString();
                              final date = (mp['date'] ?? '').toString();
                              final from =
                                  (mp['from'] as Map<String, dynamic>?);
                              final to = (mp['to'] as Map<String, dynamic>?);
                              return ListTile(
                                leading: Icon(type == 'PROMOTED'
                                    ? Icons.trending_up
                                    : Icons.swap_horiz),
                                title: Text(type == 'PROMOTED'
                                    ? 'Promoted'
                                    : 'Transferred'),
                                subtitle: Text(
                                    '${from?['academicYear'] ?? ''} • ${from?['className'] ?? ''} • ${from?['sectionName'] ?? ''}  →  ${to?['academicYear'] ?? ''} • ${to?['className'] ?? ''} • ${to?['sectionName'] ?? ''}\n$date'),
                              );
                            }).toList(),
                    );
                  },
                ),
    );
  }
}

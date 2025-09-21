import 'dart:convert';
import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:http/http.dart' as http;
import 'package:intl/intl.dart';
import 'package:pdf/widgets.dart' as pw;
import 'package:printing/printing.dart' as printing;
import 'package:shared_preferences/shared_preferences.dart';

class GradesPage extends StatefulWidget {
  final String studentId;
  final String studentName;
  final bool showTitle; // when false, renders content only (embedded)
  final bool allowChildSwitch; // show child selector when standalone
  const GradesPage(
      {super.key,
      required this.studentId,
      required this.studentName,
      this.showTitle = true,
      this.allowChildSwitch = false});

  @override
  State<GradesPage> createState() => _GradesPageState();
}

class _GradesPageState extends State<GradesPage> {
  final _storage = const FlutterSecureStorage();
  bool _loading = true;
  String? _error;
  List<Map<String, dynamic>> _records = [];
  String _selectedAy = 'all';
  String _selectedTerm = 'all';
  // Active child (for optional child switching in standalone)
  String? _activeStudentId;
  String? _activeStudentName;
  List<Map<String, dynamic>> _children = [];
  // Band thresholds (percent minimums)
  double _bandA = 80, _bandB = 70, _bandC = 60, _bandD = 50;

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
        Uri.parse('$baseUrl/api/schools/$schoolId/parents/me/children/grades'),
        headers: {
          'Authorization': 'Bearer $token',
          'Accept': 'application/json'
        },
      );
      if (res.statusCode != 200)
        throw Exception('Failed: ${res.statusCode} ${res.body}');
      final json = jsonDecode(res.body) as Map<String, dynamic>;
      final children = (json['children'] as List?) ?? [];
      final targetId = (_activeStudentId ?? widget.studentId).toString();
      final my = children
          .cast<Map<String, dynamic>>()
          .where((s) => s['studentId'].toString() == targetId)
          .toList();
      final grades = my.isNotEmpty
          ? (my.first['grades'] as List? ?? []).cast<Map<String, dynamic>>()
          : <Map<String, dynamic>>[];
      setState(() {
        _records = grades;
        // reset filters on fresh load
        _selectedAy = 'all';
        _selectedTerm = 'all';
        if (widget.allowChildSwitch) {
          final kids = children.cast<Map<String, dynamic>>().map((c) {
            final first = c['firstName'] ??
                (c['student'] is Map ? c['student']['firstName'] : null);
            final last = c['lastName'] ??
                (c['student'] is Map ? c['student']['lastName'] : null);
            return {
              'id': (c['studentId'] ?? c['id'])?.toString(),
              'firstName': first,
              'lastName': last,
            };
          }).toList();
          _children = kids;
          if (_activeStudentId == null && kids.isNotEmpty) {
            _activeStudentId =
                (kids.first['id'] ?? widget.studentId).toString();
          }
        }
      });
      await _restoreFilters();
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

  Future<void> _loadChildren() async {
    try {
      final baseUrl = await _storage.read(key: 'baseUrl');
      final token = await _storage.read(key: 'token');
      final schoolId = await _storage.read(key: 'schoolId');
      if (baseUrl == null || token == null || schoolId == null) return;
      final meRes = await http.get(
        Uri.parse('$baseUrl/api/schools/$schoolId/parents/me'),
        headers: {
          'Authorization': 'Bearer $token',
          'Accept': 'application/json'
        },
      );
      if (meRes.statusCode != 200) return;
      final meJson = jsonDecode(meRes.body) as Map<String, dynamic>;
      final kids =
          (meJson['children'] as List? ?? []).cast<Map<String, dynamic>>();
      setState(() {
        _children = kids;
        if (_activeStudentId == null && kids.isNotEmpty) {
          final first = kids.first;
          _activeStudentId = first['id']?.toString();
          _activeStudentName =
              ('${first['firstName'] ?? ''} ${first['lastName'] ?? ''}').trim();
        }
      });
    } catch (_) {}
  }

  Future<void> _saveFilters() async {
    final prefs = await SharedPreferences.getInstance();
    final sid = (_activeStudentId ?? widget.studentId).toString();
    await prefs.setString('grades_filter_ay_$sid', _selectedAy);
    await prefs.setString('grades_filter_term_$sid', _selectedTerm);
  }

  Future<void> _restoreFilters() async {
    final prefs = await SharedPreferences.getInstance();
    final sid = (_activeStudentId ?? widget.studentId).toString();
    final ay = prefs.getString('grades_filter_ay_$sid');
    final term = prefs.getString('grades_filter_term_$sid');
    if (ay != null || term != null) {
      setState(() {
        if (ay != null) _selectedAy = ay;
        if (term != null) _selectedTerm = term;
      });
    }
  }

  Future<void> _loadBandConfig() async {
    try {
      final jsonStr = await _storage.read(key: 'bandThresholds');
      if (jsonStr != null) {
        final map = jsonDecode(jsonStr) as Map<String, dynamic>;
        setState(() {
          _bandA = (map['A'] as num?)?.toDouble() ?? _bandA;
          _bandB = (map['B'] as num?)?.toDouble() ?? _bandB;
          _bandC = (map['C'] as num?)?.toDouble() ?? _bandC;
          _bandD = (map['D'] as num?)?.toDouble() ?? _bandD;
        });
      }
    } catch (_) {}
  }

  // Deterministic color per subject
  Color _colorFor(String key) {
    final colors = [
      Colors.indigo,
      Colors.teal,
      Colors.deepPurple,
      Colors.blue,
      Colors.orange,
      Colors.pink,
      Colors.green,
      Colors.cyan,
    ];
    final h = key.codeUnits.fold<int>(0, (a, b) => (a * 31 + b) & 0x7fffffff);
    return colors[h % colors.length];
  }

  List<Map<String, String>> _buildAyOptions() {
    final map = <String, String>{'all': 'All Years'};
    for (final g in _records) {
      final ay = (g['academicYear'] as Map?)?['id']?.toString();
      final name = (g['academicYear'] as Map?)?['name']?.toString();
      if (ay != null && name != null) map[ay] = name;
    }
    return map.entries.map((e) => {'id': e.key, 'name': e.value}).toList();
  }

  List<Map<String, String>> _buildTermOptions(List<Map<String, dynamic>> base) {
    final map = <String, String>{'all': 'All Terms'};
    for (final g in base) {
      final tid = (g['term'] as Map?)?['id']?.toString();
      final name = (g['term'] as Map?)?['name']?.toString();
      if (tid != null && name != null) map[tid] = name;
    }
    return map.entries.map((e) => {'id': e.key, 'name': e.value}).toList();
  }

  List<Map<String, dynamic>> _applyFilters() {
    return _records.where((g) {
      final ayOk = _selectedAy == 'all' ||
          (g['academicYear'] as Map?)?['id']?.toString() == _selectedAy;
      final termOk = _selectedTerm == 'all' ||
          (g['term'] as Map?)?['id']?.toString() == _selectedTerm;
      return ayOk && termOk;
    }).toList();
  }

  Map<String, dynamic> _computeSummary(List<Map<String, dynamic>> list) {
    double sumMarks = 0;
    int countMarks = 0;
    double? minMarks;
    double? maxMarks;
    double sumPct = 0;
    int countPct = 0;
    for (final g in list) {
      final marksDyn = g['marksObtained'];
      double? marks;
      if (marksDyn is num) marks = marksDyn.toDouble();
      if (marksDyn is String) marks = double.tryParse(marksDyn);
      final maxDyn = ((g['examSchedule'] as Map?)?['maxMarks']);
      double? maxM;
      if (maxDyn is num) maxM = maxDyn.toDouble();
      if (marks != null) {
        sumMarks += marks;
        countMarks += 1;
        minMarks =
            (minMarks == null) ? marks : (marks < minMarks ? marks : minMarks);
        maxMarks =
            (maxMarks == null) ? marks : (marks > maxMarks ? marks : maxMarks);
        if (maxM != null && maxM > 0) {
          sumPct += (marks / maxM) * 100.0;
          countPct += 1;
        }
      }
    }
    final avg = countMarks > 0 ? (sumMarks / countMarks) : null;
    final avgPct = countPct > 0 ? (sumPct / countPct) : null;
    return {
      'count': list.length,
      'avg': avg,
      'min': minMarks,
      'max': maxMarks,
      'avgPct': avgPct,
    };
  }

  String _bandFor(num percent) {
    if (percent >= _bandA) return 'A';
    if (percent >= _bandB) return 'B';
    if (percent >= _bandC) return 'C';
    if (percent >= _bandD) return 'D';
    return 'F';
  }

  Map<String, Map<String, dynamic>> _computeTermSummaries(
      List<Map<String, dynamic>> list) {
    // key: termName
    final byTerm = <String, List<Map<String, dynamic>>>{};
    for (final g in list) {
      final term = (g['term'] as Map?)?['name']?.toString() ?? 'Term';
      byTerm.putIfAbsent(term, () => []);
      byTerm[term]!.add(g);
    }
    final out = <String, Map<String, dynamic>>{};
    for (final entry in byTerm.entries) {
      final rows = entry.value;
      double sum = 0;
      double? minV;
      double? maxV;
      int count = 0;
      final bySubject = <String, List<double>>{};
      for (final g in rows) {
        final marksDyn = g['marksObtained'];
        double? marks;
        if (marksDyn is num) marks = marksDyn.toDouble();
        if (marksDyn is String) marks = double.tryParse(marksDyn);
        if (marks != null) {
          sum += marks;
          count++;
          minV = (minV == null) ? marks : (marks < minV ? marks : minV);
          maxV = (maxV == null) ? marks : (marks > maxV ? marks : maxV);
          final subj = (g['subject'] as Map?)?['name']?.toString() ?? 'Subject';
          bySubject.putIfAbsent(subj, () => []);
          bySubject[subj]!.add(marks);
        }
      }
      String? topSubject;
      double bestAvg = -1.0;
      bySubject.forEach((k, v) {
        final double avg =
            v.isEmpty ? 0.0 : v.reduce((a, b) => a + b) / v.length;
        if (avg > bestAvg) {
          bestAvg = avg;
          topSubject = k;
        }
      });
      out[entry.key] = {
        'avg': count > 0 ? sum / count : null,
        'min': minV,
        'max': maxV,
        'topSubject': topSubject,
      };
    }
    return out;
  }

  Future<Uint8List?> _fetchSchoolLogoBytes() async {
    try {
      final url = await _storage.read(key: 'schoolLogoUrl');
      if (url == null || url.isEmpty) return null;
      final res = await http.get(Uri.parse(url));
      if (res.statusCode == 200) return res.bodyBytes;
    } catch (_) {}
    return null;
  }

  Future<void> _exportPdf(
      List<Map<String, dynamic>> filtered, String studentName) async {
    final df = DateFormat('yyyy-MM-dd');
    final doc = pw.Document();
    final groups = _groupBySubject(filtered);
    final termSummaries = _computeTermSummaries(filtered);
    final logoBytes = await _fetchSchoolLogoBytes();

    doc.addPage(
      pw.MultiPage(
        pageTheme: const pw.PageTheme(margin: pw.EdgeInsets.all(24)),
        build: (ctx) {
          return [
            pw.Row(
              mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
              crossAxisAlignment: pw.CrossAxisAlignment.center,
              children: [
                if (logoBytes != null)
                  pw.Container(
                    height: 44,
                    width: 44,
                    margin: const pw.EdgeInsets.only(right: 8),
                    child: pw.Image(pw.MemoryImage(logoBytes),
                        fit: pw.BoxFit.contain),
                  ),
                pw.Expanded(
                  child: pw.Column(
                    crossAxisAlignment: pw.CrossAxisAlignment.start,
                    children: [
                      pw.Text('Grades Report',
                          style: pw.TextStyle(
                              fontSize: 20, fontWeight: pw.FontWeight.bold)),
                      pw.Text(studentName,
                          style: const pw.TextStyle(fontSize: 12)),
                    ],
                  ),
                ),
              ],
            ),
            pw.SizedBox(height: 8),
            pw.Text(
                'Filters: Year=${_selectedAy == 'all' ? 'All' : _selectedAy}, Term=${_selectedTerm == 'all' ? 'All' : _selectedTerm}',
                style: const pw.TextStyle(fontSize: 10)),
            pw.SizedBox(height: 12),
            if (termSummaries.isNotEmpty) ...[
              pw.Text('Term Summary',
                  style: pw.TextStyle(
                      fontSize: 14, fontWeight: pw.FontWeight.bold)),
              pw.SizedBox(height: 6),
              pw.Table(
                columnWidths: const {
                  0: pw.FlexColumnWidth(1.2),
                  1: pw.FlexColumnWidth(0.8),
                  2: pw.FlexColumnWidth(0.8),
                  3: pw.FlexColumnWidth(1.2),
                },
                border: pw.TableBorder.all(width: 0.3),
                children: [
                  pw.TableRow(children: [
                    pw.Padding(
                        padding: const pw.EdgeInsets.all(4),
                        child: pw.Text('Term',
                            style:
                                pw.TextStyle(fontWeight: pw.FontWeight.bold))),
                    pw.Padding(
                        padding: const pw.EdgeInsets.all(4),
                        child: pw.Text('Avg',
                            style:
                                pw.TextStyle(fontWeight: pw.FontWeight.bold))),
                    pw.Padding(
                        padding: const pw.EdgeInsets.all(4),
                        child: pw.Text('Min/Max',
                            style:
                                pw.TextStyle(fontWeight: pw.FontWeight.bold))),
                    pw.Padding(
                        padding: const pw.EdgeInsets.all(4),
                        child: pw.Text('Top Subject',
                            style:
                                pw.TextStyle(fontWeight: pw.FontWeight.bold))),
                  ]),
                  ...termSummaries.entries.map((e) {
                    final v = e.value;
                    final avg = v['avg'] as double?;
                    final min = v['min'] as double?;
                    final max = v['max'] as double?;
                    final top = v['topSubject']?.toString() ?? '';
                    return pw.TableRow(children: [
                      pw.Padding(
                          padding: const pw.EdgeInsets.all(4),
                          child: pw.Text(e.key)),
                      pw.Padding(
                          padding: const pw.EdgeInsets.all(4),
                          child: pw.Text(
                              avg != null ? avg.toStringAsFixed(1) : '-')),
                      pw.Padding(
                          padding: const pw.EdgeInsets.all(4),
                          child: pw.Text(
                              '${min?.toStringAsFixed(1) ?? '-'} / ${max?.toStringAsFixed(1) ?? '-'}')),
                      pw.Padding(
                          padding: const pw.EdgeInsets.all(4),
                          child: pw.Text(top)),
                    ]);
                  })
                ],
              ),
              pw.SizedBox(height: 12),
            ],
            ...groups.map((grp) {
              final subject = grp['subject'] as String;
              final rows = (grp['rows'] as List).cast<Map<String, dynamic>>();
              return pw.Column(
                  crossAxisAlignment: pw.CrossAxisAlignment.start,
                  children: [
                    pw.Text(subject,
                        style: pw.TextStyle(
                            fontSize: 14, fontWeight: pw.FontWeight.bold)),
                    pw.SizedBox(height: 6),
                    pw.Table(
                      columnWidths: const {
                        0: pw.FlexColumnWidth(2),
                        1: pw.FlexColumnWidth(1),
                        2: pw.FlexColumnWidth(1),
                        3: pw.FlexColumnWidth(0.6),
                        4: pw.FlexColumnWidth(3),
                      },
                      border: pw.TableBorder.all(width: 0.3),
                      children: [
                        pw.TableRow(
                          decoration: const pw.BoxDecoration(),
                          children: [
                            pw.Padding(
                                padding: const pw.EdgeInsets.all(4),
                                child: pw.Text('Exam',
                                    style: pw.TextStyle(
                                        fontWeight: pw.FontWeight.bold))),
                            pw.Padding(
                                padding: const pw.EdgeInsets.all(4),
                                child: pw.Text('Date',
                                    style: pw.TextStyle(
                                        fontWeight: pw.FontWeight.bold))),
                            pw.Padding(
                                padding: const pw.EdgeInsets.all(4),
                                child: pw.Text('Marks',
                                    style: pw.TextStyle(
                                        fontWeight: pw.FontWeight.bold))),
                            pw.Padding(
                                padding: const pw.EdgeInsets.all(4),
                                child: pw.Text('Band',
                                    style: pw.TextStyle(
                                        fontWeight: pw.FontWeight.bold))),
                            pw.Padding(
                                padding: const pw.EdgeInsets.all(4),
                                child: pw.Text('Remarks',
                                    style: pw.TextStyle(
                                        fontWeight: pw.FontWeight.bold))),
                          ],
                        ),
                        ...rows.map((g) {
                          final exam = (((g['examSchedule'] as Map?)?['exam'])
                                      as Map?)?['name']
                                  ?.toString() ??
                              'Exam';
                          final date = (g['examSchedule'] as Map?)?['date'];
                          final marksStr =
                              g['marksObtained']?.toString() ?? '-';
                          final maxMarks =
                              ((g['examSchedule'] as Map?)?['maxMarks']);
                          double? marksNum = double.tryParse(marksStr);
                          if (marksNum == null && g['marksObtained'] is num) {
                            marksNum = (g['marksObtained'] as num).toDouble();
                          }
                          String band = '';
                          if (marksNum != null &&
                              maxMarks is num &&
                              maxMarks > 0) {
                            final pct = (marksNum / maxMarks) * 100.0;
                            band = _bandFor(pct);
                          }
                          final comments = g['comments']?.toString() ?? '';
                          return pw.TableRow(children: [
                            pw.Padding(
                                padding: const pw.EdgeInsets.all(4),
                                child: pw.Text(exam)),
                            pw.Padding(
                                padding: const pw.EdgeInsets.all(4),
                                child: pw.Text(date != null
                                    ? df.format(DateTime.parse(date))
                                    : '')),
                            pw.Padding(
                                padding: const pw.EdgeInsets.all(4),
                                child: pw.Text(marksStr)),
                            pw.Padding(
                                padding: const pw.EdgeInsets.all(4),
                                child: pw.Text(band)),
                            pw.Padding(
                                padding: const pw.EdgeInsets.all(4),
                                child: pw.Text(comments)),
                          ]);
                        })
                      ],
                    ),
                    pw.SizedBox(height: 12),
                  ]);
            }),
            if (groups.isEmpty)
              pw.Text('No grades found for the selected filters.')
          ];
        },
      ),
    );

    final filename = 'grades_${studentName.replaceAll(' ', '_')}.pdf';
    final bytes = await doc.save();
    await printing.Printing.sharePdf(bytes: bytes, filename: filename);
  }

  List<Map<String, dynamic>> _groupBySubject(List<Map<String, dynamic>> list) {
    final map = <String, List<Map<String, dynamic>>>{};
    for (final g in list) {
      final subj = (g['subject'] as Map?)?['name']?.toString() ?? 'Subject';
      map.putIfAbsent(subj, () => []);
      map[subj]!.add(g);
    }
    return map.entries.map((e) => {'subject': e.key, 'rows': e.value}).toList()
      ..sort(
          (a, b) => (a['subject'] as String).compareTo(b['subject'] as String));
  }

  @override
  void initState() {
    super.initState();
    _activeStudentId = widget.studentId;
    _activeStudentName = widget.studentName;
    _loadBandConfig();
    if (widget.allowChildSwitch) {
      _loadChildren().then((_) => _load());
    } else {
      _load();
    }
  }

  @override
  Widget build(BuildContext context) {
    final df = DateFormat('yyyy-MM-dd');
    final filtered = _applyFilters();
    final summary = _computeSummary(filtered);
    final groups = _groupBySubject(filtered);

    Widget content = _loading
        ? const Center(child: CircularProgressIndicator())
        : _error != null
            ? Center(
                child: Text(_error!, style: const TextStyle(color: Colors.red)))
            : RefreshIndicator(
                onRefresh: _load,
                child: ListView(
                  padding: const EdgeInsets.symmetric(vertical: 8),
                  children: [
                    if (widget.showTitle && widget.allowChildSwitch)
                      Padding(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 12, vertical: 6),
                        child: Row(
                          children: [
                            const Icon(Icons.child_care_outlined),
                            const SizedBox(width: 8),
                            Expanded(
                              child: DropdownButtonFormField<String>(
                                value: _activeStudentId?.toString(),
                                items: _children.map((c) {
                                  final name =
                                      '${c['firstName'] ?? ''} ${c['lastName'] ?? ''}'
                                          .trim();
                                  return DropdownMenuItem(
                                      value: c['id'].toString(),
                                      child: Text(name));
                                }).toList(),
                                onChanged: (v) {
                                  final sel = _children.firstWhere(
                                      (e) => e['id'].toString() == v,
                                      orElse: () => {});
                                  setState(() {
                                    _activeStudentId = sel.isEmpty
                                        ? null
                                        : sel['id'].toString();
                                    _activeStudentName = sel.isEmpty
                                        ? null
                                        : ('${sel['firstName'] ?? ''} ${sel['lastName'] ?? ''}')
                                            .trim();
                                  });
                                  _load();
                                },
                                decoration:
                                    const InputDecoration(labelText: 'Child'),
                              ),
                            ),
                          ],
                        ),
                      ),
                    if (!widget.showTitle)
                      Padding(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 12, vertical: 6),
                        child: Align(
                          alignment: Alignment.centerRight,
                          child: ElevatedButton.icon(
                            onPressed: () {
                              final current = _applyFilters();
                              _exportPdf(current, widget.studentName);
                            },
                            icon: const Icon(Icons.picture_as_pdf_outlined,
                                size: 18),
                            label: const Text('Export PDF'),
                          ),
                        ),
                      ),
                    // Filters
                    Padding(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 12, vertical: 6),
                      child: Row(
                        children: [
                          // AY
                          Expanded(
                            child: DropdownButtonFormField<String>(
                              value: _selectedAy,
                              decoration:
                                  const InputDecoration(labelText: 'Year'),
                              items: _buildAyOptions()
                                  .map((o) => DropdownMenuItem(
                                      value: o['id']!, child: Text(o['name']!)))
                                  .toList(),
                              onChanged: (v) => setState(() {
                                _selectedAy = v ?? 'all';
                                // Reset term when AY changes
                                _selectedTerm = 'all';
                                _saveFilters();
                              }),
                            ),
                          ),
                          const SizedBox(width: 8),
                          // Term (depends on filtered by AY)
                          Expanded(
                            child: DropdownButtonFormField<String>(
                              value: _selectedTerm,
                              decoration:
                                  const InputDecoration(labelText: 'Term'),
                              items: _buildTermOptions(_records
                                      .where((g) =>
                                          _selectedAy == 'all' ||
                                          (g['academicYear'] as Map?)?['id']
                                                  ?.toString() ==
                                              _selectedAy)
                                      .toList())
                                  .map((o) => DropdownMenuItem(
                                      value: o['id']!, child: Text(o['name']!)))
                                  .toList(),
                              onChanged: (v) => setState(() {
                                _selectedTerm = v ?? 'all';
                                _saveFilters();
                              }),
                            ),
                          ),
                        ],
                      ),
                    ),

                    // Summary chips
                    Padding(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 12, vertical: 4),
                      child: Wrap(
                        spacing: 8,
                        runSpacing: 8,
                        children: [
                          _StatChip(
                              label: 'Items', value: '${summary['count']}'),
                          if (summary['avg'] != null)
                            _StatChip(
                                label: 'Avg',
                                value: (summary['avg'] as double)
                                    .toStringAsFixed(1)),
                          if (summary['avgPct'] != null)
                            _StatChip(
                                label: 'Avg %',
                                value:
                                    '${(summary['avgPct'] as double).toStringAsFixed(1)}%'),
                          if (summary['min'] != null)
                            _StatChip(
                                label: 'Min',
                                value: (summary['min'] as double)
                                    .toStringAsFixed(1)),
                          if (summary['max'] != null)
                            _StatChip(
                                label: 'Max',
                                value: (summary['max'] as double)
                                    .toStringAsFixed(1)),
                        ],
                      ),
                    ),

                    const SizedBox(height: 4),

                    // Grouped list by subject
                    ...groups.map((grp) {
                      final subject = grp['subject'] as String;
                      final rows =
                          (grp['rows'] as List).cast<Map<String, dynamic>>();
                      final color = _colorFor(subject);
                      return Padding(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 12, vertical: 6),
                        child: Card(
                          child: Padding(
                            padding: const EdgeInsets.all(12.0),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  children: [
                                    Expanded(
                                        child: Text(subject,
                                            style: const TextStyle(
                                                fontWeight: FontWeight.w600))),
                                    Container(
                                      padding: const EdgeInsets.symmetric(
                                          horizontal: 8, vertical: 2),
                                      decoration: BoxDecoration(
                                          color: color.withOpacity(0.1),
                                          borderRadius:
                                              BorderRadius.circular(10)),
                                      child: Text(subject,
                                          style: TextStyle(
                                              color: color, fontSize: 12)),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 8),
                                ...rows.map((g) {
                                  final exam =
                                      (((g['examSchedule'] as Map?)?['exam'])
                                                  as Map?)?['name']
                                              ?.toString() ??
                                          'Exam';
                                  final date =
                                      (g['examSchedule'] as Map?)?['date'];
                                  final comments =
                                      g['comments']?.toString() ?? '';
                                  final marksStr =
                                      g['marksObtained']?.toString() ?? '-';
                                  final maxMarks = ((g['examSchedule']
                                      as Map?)?['maxMarks']);
                                  final term = (g['term'] as Map?)?['name']
                                          ?.toString() ??
                                      '';
                                  final year =
                                      (g['academicYear'] as Map?)?['name']
                                              ?.toString() ??
                                          '';
                                  double? marksNum = double.tryParse(marksStr);
                                  if (marksNum == null &&
                                      g['marksObtained'] is num) {
                                    marksNum =
                                        (g['marksObtained'] as num).toDouble();
                                  }
                                  String? band;
                                  if (marksNum != null &&
                                      maxMarks is num &&
                                      maxMarks > 0) {
                                    final pct = (marksNum / maxMarks) * 100.0;
                                    band = _bandFor(pct);
                                  }

                                  return Padding(
                                    padding:
                                        const EdgeInsets.symmetric(vertical: 6),
                                    child: Column(
                                      crossAxisAlignment:
                                          CrossAxisAlignment.start,
                                      children: [
                                        ListTile(
                                          contentPadding: EdgeInsets.zero,
                                          title: Text(exam),
                                          subtitle: Text(
                                              '${date != null ? df.format(DateTime.parse(date)) : ''}  \u2022  $term $year\nRemarks: $comments'),
                                          trailing: Column(
                                            mainAxisAlignment:
                                                MainAxisAlignment.center,
                                            crossAxisAlignment:
                                                CrossAxisAlignment.end,
                                            children: [
                                              Text(marksStr,
                                                  style: const TextStyle(
                                                      fontWeight:
                                                          FontWeight.bold)),
                                              if (band != null)
                                                Text(band,
                                                    style: TextStyle(
                                                        color: color,
                                                        fontSize: 11)),
                                            ],
                                          ),
                                        ),
                                        if (marksNum != null &&
                                            maxMarks is num &&
                                            maxMarks > 0)
                                          LinearProgressIndicator(
                                            value: (marksNum /
                                                    (maxMarks.toDouble()))
                                                .clamp(0.0, 1.0),
                                            minHeight: 6,
                                            color: color,
                                            backgroundColor:
                                                color.withOpacity(0.15),
                                          ),
                                      ],
                                    ),
                                  );
                                }),
                              ],
                            ),
                          ),
                        ),
                      );
                    }).toList(),

                    if (groups.isEmpty)
                      const Padding(
                        padding: EdgeInsets.all(24.0),
                        child: Center(
                            child: Text(
                                'No grades found for the selected filters.')),
                      ),
                  ],
                ),
              );

    if (widget.showTitle) {
      return Scaffold(
        appBar: AppBar(
          title: Text('Grades \u2022 ${widget.studentName}'),
          actions: [
            IconButton(
                onPressed: _loading ? null : _load,
                icon: const Icon(Icons.refresh)),
            IconButton(
              tooltip: 'Export PDF',
              onPressed: _loading
                  ? null
                  : () => _exportPdf(_applyFilters(), widget.studentName),
              icon: const Icon(Icons.picture_as_pdf_outlined),
            )
          ],
        ),
        body: content,
      );
    }
    return content;
  }
}

class _StatChip extends StatelessWidget {
  final String label;
  final String value;
  const _StatChip({required this.label, required this.value});

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

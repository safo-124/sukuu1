import 'dart:convert';
import 'dart:typed_data';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:http/http.dart' as http;
import 'package:intl/intl.dart';
import 'package:fl_chart/fl_chart.dart';
import 'package:pdf/widgets.dart' as pw;
import 'package:printing/printing.dart' as printing;
import 'package:shared_preferences/shared_preferences.dart';
import '../api/parents_api.dart';
import 'package:path_provider/path_provider.dart';

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
  // Cached payload removed (was unused)
  // Display mode: show raw marks or percent
  bool _showPercent = true;
  String _selectedAy = 'all';
  String _selectedTerm = 'all';
  // Active child (for optional child switching in standalone)
  String? _activeStudentId;
  String? _activeStudentName;
  List<Map<String, dynamic>> _children = [];
  // Band thresholds (percent minimums)
  double _bandA = 80, _bandB = 70, _bandC = 60, _bandD = 50;
  // Analytics & rankings
  bool _loadingInsights = false;
  Map<String, dynamic>?
      _analytics; // { average: number, subjects: [...], predictions: {...} }
  List<Map<String, dynamic>> _subjectInsights = [];
  Map<String, dynamic>? _predictions; // keyed by subjectId
  Map<String, dynamic>?
      _ranking; // { position, sectionTotal, section{name}, term{name}, academicYear{name} }
  Map<String, dynamic>? _attendanceSummary; // from analytics.attendance
  List<Map<String, dynamic>> _benchmarks =
      <Map<String, dynamic>>[]; // from analytics.benchmarks
  // Parent goals per subject (percentage targets)
  final Map<String, double> _goals = {}; // key: subjectName
  final double _riskThreshold = 50.0; // percent
  final double _dropThreshold = 10.0; // percent points drop considered risky
  final Set<String> _pinnedSubjects = <String>{};

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

      final api =
          ParentsApiClient(baseUrl: baseUrl, token: token, schoolId: schoolId);
      // Try show cached payload immediately (if any)
      await _restoreCachedGrades();
      final json = await api.getChildrenGrades();
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
        // no-op
        // reset filters on fresh load
        _selectedAy = 'all';
        _selectedTerm = 'all';
        if (widget.allowChildSwitch) {
          final kids = children.cast<Map<String, dynamic>>().map((c) {
            final id = (c['studentId'] ?? c['id'])?.toString();
            final first = c['firstName'] ??
                (c['student'] is Map ? c['student']['firstName'] : null);
            final last = c['lastName'] ??
                (c['student'] is Map ? c['student']['lastName'] : null);
            final name = (c['name']?.toString() ??
                    ('${first ?? ''} ${last ?? ''}').trim())
                .trim();
            return {
              'id': id,
              'displayName': name,
            };
          }).toList();
          _children = kids;
          if (_activeStudentId == null && kids.isNotEmpty) {
            _activeStudentId =
                (kids.first['id'] ?? widget.studentId).toString();
            _activeStudentName = kids.first['displayName']?.toString();
          }
        }
      });
      await _prepareGoals();
      await _loadPinnedSubjects();
      // Persist cache for this student
      await _saveCachedGrades(json);
      await _restoreFilters();
      // Load analytics & rankings for the active student
      await _loadInsights();
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

  Future<void> _prepareGoals() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final sid = (_activeStudentId ?? widget.studentId).toString();
      final subjects = <String>{};
      for (final g in _records) {
        final name = (g['subject'] as Map?)?['name']?.toString();
        if (name != null && name.isNotEmpty) subjects.add(name);
      }
      bool changed = false;
      for (final s in subjects) {
        final key = _goalKey(sid, s);
        if (!_goals.containsKey(s)) {
          final v = prefs.getDouble(key) ??
              (prefs.getString(key) != null
                  ? double.tryParse(prefs.getString(key)!)
                  : null);
          if (v != null) {
            _goals[s] = v;
            changed = true;
          }
        }
      }
      if (changed && mounted) setState(() {});
    } catch (_) {}
  }

  String _goalKey(String studentId, String subjectName) =>
      'goal_${studentId}_${subjectName}';

  Future<void> _setGoalForSubject(String subjectName, {double? initial}) async {
    final controller = TextEditingController(
        text: initial != null ? initial.toStringAsFixed(1) : '');
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text('Set goal • $subjectName'),
        content: TextField(
          controller: controller,
          keyboardType: const TextInputType.numberWithOptions(decimal: true),
          decoration: const InputDecoration(
              labelText: 'Target percentage', suffixText: '%'),
        ),
        actions: [
          TextButton(
              onPressed: () => Navigator.of(ctx).pop(false),
              child: const Text('Cancel')),
          FilledButton(
              onPressed: () => Navigator.of(ctx).pop(true),
              child: const Text('Save')),
        ],
      ),
    );
    if (ok != true) return;
    final v = double.tryParse(controller.text.trim());
    if (v == null) return;
    try {
      final prefs = await SharedPreferences.getInstance();
      final sid = (_activeStudentId ?? widget.studentId).toString();
      await prefs.setDouble(_goalKey(sid, subjectName), v);
      setState(() {
        _goals[subjectName] = v;
      });
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
            content:
                Text('Goal set for $subjectName: ${v.toStringAsFixed(1)}%')));
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text('Failed to save goal: $e')));
      }
    }
  }

  Future<void> _loadPinnedSubjects() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final sid = (_activeStudentId ?? widget.studentId).toString();
      final raw = prefs.getString('pinned_subjects_$sid');
      _pinnedSubjects.clear();
      if (raw != null && raw.isNotEmpty) {
        for (final s in raw.split('\n')) {
          if (s.trim().isNotEmpty) _pinnedSubjects.add(s.trim());
        }
      }
      if (mounted) setState(() {});
    } catch (_) {}
  }

  Future<void> _togglePinSubject(String subject) async {
    try {
      if (_pinnedSubjects.contains(subject)) {
        _pinnedSubjects.remove(subject);
      } else {
        _pinnedSubjects.add(subject);
      }
      final prefs = await SharedPreferences.getInstance();
      final sid = (_activeStudentId ?? widget.studentId).toString();
      await prefs.setString('pinned_subjects_$sid', _pinnedSubjects.join('\n'));
      if (mounted) setState(() {});
    } catch (_) {}
  }

  double? _subjectAveragePercent(List<Map<String, dynamic>> rows) {
    double sum = 0;
    int count = 0;
    for (final g in rows) {
      final maxMarks = ((g['examSchedule'] as Map?)?['maxMarks']);
      final marksStr = g['marksObtained']?.toString() ?? '';
      double? marksNum = double.tryParse(marksStr);
      if (marksNum == null && g['marksObtained'] is num) {
        marksNum = (g['marksObtained'] as num).toDouble();
      }
      if (marksNum != null && maxMarks is num && maxMarks > 0) {
        sum += (marksNum / maxMarks) * 100.0;
        count += 1;
      }
    }
    if (count == 0) return null;
    return sum / count;
  }

  List<Map<String, dynamic>> _computeAtRiskBySubject(
      List<Map<String, dynamic>> groups) {
    final risks = <Map<String, dynamic>>[];
    for (final grp in groups) {
      final subject = grp['subject'] as String;
      final rows = (grp['rows'] as List).cast<Map<String, dynamic>>();
      final reasons = <String>[];
      // Any low score?
      for (final g in rows) {
        final maxMarks = ((g['examSchedule'] as Map?)?['maxMarks']);
        final marksStr = g['marksObtained']?.toString() ?? '';
        double? marksNum = double.tryParse(marksStr);
        if (marksNum == null && g['marksObtained'] is num) {
          marksNum = (g['marksObtained'] as num).toDouble();
        }
        if (marksNum != null && maxMarks is num && maxMarks > 0) {
          final pct = (marksNum / maxMarks) * 100.0;
          if (pct < _riskThreshold) {
            reasons.add('Score below ${_riskThreshold.toStringAsFixed(0)}%');
            break;
          }
        }
      }
      // Trend drop over last 3 attempts?
      final sorted = [...rows];
      sorted.sort((a, b) {
        final ad = (a['examSchedule'] as Map?)?['date']?.toString();
        final bd = (b['examSchedule'] as Map?)?['date']?.toString();
        return (DateTime.tryParse(ad ?? '') ?? DateTime(0))
            .compareTo(DateTime.tryParse(bd ?? '') ?? DateTime(0));
      });
      if (sorted.length >= 3) {
        double? pct(int idx) {
          final g = sorted[idx];
          final maxMarks = ((g['examSchedule'] as Map?)?['maxMarks']);
          final marksStr = g['marksObtained']?.toString() ?? '';
          double? marksNum = double.tryParse(marksStr);
          if (marksNum == null && g['marksObtained'] is num) {
            marksNum = (g['marksObtained'] as num).toDouble();
          }
          if (marksNum != null && maxMarks is num && maxMarks > 0) {
            return (marksNum / maxMarks) * 100.0;
          }
          return null;
        }

        final pLast = pct(sorted.length - 1);
        final pPrev = pct(sorted.length - 2);
        if (pLast != null &&
            pPrev != null &&
            (pPrev - pLast) >= _dropThreshold) {
          reasons
              .add('Recent drop of ≥ ${_dropThreshold.toStringAsFixed(0)} pts');
        }
      }
      if (reasons.isNotEmpty) {
        risks.add({'subject': subject, 'reasons': reasons});
      }
    }
    return risks;
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

  Future<void> _saveCachedGrades(Map<String, dynamic> payload) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final sid = (_activeStudentId ?? widget.studentId).toString();
      await prefs.setString('cached_children_grades_$sid', jsonEncode(payload));
    } catch (_) {}
  }

  Future<void> _restoreCachedGrades() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final sid = (_activeStudentId ?? widget.studentId).toString();
      final raw = prefs.getString('cached_children_grades_$sid');
      if (raw == null) return;
      final json = jsonDecode(raw) as Map<String, dynamic>;
      final children = (json['children'] as List?) ?? [];
      final targetId = (_activeStudentId ?? widget.studentId).toString();
      final my = children
          .cast<Map<String, dynamic>>()
          .where((s) => s['studentId'].toString() == targetId)
          .toList();
      final grades = my.isNotEmpty
          ? (my.first['grades'] as List? ?? []).cast<Map<String, dynamic>>()
          : <Map<String, dynamic>>[];
      if (grades.isNotEmpty && mounted) {
        setState(() {
          _records = grades;
          // no-op
        });
      }
    } catch (_) {}
  }

  Future<void> _saveFilters() async {
    final prefs = await SharedPreferences.getInstance();
    final sid = (_activeStudentId ?? widget.studentId).toString();
    await prefs.setString('grades_filter_ay_$sid', _selectedAy);
    await prefs.setString('grades_filter_term_$sid', _selectedTerm);
    // After saving filters, refresh insights (analytics + rankings)
    await _loadInsights();
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

  // Build query params from selected filters
  Map<String, String> _currentFilterQuery() {
    final qp = <String, String>{};
    if (_selectedAy != 'all') qp['academicYearId'] = _selectedAy;
    if (_selectedTerm != 'all') qp['termId'] = _selectedTerm;
    return qp;
  }

  Future<void> _loadInsights() async {
    // Fetch analytics and rankings for the active student using the new parent APIs
    final studentId = (_activeStudentId ?? widget.studentId).toString();
    try {
      setState(() {
        _loadingInsights = true;
      });
      final baseUrl = await _storage.read(key: 'baseUrl');
      final token = await _storage.read(key: 'token');
      final schoolId = await _storage.read(key: 'schoolId');
      if (baseUrl == null || token == null || schoolId == null) return;
      final api =
          ParentsApiClient(baseUrl: baseUrl, token: token, schoolId: schoolId);

      final qp = _currentFilterQuery();
      final aResJson = await api.getChildrenAnalytics(
        academicYearId: qp['academicYearId'],
        termId: qp['termId'],
      );
      Map<String, dynamic>? analytics; // for the active student
      List<Map<String, dynamic>> subjectInsights = [];
      Map<String, dynamic>? predictions;
      final kids =
          (aResJson['children'] as List? ?? []).cast<Map<String, dynamic>>();
      final mine = kids.firstWhere(
          (k) => (k['student']?['id']?.toString() ?? '') == studentId,
          orElse: () => {});
      if (mine.isNotEmpty) {
        analytics = (mine['analytics'] as Map?)?.cast<String, dynamic>();
        final subs = (analytics?['subjects'] as List? ?? [])
            .cast<Map>()
            .map((e) => e.cast<String, dynamic>())
            .toList();
        subjectInsights = subs;
        predictions =
            (analytics?['predictions'] as Map?)?.cast<String, dynamic>();
        _attendanceSummary =
            (analytics?['attendance'] as Map?)?.cast<String, dynamic>();
        _benchmarks = (analytics?['benchmarks'] as List? ?? [])
            .cast<Map>()
            .map((e) => e.cast<String, dynamic>())
            .toList();
      }

      // Rankings
      final rResJson = await api.getChildrenRankings(
        academicYearId: qp['academicYearId'],
        termId: qp['termId'],
      );
      Map<String, dynamic>? rankingForStudent;
      final arr =
          (rResJson['rankings'] as List? ?? []).cast<Map<String, dynamic>>();
      final mineR =
          arr.where((e) => e['studentId']?.toString() == studentId).toList();
      if (mineR.isNotEmpty) {
        mineR.sort((a, b) {
          final as = a['computedAt']?.toString();
          final bs = b['computedAt']?.toString();
          if (as == null || bs == null) return 0;
          return (DateTime.tryParse(bs) ?? DateTime(0))
              .compareTo(DateTime.tryParse(as) ?? DateTime(0));
        });
        rankingForStudent = mineR.first;
      }

      setState(() {
        _analytics = analytics;
        _subjectInsights = subjectInsights;
        _predictions = predictions;
        _ranking = rankingForStudent;
      });
    } catch (_) {
      // swallow insights errors; keep grades visible
    } finally {
      if (mounted) {
        setState(() {
          _loadingInsights = false;
        });
      }
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
    final _df = DateFormat('yyyy-MM-dd');
    final doc = pw.Document();
    final groups = _groupBySubject(filtered);
    // Compute at-risk banner data (computed later inline when needed)
    // Compute last updated date
    DateTime? lastUpdated;
    for (final g in filtered) {
      final d = (g['examSchedule'] as Map?)?['date']?.toString();
      final dt = d != null ? DateTime.tryParse(d) : null;
      if (dt != null && (lastUpdated == null || dt.isAfter(lastUpdated))) {
        lastUpdated = dt;
      }
    }
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
                                    ? _df.format(DateTime.parse(date))
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
    try {
      await printing.Printing.sharePdf(bytes: bytes, filename: filename);
    } catch (_) {
      // Fallback: save locally and notify the user
      Directory? dir;
      try {
        dir = await getDownloadsDirectory();
      } catch (_) {}
      dir ??= await getApplicationDocumentsDirectory();
      final file = File('${dir.path}/$filename');
      await file.writeAsBytes(bytes, flush: true);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Saved PDF to ${file.path}')),
        );
      }
    }
  }

  // Navigate to a subject trend page built from current filtered records
  void _openSubjectTrend(BuildContext context, String subjectName) {
    final df = DateFormat('yyyy-MM-dd');
    final filtered = _applyFilters()
        .where(
            (g) => (g['subject'] as Map?)?['name']?.toString() == subjectName)
        .toList();
    filtered.sort((a, b) {
      final ad = (a['examSchedule'] as Map?)?['date']?.toString();
      final bd = (b['examSchedule'] as Map?)?['date']?.toString();
      return (ad ?? '').compareTo(bd ?? '');
    });
    final points = <Map<String, dynamic>>[];
    for (final g in filtered) {
      final dateStr = (g['examSchedule'] as Map?)?['date']?.toString();
      final maxMarks = ((g['examSchedule'] as Map?)?['maxMarks']);
      final marksStr = g['marksObtained']?.toString() ?? '0';
      double? marksNum = double.tryParse(marksStr);
      if (marksNum == null && g['marksObtained'] is num) {
        marksNum = (g['marksObtained'] as num).toDouble();
      }
      double? pct;
      if (marksNum != null && maxMarks is num && maxMarks > 0) {
        pct = (marksNum / maxMarks) * 100.0;
      }
      points.add({
        'date': dateStr,
        'marks': marksNum,
        'percent': pct,
      });
    }
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => Scaffold(
          appBar: AppBar(title: Text('Trend • $subjectName')),
          body: ListView(
            padding: const EdgeInsets.all(12),
            children: [
              if (points.length >= 2)
                SizedBox(
                  height: 220,
                  child: LineChart(
                    LineChartData(
                      gridData: const FlGridData(show: false),
                      borderData: FlBorderData(show: false),
                      titlesData: const FlTitlesData(show: false),
                      minY: 0,
                      maxY: 100,
                      lineBarsData: [
                        LineChartBarData(
                          isCurved: true,
                          color: Theme.of(context).colorScheme.primary,
                          barWidth: 3,
                          dotData: const FlDotData(show: true),
                          spots: [
                            for (int i = 0; i < points.length; i++)
                              if (points[i]['percent'] != null)
                                FlSpot(
                                    i.toDouble(),
                                    (points[i]['percent'] as double)
                                        .clamp(0, 100)),
                          ],
                        ),
                      ],
                    ),
                  ),
                ),
              const SizedBox(height: 12),
              const Text('Attempts',
                  style: TextStyle(fontWeight: FontWeight.w600)),
              const Divider(height: 16),
              ...List.generate(points.length, (i) {
                final p = points[i];
                final ds = p['date'] != null
                    ? df.format(DateTime.parse(p['date']))
                    : '-';
                final marks = p['marks'] as double?;
                final pct = p['percent'] as double?;
                return ListTile(
                  leading: CircleAvatar(child: Text('${i + 1}')),
                  title: Text(ds),
                  subtitle: Text('Marks: ${marks?.toStringAsFixed(1) ?? '-'}'),
                  trailing: Text('${pct?.toStringAsFixed(1) ?? '-'}%'),
                );
              }),
            ],
          ),
        ),
      ),
    );
  }

  List<Map<String, dynamic>> _groupBySubject(List<Map<String, dynamic>> list) {
    final map = <String, List<Map<String, dynamic>>>{};
    for (final g in list) {
      final subj = (g['subject'] as Map?)?['name']?.toString() ?? 'Subject';
      map.putIfAbsent(subj, () => []);
      map[subj]!.add(g);
    }
    final arr =
        map.entries.map((e) => {'subject': e.key, 'rows': e.value}).toList();
    arr.sort((a, b) {
      final sa = (a['subject'] as String);
      final sb = (b['subject'] as String);
      final pa = _pinnedSubjects.contains(sa) ? 0 : 1;
      final pb = _pinnedSubjects.contains(sb) ? 0 : 1;
      if (pa != pb) return pa - pb; // pinned first
      return sa.compareTo(sb);
    });
    return arr;
  }

  Widget _legendChip(String label, Color color) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: color.withOpacity(0.08),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: color.withOpacity(0.3)),
      ),
      child: Text(label, style: TextStyle(color: color, fontSize: 12)),
    );
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
    final filtered = _applyFilters();
    final summary = _computeSummary(filtered);
    final groups = _groupBySubject(filtered);
    // compute risks and last updated here for later use
    // final _risks = _computeAtRiskBySubject(groups); // computed on-demand for banners
    DateTime? _lastUpdated;
    for (final g in filtered) {
      final d = (g['examSchedule'] as Map?)?['date']?.toString();
      final dt = d != null ? DateTime.tryParse(d) : null;
      if (dt != null && (_lastUpdated == null || dt.isAfter(_lastUpdated))) {
        _lastUpdated = dt;
      }
    }

    Widget content = _loading
        ? const Center(child: CircularProgressIndicator())
        : _error != null
            ? Center(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 16.0),
                      child: Text(_error!,
                          textAlign: TextAlign.center,
                          style: const TextStyle(color: Colors.red)),
                    ),
                    const SizedBox(height: 12),
                    ElevatedButton.icon(
                      onPressed: _load,
                      icon: const Icon(Icons.refresh),
                      label: const Text('Retry'),
                    ),
                  ],
                ),
              )
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
                                      c['displayName']?.toString() ?? '';
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
                                        : (sel['displayName']?.toString() ??
                                            '');
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
                    // Removed duplicate in-content export buttons to reduce clutter.
                    // Insights header: Scope + Average + Position (if available)
                    if (_loadingInsights)
                      const Padding(
                        padding:
                            EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                        child: LinearProgressIndicator(minHeight: 2),
                      )
                    else if (_analytics != null || _ranking != null)
                      Padding(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 12, vertical: 6),
                        child: Card(
                          child: Padding(
                            padding: const EdgeInsets.all(12.0),
                            child: Row(
                              children: [
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                      // Scope line
                                      Builder(builder: (context) {
                                        String ayName = 'All Years';
                                        String termName = 'All Terms';
                                        if (_selectedAy != 'all') {
                                          final ayOpt = _buildAyOptions()
                                              .firstWhere(
                                                  (o) => o['id'] == _selectedAy,
                                                  orElse: () =>
                                                      {'name': _selectedAy});
                                          ayName = ayOpt['name'] ?? _selectedAy;
                                        }
                                        if (_selectedTerm != 'all') {
                                          final termOpt = _buildTermOptions(_records
                                                  .where((g) =>
                                                      _selectedAy == 'all' ||
                                                      (g['academicYear']
                                                                      as Map?)?[
                                                                  'id']
                                                              ?.toString() ==
                                                          _selectedAy)
                                                  .toList())
                                              .firstWhere(
                                                  (o) =>
                                                      o['id'] == _selectedTerm,
                                                  orElse: () =>
                                                      {'name': _selectedTerm});
                                          termName =
                                              termOpt['name'] ?? _selectedTerm;
                                        }
                                        return Text(
                                            'Scope: $ayName • $termName',
                                            style: TextStyle(
                                                color: Theme.of(context)
                                                    .colorScheme
                                                    .onSurface
                                                    .withOpacity(0.7),
                                                fontSize: 12));
                                      }),
                                      const SizedBox(height: 6),
                                      const Text('Performance Overview',
                                          style: TextStyle(
                                              fontWeight: FontWeight.w600)),
                                      const SizedBox(height: 6),
                                      if (_analytics?['average'] is num)
                                        Text(
                                          'Average: ${(_analytics!['average'] as num).toStringAsFixed(1)}%',
                                          style: TextStyle(
                                              color: Theme.of(context)
                                                  .colorScheme
                                                  .primary,
                                              fontWeight: FontWeight.w600),
                                        ),
                                    ],
                                  ),
                                ),
                                if (_ranking != null)
                                  _PositionBadge(
                                    position: (_ranking!['position'] as num?)
                                            ?.toInt() ??
                                        null,
                                    total: (_ranking!['sectionTotal'] as num?)
                                            ?.toInt() ??
                                        null,
                                    label: (_ranking?['section']?['name']
                                            ?.toString() ??
                                        'Section'),
                                  ),
                              ],
                            ),
                          ),
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
                          const SizedBox(width: 8),
                          // Toggle raw/%
                          Tooltip(
                            message: _showPercent
                                ? 'Showing %; tap to show raw'
                                : 'Showing raw; tap to show %',
                            child: IconButton(
                              onPressed: () =>
                                  setState(() => _showPercent = !_showPercent),
                              icon: Icon(
                                  _showPercent ? Icons.percent : Icons.numbers),
                              color: Theme.of(context).colorScheme.primary,
                            ),
                          ),
                          // Overflow actions (Export PDF/CSV)
                          PopupMenuButton<String>(
                            tooltip: 'More actions',
                            onSelected: (value) {
                              final current = _applyFilters();
                              switch (value) {
                                case 'pdf':
                                  _exportPdf(current,
                                      _activeStudentName ?? widget.studentName);
                                  break;
                              }
                            },
                            itemBuilder: (ctx) => [
                              const PopupMenuItem(
                                value: 'pdf',
                                child: Row(
                                  children: [
                                    Icon(Icons.picture_as_pdf_outlined,
                                        size: 18),
                                    SizedBox(width: 8),
                                    Text('Export PDF'),
                                  ],
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),

                    // Attendance summary and class benchmarks
                    if (_attendanceSummary != null || _benchmarks.isNotEmpty)
                      Padding(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 12, vertical: 2),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            if (_attendanceSummary != null)
                              Row(
                                children: [
                                  const Icon(Icons.insights,
                                      size: 18, color: Colors.teal),
                                  const SizedBox(width: 6),
                                  Text(
                                    'Attendance (60d): '
                                    '${(((_attendanceSummary!['attendanceRate'] as num?) != null) ? (((_attendanceSummary!['attendanceRate'] as num) * 100).toStringAsFixed(0)) : '—')}%',
                                  ),
                                  const SizedBox(width: 12),
                                  Text(
                                      'P ${_attendanceSummary!['present'] ?? 0} · A ${_attendanceSummary!['absent'] ?? 0} · L ${_attendanceSummary!['late'] ?? 0}',
                                      style: Theme.of(context)
                                          .textTheme
                                          .bodySmall
                                          ?.copyWith(color: Colors.black54)),
                                ],
                              ),
                            if (_benchmarks.isNotEmpty)
                              Padding(
                                padding: const EdgeInsets.only(top: 6),
                                child: Wrap(
                                  spacing: 8,
                                  runSpacing: 8,
                                  children: _benchmarks.take(3).map((b) {
                                    final name = b['subjectName']?.toString() ??
                                        'Subject';
                                    final avg =
                                        (b['classAverage'] as num?)?.toDouble();
                                    return Chip(
                                      label: Text(
                                          '$name avg: ${avg != null ? avg.toStringAsFixed(1) : '—'}'),
                                      backgroundColor:
                                          Colors.blueGrey.withOpacity(0.08),
                                    );
                                  }).toList(),
                                ),
                              ),
                          ],
                        ),
                      ),

                    // Band legend and last updated
                    Padding(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 12, vertical: 2),
                      child: Row(
                        children: [
                          Expanded(
                            child: Wrap(
                              spacing: 8,
                              runSpacing: 6,
                              children: [
                                _legendChip('A ≥ ${_bandA.toStringAsFixed(0)}%',
                                    Colors.green),
                                _legendChip('B ≥ ${_bandB.toStringAsFixed(0)}%',
                                    Colors.blue),
                                _legendChip('C ≥ ${_bandC.toStringAsFixed(0)}%',
                                    Colors.orange),
                                _legendChip('D ≥ ${_bandD.toStringAsFixed(0)}%',
                                    Colors.amber),
                                _legendChip('F < ${_bandD.toStringAsFixed(0)}%',
                                    Colors.red),
                              ],
                            ),
                          ),
                          if (_lastUpdated != null)
                            Text(
                                'Updated ${DateFormat('yyyy-MM-dd').format(_lastUpdated)}',
                                style: const TextStyle(
                                    fontSize: 12, color: Colors.black54)),
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
                              label: 'Items',
                              value: '${summary['count']}',
                              icon: Icons.list_alt),
                          if (summary['avg'] != null)
                            _StatChip(
                                label: 'Avg',
                                value: (summary['avg'] as double)
                                    .toStringAsFixed(1),
                                icon: Icons.bar_chart),
                          if (summary['avgPct'] != null)
                            _StatChip(
                                label: 'Avg %',
                                value:
                                    '${(summary['avgPct'] as double).toStringAsFixed(1)}%',
                                icon: Icons.percent),
                          if (summary['min'] != null)
                            _StatChip(
                                label: 'Min',
                                value: (summary['min'] as double)
                                    .toStringAsFixed(1),
                                icon: Icons.trending_down),
                          if (summary['max'] != null)
                            _StatChip(
                                label: 'Max',
                                value: (summary['max'] as double)
                                    .toStringAsFixed(1),
                                icon: Icons.trending_up),
                        ],
                      ),
                    ),

                    // Term summaries (quick card)
                    Builder(builder: (context) {
                      final termSummaries = _computeTermSummaries(filtered);
                      if (termSummaries.isEmpty) return const SizedBox();
                      return Padding(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 12, vertical: 6),
                        child: Card(
                          child: Padding(
                            padding: const EdgeInsets.all(12.0),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Text('Term Summary',
                                    style:
                                        TextStyle(fontWeight: FontWeight.w600)),
                                const SizedBox(height: 8),
                                ...termSummaries.entries.map((e) {
                                  final v = e.value;
                                  final avg = v['avg'] as double?;
                                  final min = v['min'] as double?;
                                  final max = v['max'] as double?;
                                  final top = v['topSubject']?.toString() ?? '';
                                  return Padding(
                                    padding:
                                        const EdgeInsets.symmetric(vertical: 6),
                                    child: Column(
                                      crossAxisAlignment:
                                          CrossAxisAlignment.start,
                                      children: [
                                        Text(e.key,
                                            style: const TextStyle(
                                                fontWeight: FontWeight.w600)),
                                        const SizedBox(height: 4),
                                        Wrap(
                                          spacing: 8,
                                          runSpacing: 6,
                                          children: [
                                            if (avg != null)
                                              Text(
                                                  'Avg: ${avg.toStringAsFixed(1)}'),
                                            Text(
                                                'Min/Max: ${min?.toStringAsFixed(1) ?? '-'} / ${max?.toStringAsFixed(1) ?? '-'}'),
                                            if (top.isNotEmpty)
                                              Container(
                                                padding:
                                                    const EdgeInsets.symmetric(
                                                        horizontal: 8,
                                                        vertical: 2),
                                                decoration: BoxDecoration(
                                                  color: Theme.of(context)
                                                      .colorScheme
                                                      .primary
                                                      .withOpacity(0.08),
                                                  borderRadius:
                                                      BorderRadius.circular(10),
                                                ),
                                                child: Text('Top: $top',
                                                    style: TextStyle(
                                                        color: Theme.of(context)
                                                            .colorScheme
                                                            .primary,
                                                        fontSize: 12)),
                                              ),
                                          ],
                                        ),
                                      ],
                                    ),
                                  );
                                }).toList(),
                              ],
                            ),
                          ),
                        ),
                      );
                    }),

                    // At-risk banner
                    if (_computeAtRiskBySubject(groups).isNotEmpty)
                      Padding(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 12, vertical: 6),
                        child: Card(
                          color: Colors.red.withOpacity(0.04),
                          shape: RoundedRectangleBorder(
                              side: BorderSide(
                                  color: Colors.red.withOpacity(0.3)),
                              borderRadius: BorderRadius.circular(8)),
                          child: Padding(
                            padding: const EdgeInsets.all(12.0),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Text('Needs Attention',
                                    style: TextStyle(
                                        color: Colors.red,
                                        fontWeight: FontWeight.w600)),
                                const SizedBox(height: 6),
                                ..._computeAtRiskBySubject(groups).map((r) =>
                                    Padding(
                                      padding: const EdgeInsets.symmetric(
                                          vertical: 4.0),
                                      child: Row(
                                        children: [
                                          Expanded(
                                              child:
                                                  Text(r['subject'] as String)),
                                          Wrap(
                                            spacing: 6,
                                            children: (r['reasons'] as List)
                                                .map<Widget>((s) => Container(
                                                      padding: const EdgeInsets
                                                          .symmetric(
                                                          horizontal: 8,
                                                          vertical: 2),
                                                      decoration: BoxDecoration(
                                                          color: Colors.red
                                                              .withOpacity(
                                                                  0.08),
                                                          borderRadius:
                                                              BorderRadius
                                                                  .circular(
                                                                      10)),
                                                      child: Text(s,
                                                          style:
                                                              const TextStyle(
                                                                  color: Colors
                                                                      .red,
                                                                  fontSize:
                                                                      12)),
                                                    ))
                                                .toList(),
                                          )
                                        ],
                                      ),
                                    )),
                              ],
                            ),
                          ),
                        ),
                      ),

                    // Subject averages mini chart
                    if (_subjectInsights.isNotEmpty)
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
                                        final i = group.x;
                                        if (i < 0 ||
                                            i >= _subjectInsights.length)
                                          return null;
                                        final s = _subjectInsights[i];
                                        final name =
                                            s['subjectName']?.toString() ?? '';
                                        final avg = (s['average'] as num?)
                                                ?.toDouble() ??
                                            0.0;
                                        return BarTooltipItem(
                                            '$name\n${avg.toStringAsFixed(1)}%',
                                            const TextStyle(
                                                color: Colors.white));
                                      },
                                    ),
                                    touchCallback: (event, response) {
                                      if (!event.isInterestedForInteractions)
                                        return;
                                      final group =
                                          response?.spot?.touchedBarGroup;
                                      if (group == null) return;
                                      final i = group.x;
                                      if (i < 0 || i >= _subjectInsights.length)
                                        return;
                                      final s = _subjectInsights[i];
                                      final name =
                                          s['subjectName']?.toString() ?? '';
                                      _openSubjectTrend(context, name);
                                    },
                                  ),
                                  gridData: const FlGridData(show: false),
                                  borderData: FlBorderData(show: false),
                                  titlesData: FlTitlesData(
                                    leftTitles: const AxisTitles(
                                      sideTitles: SideTitles(
                                          showTitles: true, interval: 20),
                                    ),
                                    rightTitles: const AxisTitles(
                                      sideTitles: SideTitles(showTitles: false),
                                    ),
                                    topTitles: const AxisTitles(
                                      sideTitles: SideTitles(showTitles: false),
                                    ),
                                    bottomTitles: AxisTitles(
                                      sideTitles: SideTitles(
                                        showTitles: true,
                                        getTitlesWidget: (value, meta) {
                                          final i = value.toInt();
                                          if (i < 0 ||
                                              i >= _subjectInsights.length) {
                                            return const SizedBox.shrink();
                                          }
                                          final name = _subjectInsights[i]
                                                      ['subjectName']
                                                  ?.toString() ??
                                              '';
                                          final short = name.length > 6
                                              ? name.substring(0, 6)
                                              : name;
                                          return Padding(
                                            padding:
                                                const EdgeInsets.only(top: 6.0),
                                            child: Text(short,
                                                style: const TextStyle(
                                                    fontSize: 10)),
                                          );
                                        },
                                      ),
                                    ),
                                  ),
                                  barGroups: List.generate(
                                      _subjectInsights.length, (i) {
                                    final s = _subjectInsights[i];
                                    final avg =
                                        (s['average'] as num?)?.toDouble() ??
                                            0.0;
                                    final name =
                                        s['subjectName']?.toString() ?? '';
                                    final color = _colorFor(name);
                                    return BarChartGroupData(x: i, barRods: [
                                      BarChartRodData(
                                        toY: avg.clamp(0, 100),
                                        color: color,
                                        width: 14,
                                        borderRadius: const BorderRadius.only(
                                            topLeft: Radius.circular(4),
                                            topRight: Radius.circular(4)),
                                      ),
                                    ]);
                                  }),
                                  maxY: 100,
                                ),
                              ),
                            ),
                          ),
                        ),
                      ),
                    // Subject insights (from analytics)
                    if (_loadingInsights && _subjectInsights.isEmpty)
                      Padding(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 12, vertical: 6),
                        child: Card(
                          child: Padding(
                            padding: const EdgeInsets.all(12.0),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                // Simple skeletons
                                Container(
                                    height: 14,
                                    width: 120,
                                    color: Colors.black12),
                                const SizedBox(height: 12),
                                ...List.generate(
                                    3,
                                    (i) => Padding(
                                          padding: const EdgeInsets.symmetric(
                                              vertical: 8.0),
                                          child: Column(
                                            crossAxisAlignment:
                                                CrossAxisAlignment.start,
                                            children: [
                                              Container(
                                                  height: 12,
                                                  width: 160,
                                                  color: Colors.black12),
                                              const SizedBox(height: 6),
                                              LinearProgressIndicator(
                                                value: null,
                                                minHeight: 6,
                                                backgroundColor: Colors.black12,
                                              ),
                                            ],
                                          ),
                                        )),
                              ],
                            ),
                          ),
                        ),
                      )
                    else if (_subjectInsights.isNotEmpty)
                      Padding(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 12, vertical: 6),
                        child: Card(
                          child: Padding(
                            padding: const EdgeInsets.all(12.0),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Text('Subject Insights',
                                    style:
                                        TextStyle(fontWeight: FontWeight.w600)),
                                const SizedBox(height: 8),
                                ..._subjectInsights.map((s) {
                                  final subjectName =
                                      s['subjectName']?.toString() ?? 'Subject';
                                  final avg =
                                      (s['average'] as num?)?.toDouble();
                                  // predictions keyed by subjectId
                                  final sid = s['subjectId']?.toString();
                                  final pred = sid != null
                                      ? (_predictions?[sid]
                                          as Map<String, dynamic>?)
                                      : null;
                                  final trend = pred?['trend']?.toString();
                                  final nextTerm =
                                      (pred?['nextTerm'] as num?)?.toDouble();
                                  final band =
                                      avg != null ? _bandFor(avg) : null;
                                  final color = _colorFor(subjectName);
                                  IconData? trendIcon;
                                  Color trendColor = Colors.grey;
                                  if (trend == 'up') {
                                    trendIcon = Icons.trending_up;
                                    trendColor = Colors.green;
                                  } else if (trend == 'down') {
                                    trendIcon = Icons.trending_down;
                                    trendColor = Colors.red;
                                  } else if (trend == 'flat') {
                                    trendIcon = Icons.trending_flat;
                                    trendColor = Colors.orange;
                                  }
                                  return Padding(
                                    padding: const EdgeInsets.symmetric(
                                        vertical: 8.0),
                                    child: Column(
                                      crossAxisAlignment:
                                          CrossAxisAlignment.start,
                                      children: [
                                        Row(
                                          children: [
                                            Expanded(
                                              child: Text(subjectName,
                                                  style: const TextStyle(
                                                      fontWeight:
                                                          FontWeight.w500)),
                                            ),
                                            if (band != null)
                                              Container(
                                                padding:
                                                    const EdgeInsets.symmetric(
                                                        horizontal: 8,
                                                        vertical: 2),
                                                decoration: BoxDecoration(
                                                    color:
                                                        color.withOpacity(0.1),
                                                    borderRadius:
                                                        BorderRadius.circular(
                                                            10)),
                                                child: Text('Band $band',
                                                    style: TextStyle(
                                                        color: color,
                                                        fontSize: 12)),
                                              ),
                                            const SizedBox(width: 8),
                                            if (trendIcon != null)
                                              Icon(trendIcon,
                                                  size: 18, color: trendColor),
                                          ],
                                        ),
                                        const SizedBox(height: 6),
                                        if (avg != null)
                                          LinearProgressIndicator(
                                            value: (avg / 100).clamp(0.0, 1.0),
                                            minHeight: 6,
                                            color: color,
                                            backgroundColor:
                                                color.withOpacity(0.15),
                                          ),
                                        const SizedBox(height: 4),
                                        Row(
                                          mainAxisAlignment:
                                              MainAxisAlignment.spaceBetween,
                                          children: [
                                            Text(
                                                'Avg: ${avg?.toStringAsFixed(1) ?? '-'}%'),
                                            if (nextTerm != null)
                                              Text(
                                                  'Next term: ${nextTerm.toStringAsFixed(1)}%'),
                                          ],
                                        )
                                      ],
                                    ),
                                  );
                                }),
                              ],
                            ),
                          ),
                        ),
                      ),

                    const SizedBox(height: 4),

                    // Grouped list by subject
                    ...groups.map((grp) {
                      final subject = grp['subject'] as String;
                      final rows =
                          (grp['rows'] as List).cast<Map<String, dynamic>>();
                      final color = _colorFor(subject);
                      double? groupAvgPct() {
                        double total = 0;
                        int count = 0;
                        for (final g in rows) {
                          final maxMarks =
                              ((g['examSchedule'] as Map?)?['maxMarks']);
                          final marksStr = g['marksObtained']?.toString() ?? '';
                          double? marksNum = double.tryParse(marksStr);
                          if (marksNum == null && g['marksObtained'] is num) {
                            marksNum = (g['marksObtained'] as num).toDouble();
                          }
                          if (marksNum != null &&
                              maxMarks is num &&
                              maxMarks > 0) {
                            total += (marksNum / maxMarks) * 100.0;
                            count += 1;
                          }
                        }
                        if (count == 0) return null;
                        return total / count;
                      }

                      final avgPct = groupAvgPct();
                      return Padding(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 12, vertical: 6),
                        child: Card(
                          child: Padding(
                            padding: const EdgeInsets.all(12.0),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Row(
                                      children: [
                                        Expanded(
                                            child: Text(subject,
                                                style: const TextStyle(
                                                    fontWeight:
                                                        FontWeight.w600))),
                                        if (avgPct != null)
                                          Container(
                                            padding: const EdgeInsets.symmetric(
                                                horizontal: 8, vertical: 2),
                                            decoration: BoxDecoration(
                                                color: color.withOpacity(0.1),
                                                borderRadius:
                                                    BorderRadius.circular(10)),
                                            child: Text(
                                                'Avg ${avgPct.toStringAsFixed(1)}%',
                                                style: TextStyle(
                                                    color: color,
                                                    fontSize: 12)),
                                          ),
                                      ],
                                    ),
                                    const SizedBox(height: 8),
                                    Wrap(
                                      spacing: 4,
                                      runSpacing: 4,
                                      children: [
                                        IconButton(
                                          tooltip:
                                              _pinnedSubjects.contains(subject)
                                                  ? 'Unpin'
                                                  : 'Pin to top',
                                          icon: Icon(
                                            _pinnedSubjects.contains(subject)
                                                ? Icons.push_pin
                                                : Icons.push_pin_outlined,
                                            size: 18,
                                          ),
                                          onPressed: () =>
                                              _togglePinSubject(subject),
                                        ),
                                        IconButton(
                                          tooltip: 'View trend',
                                          icon: const Icon(Icons.show_chart,
                                              size: 18),
                                          onPressed: () => _openSubjectTrend(
                                              context, subject),
                                        ),
                                        TextButton.icon(
                                          onPressed: () async {
                                            final token = await _storage.read(
                                                key: 'token');
                                            final baseUrl = await _storage.read(
                                                key: 'baseUrl');
                                            final schoolId = await _storage
                                                .read(key: 'schoolId');
                                            if (token == null ||
                                                baseUrl == null ||
                                                schoolId == null) return;
                                            final api = ParentsApiClient(
                                                baseUrl: baseUrl,
                                                token: token,
                                                schoolId: schoolId);
                                            final sid = (_activeStudentId ??
                                                    widget.studentId)
                                                .toString();
                                            final titleController =
                                                TextEditingController(
                                                    text:
                                                        'Question about $subject');
                                            final bodyController =
                                                TextEditingController();
                                            final ok = await showDialog<bool>(
                                              context: context,
                                              builder: (ctx) => AlertDialog(
                                                title: const Text(
                                                    'Message teacher'),
                                                content: Column(
                                                  mainAxisSize:
                                                      MainAxisSize.min,
                                                  children: [
                                                    TextField(
                                                      controller:
                                                          titleController,
                                                      decoration:
                                                          const InputDecoration(
                                                              labelText:
                                                                  'Title'),
                                                    ),
                                                    const SizedBox(height: 8),
                                                    TextField(
                                                      controller:
                                                          bodyController,
                                                      maxLines: 5,
                                                      decoration:
                                                          const InputDecoration(
                                                              labelText:
                                                                  'Message'),
                                                    ),
                                                  ],
                                                ),
                                                actions: [
                                                  TextButton(
                                                      onPressed: () =>
                                                          Navigator.of(ctx)
                                                              .pop(false),
                                                      child:
                                                          const Text('Cancel')),
                                                  FilledButton(
                                                      onPressed: () =>
                                                          Navigator.of(ctx)
                                                              .pop(true),
                                                      child:
                                                          const Text('Send')),
                                                ],
                                              ),
                                            );
                                            if (ok == true) {
                                              try {
                                                await api.sendMessageToTeacher(
                                                  studentId: sid,
                                                  title: titleController.text
                                                          .trim()
                                                          .isEmpty
                                                      ? 'Message regarding $subject'
                                                      : titleController.text
                                                          .trim(),
                                                  content: bodyController.text
                                                      .trim(),
                                                );
                                                if (mounted) {
                                                  ScaffoldMessenger.of(context)
                                                      .showSnackBar(const SnackBar(
                                                          content: Text(
                                                              'Message sent to teacher')));
                                                }
                                              } catch (e) {
                                                if (mounted) {
                                                  ScaffoldMessenger.of(context)
                                                      .showSnackBar(SnackBar(
                                                          content: Text(
                                                              'Failed to send message: $e')));
                                                }
                                              }
                                            }
                                          },
                                          icon: const Icon(Icons.mail_outline,
                                              size: 18),
                                          label: const Text('Message'),
                                        ),
                                        Builder(builder: (_) {
                                          final goal = _goals[subject];
                                          return TextButton.icon(
                                            onPressed: () => _setGoalForSubject(
                                                subject,
                                                initial: goal),
                                            icon: const Icon(
                                                Icons.flag_outlined,
                                                size: 16),
                                            label: Text(goal != null
                                                ? 'Goal ${goal.toStringAsFixed(0)}%'
                                                : 'Set goal'),
                                          );
                                        }),
                                      ],
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
                                  final trailingTop = () {
                                    if (!_showPercent) return marksStr;
                                    if (marksNum != null &&
                                        maxMarks is num &&
                                        maxMarks > 0) {
                                      final pct = (marksNum / maxMarks) * 100.0;
                                      return '${pct.toStringAsFixed(1)}%';
                                    }
                                    return marksStr;
                                  }();

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
                                              '${date != null ? DateFormat('yyyy-MM-dd').format(DateTime.parse(date)) : ''}  \u2022  $term $year\nRemarks: $comments'),
                                          trailing: Column(
                                            mainAxisAlignment:
                                                MainAxisAlignment.center,
                                            crossAxisAlignment:
                                                CrossAxisAlignment.end,
                                            children: [
                                              Text(trailingTop,
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
                                        // Goal progress hint
                                        Builder(builder: (_) {
                                          final goal = _goals[subject];
                                          if (goal == null ||
                                              marksNum == null ||
                                              maxMarks is! num ||
                                              maxMarks <= 0) {
                                            return const SizedBox.shrink();
                                          }
                                          final pct =
                                              (marksNum / maxMarks) * 100.0;
                                          final delta = (goal - pct);
                                          final onTrack = delta <= 0;
                                          return Padding(
                                            padding:
                                                const EdgeInsets.only(top: 4.0),
                                            child: Align(
                                              alignment: Alignment.centerRight,
                                              child: Text(
                                                onTrack
                                                    ? 'On track'
                                                    : 'Needs +${delta.toStringAsFixed(1)}% to reach goal',
                                                style: TextStyle(
                                                    fontSize: 12,
                                                    color: onTrack
                                                        ? Colors.green
                                                        : Colors.orange),
                                              ),
                                            ),
                                          );
                                        }),
                                        if ((comments).length > 80)
                                          Align(
                                            alignment: Alignment.centerRight,
                                            child: TextButton(
                                              onPressed: () {
                                                showDialog(
                                                  context: context,
                                                  builder: (_) => AlertDialog(
                                                    title: Text(
                                                        'Remarks • $subject'),
                                                    content:
                                                        SingleChildScrollView(
                                                            child:
                                                                Text(comments)),
                                                    actions: [
                                                      TextButton(
                                                          onPressed: () =>
                                                              Navigator.of(
                                                                      context)
                                                                  .pop(),
                                                          child: const Text(
                                                              'Close')),
                                                    ],
                                                  ),
                                                );
                                              },
                                              child: const Text('Read more'),
                                            ),
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
                      Padding(
                        padding: const EdgeInsets.all(24.0),
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            const Text(
                                'No grades found for the selected filters.'),
                            const SizedBox(height: 8),
                            FilledButton.icon(
                              onPressed: () {
                                setState(() {
                                  _selectedAy = 'all';
                                  _selectedTerm = 'all';
                                });
                                _saveFilters();
                              },
                              icon: const Icon(Icons.filter_alt_off),
                              label: const Text('Clear filters'),
                            ),
                          ],
                        ),
                      ),
                  ],
                ),
              );

    if (widget.showTitle) {
      return Scaffold(
        appBar: AppBar(
          title:
              Text('Grades \u2022 ${_activeStudentName ?? widget.studentName}'),
          actions: [
            IconButton(
                onPressed: _loading ? null : _load,
                icon: const Icon(Icons.refresh)),
            IconButton(
              tooltip: _showPercent ? 'Show raw marks' : 'Show percentage',
              onPressed: _loading
                  ? null
                  : () => setState(() => _showPercent = !_showPercent),
              icon: Icon(_showPercent ? Icons.percent : Icons.numbers),
            ),
            IconButton(
              tooltip: 'Export PDF',
              onPressed: _loading
                  ? null
                  : () => _exportPdf(_applyFilters(),
                      _activeStudentName ?? widget.studentName),
              icon: const Icon(Icons.picture_as_pdf_outlined),
            ),
            // CSV export removed per request.
          ],
        ),
        body: content,
      );
    }
    return content;
  }
}

class _PositionBadge extends StatelessWidget {
  final int? position;
  final int? total;
  final String? label; // e.g., section name
  const _PositionBadge({this.position, this.total, this.label});

  @override
  Widget build(BuildContext context) {
    if (position == null || total == null) return const SizedBox.shrink();
    final text = 'Pos: $position/$total';
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: Colors.amber.withOpacity(0.15),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: Colors.amber.withOpacity(0.5)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          Text(text,
              style: const TextStyle(
                  color: Colors.amber, fontWeight: FontWeight.w600)),
          if (label != null)
            Text(label!,
                style: const TextStyle(color: Colors.amber, fontSize: 11))
        ],
      ),
    );
  }
}

class _StatChip extends StatelessWidget {
  final String label;
  final String value;
  final IconData? icon;
  const _StatChip({required this.label, required this.value, this.icon});

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

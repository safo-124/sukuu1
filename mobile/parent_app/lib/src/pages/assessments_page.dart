
import 'package:flutter/material.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../api/parents_api.dart';

class AssessmentsPage extends StatefulWidget {
	final String studentId;
	final String studentName;
	const AssessmentsPage({super.key, required this.studentId, required this.studentName});

	@override
	State<AssessmentsPage> createState() => _AssessmentsPageState();
}

class _AssessmentsPageState extends State<AssessmentsPage> {
	final _storage = const FlutterSecureStorage();
	bool _loading = true;
	String? _error;
	List<Map<String, dynamic>> _assessments = [];

	@override
	void initState() {
		super.initState();
		_load();
	}

	Future<void> _load() async {
		setState(() { _loading = true; _error = null; });
		try {
			final token = await _storage.read(key: 'token');
			final baseUrl = await _storage.read(key: 'baseUrl');
			final schoolId = await _storage.read(key: 'schoolId');
			if (token == null || baseUrl == null || schoolId == null) throw Exception('Missing auth');
			final api = ParentsApiClient(baseUrl: baseUrl, token: token, schoolId: schoolId);
			final json = await api.getChildrenAssessments(publishedOnly: true, includeUpcoming: true, limit: 200);
			final kids = (json['children'] as List? ?? []).cast<Map<String, dynamic>>();
			final me = kids.where((c) => c['studentId'].toString() == widget.studentId.toString()).toList();
			final list = me.isNotEmpty ? ((me.first['assessments'] as List? ?? []).cast<Map<String, dynamic>>()) : <Map<String, dynamic>>[];
			// Sort by date desc
			list.sort((a,b){
				final ad = DateTime.tryParse((a['date'] ?? '').toString()) ?? DateTime.fromMillisecondsSinceEpoch(0);
				final bd = DateTime.tryParse((b['date'] ?? '').toString()) ?? DateTime.fromMillisecondsSinceEpoch(0);
				return bd.compareTo(ad);
			});
			setState(() { _assessments = list; });
		} catch (e) {
			setState(() { _error = e.toString(); });
		} finally {
			setState(() { _loading = false; });
		}
	}

	@override
	Widget build(BuildContext context) {
		return Scaffold(
			appBar: AppBar(title: Text('Assessments • ${widget.studentName}'), actions: [
				IconButton(icon: const Icon(Icons.refresh), onPressed: _loading ? null : _load)
			]),
			body: _loading
					? const Center(child: CircularProgressIndicator())
					: _error != null
							? Center(child: Text(_error!, style: const TextStyle(color: Colors.red)))
							: _assessments.isEmpty
									? const Center(child: Text('No assessments yet'))
									: ListView.builder(
											itemCount: _assessments.length,
											itemBuilder: (context, index) {
												final a = _assessments[index];
												final type = (a['type'] ?? '').toString();
												final subj = ((a['subject'] as Map?)?['name'] ?? '').toString();
												final title = (a['title'] ?? '').toString();
												final max = a['maxMarks']?.toString() ?? '';
												final marks = a['marksObtained']?.toString() ?? '';
												final dateStr = (a['date'] ?? '').toString();
												final published = a['isPublished'] == true;
												final isUpcoming = marks.isEmpty || a['marksObtained'] == null;
												final trailing = published && marks.isNotEmpty
														? Text('$marks / $max', style: const TextStyle(fontWeight: FontWeight.w600))
														: Text(isUpcoming ? 'Upcoming' : 'Pending', style: const TextStyle(color: Colors.grey));
												return ListTile(
													leading: Icon(type == 'EXAM' ? Icons.menu_book : (type == 'TEST' ? Icons.quiz_outlined : Icons.assignment_outlined)),
													title: Text(title.isNotEmpty ? title : (type == 'EXAM' ? 'Exam' : type == 'TEST' ? 'Test' : 'Assignment')),
													subtitle: Text([subj, dateStr].where((s) => s.isNotEmpty).join(' • ')),
													trailing: trailing,
												);
											},
										),
		);
	}
}


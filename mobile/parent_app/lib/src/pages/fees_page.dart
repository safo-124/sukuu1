import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:http/http.dart' as http;
import 'package:intl/intl.dart';

class FeesPage extends StatefulWidget {
  final String studentId;
  final String studentName;
  final bool showTitle;
  const FeesPage(
      {super.key,
      required this.studentId,
      required this.studentName,
      this.showTitle = true});

  @override
  State<FeesPage> createState() => _FeesPageState();
}

class _FeesPageState extends State<FeesPage> {
  final _storage = const FlutterSecureStorage();
  bool _loading = true;
  String? _error;
  List<Map<String, dynamic>> _invoices = [];
  double _total = 0, _paid = 0, _due = 0;
  String? _baseUrl;
  String? _token;
  String? _schoolId;
  String _statusFilter = 'ALL';

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
        throw Exception('Missing auth');
      _token = token;
      _baseUrl = baseUrl;
      _schoolId = schoolId;
      final uri = Uri.parse(
              '$baseUrl/api/schools/$schoolId/parents/me/children/invoices')
          .replace(
        queryParameters:
            _statusFilter == 'ALL' ? null : {'status': _statusFilter},
      );
      final res = await http.get(
        uri,
        headers: {
          'Authorization': 'Bearer $token',
          'Accept': 'application/json'
        },
      );
      if (res.statusCode != 200) throw Exception('Failed: ${res.statusCode}');
      final json = jsonDecode(res.body) as Map<String, dynamic>;
      final children =
          (json['children'] as List? ?? []).cast<Map<String, dynamic>>();
      final selected = children.firstWhere(
        (c) => c['studentId'].toString() == widget.studentId,
        orElse: () => <String, dynamic>{},
      );
      final invoices =
          (selected['invoices'] as List? ?? []).cast<Map<String, dynamic>>();
      setState(() {
        _invoices = invoices;
        _total = (json['summary']?['total'] as num?)?.toDouble() ?? 0;
        _paid = (json['summary']?['paid'] as num?)?.toDouble() ?? 0;
        _due = (json['summary']?['due'] as num?)?.toDouble() ?? 0;
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

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  Widget build(BuildContext context) {
    final df = DateFormat('yyyy-MM-dd');
    if (widget.showTitle) {
      return Scaffold(
        appBar: AppBar(title: const Text('Fees & Invoices')),
        body: _buildBody(df),
      );
    }
    return _buildBody(df);
  }

  Widget _buildBody(DateFormat df) {
    if (_loading) return const Center(child: CircularProgressIndicator());
    if (_error != null) {
      return Center(
          child: Text(_error!, style: const TextStyle(color: Colors.red)));
    }
    return RefreshIndicator(
      onRefresh: _load,
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Row(
            children: [
              const Text('Filter:',
                  style: TextStyle(fontWeight: FontWeight.w600)),
              const SizedBox(width: 8),
              DropdownButton<String>(
                value: _statusFilter,
                items: const [
                  DropdownMenuItem(value: 'ALL', child: Text('All')),
                  DropdownMenuItem(value: 'PAID', child: Text('Paid')),
                  DropdownMenuItem(value: 'SENT', child: Text('Sent')),
                  DropdownMenuItem(
                      value: 'PARTIALLY_PAID', child: Text('Partially Paid')),
                  DropdownMenuItem(value: 'OVERDUE', child: Text('Overdue')),
                  DropdownMenuItem(value: 'DRAFT', child: Text('Draft')),
                  DropdownMenuItem(value: 'VOID', child: Text('Void')),
                  DropdownMenuItem(
                      value: 'CANCELLED', child: Text('Cancelled')),
                ],
                onChanged: (v) {
                  if (v == null) return;
                  setState(() => _statusFilter = v);
                  _load();
                },
              ),
            ],
          ),
          const SizedBox(height: 8),
          _SummaryCard(total: _total, paid: _paid, due: _due),
          const SizedBox(height: 16),
          const Text('Invoices',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
          const SizedBox(height: 8),
          if (_invoices.isEmpty)
            const Text('No invoices yet',
                style: TextStyle(color: Colors.black54)),
          ..._invoices.map((inv) {
            final status = (inv['status'] ?? '').toString();
            final dueAmt = (inv['totalAmount'] as num).toDouble() -
                (inv['paidAmount'] as num).toDouble();
            Color badge = Colors.grey;
            switch (status) {
              case 'PAID':
                badge = Colors.green;
                break;
              case 'OVERDUE':
                badge = Colors.red;
                break;
              case 'PARTIALLY_PAID':
                badge = Colors.orange;
                break;
              case 'SENT':
                badge = Colors.blue;
                break;
            }
            return Card(
              child: ListTile(
                title: Text(inv['invoiceNumber'] ?? inv['id']),
                subtitle: Text(
                    'Issue: ${_fmtDate(df, inv['issueDate'])}  •  Due: ${_fmtDate(df, inv['dueDate'])}'),
                trailing: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Text(
                        'GHS ${(inv['totalAmount'] as num).toStringAsFixed(2)}',
                        style: const TextStyle(fontWeight: FontWeight.bold)),
                    Text(
                        dueAmt > 0
                            ? 'Due: GHS ${dueAmt.toStringAsFixed(2)}'
                            : 'Settled',
                        style: TextStyle(
                            color: dueAmt > 0 ? Colors.red : Colors.green)),
                  ],
                ),
                leading: Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                      color: badge.withOpacity(0.15),
                      borderRadius: BorderRadius.circular(6)),
                  child: Text(status,
                      style: TextStyle(
                          color: badge,
                          fontSize: 12,
                          fontWeight: FontWeight.w600)),
                ),
                onTap: () => _showInvoiceDetails(context, df, inv),
                onLongPress:
                    dueAmt > 0 ? () => _promptPay(context, inv, dueAmt) : null,
              ),
            );
          }),
        ],
      ),
    );
  }

  String _fmtDate(DateFormat df, dynamic v) {
    final d = (v is String) ? DateTime.tryParse(v) : (v is DateTime ? v : null);
    return d != null ? df.format(d) : '-';
  }

  void _showInvoiceDetails(
      BuildContext context, DateFormat df, Map<String, dynamic> inv) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (ctx) {
        final items =
            (inv['items'] as List? ?? []).cast<Map<String, dynamic>>();
        final dueAmt = (inv['totalAmount'] as num).toDouble() -
            (inv['paidAmount'] as num).toDouble();
        return Padding(
          padding: const EdgeInsets.fromLTRB(16, 16, 16, 24 + 16),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(inv['invoiceNumber'] ?? inv['id'],
                      style: const TextStyle(
                          fontSize: 18, fontWeight: FontWeight.bold)),
                  Text('GHS ${(inv['totalAmount'] as num).toStringAsFixed(2)}',
                      style: const TextStyle(fontWeight: FontWeight.bold)),
                ],
              ),
              const SizedBox(height: 8),
              Text('Issue: ${_fmtDate(df, inv['issueDate'])}'),
              Text('Due: ${_fmtDate(df, inv['dueDate'])}'),
              const SizedBox(height: 12),
              const Text('Line Items',
                  style: TextStyle(fontWeight: FontWeight.w600)),
              const SizedBox(height: 6),
              if (items.isEmpty) const Text('No items'),
              ...items.map((it) => ListTile(
                    dense: true,
                    contentPadding: EdgeInsets.zero,
                    title: Text(it['description'] ?? 'Item'),
                    subtitle: Text(
                        'Qty ${it['quantity'] ?? 1} × GHS ${(it['unitPrice'] as num?)?.toStringAsFixed(2) ?? '-'}'),
                    trailing: Text(
                        'GHS ${(it['totalPrice'] as num?)?.toStringAsFixed(2) ?? '-'}'),
                  )),
              const Divider(height: 20),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text('Paid'),
                  Text('GHS ${(inv['paidAmount'] as num).toStringAsFixed(2)}'),
                ],
              ),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text('Outstanding'),
                  Text('GHS ${dueAmt.toStringAsFixed(2)}',
                      style: TextStyle(
                          color: dueAmt > 0 ? Colors.red : Colors.green)),
                ],
              ),
              const SizedBox(height: 12),
              if (dueAmt > 0)
                Align(
                  alignment: Alignment.centerRight,
                  child: FilledButton.icon(
                    onPressed: () {
                      Navigator.of(context).pop();
                      _promptPay(context, inv, dueAmt);
                    },
                    icon: const Icon(Icons.payments_outlined),
                    label: const Text('Pay Now'),
                  ),
                ),
            ],
          ),
        );
      },
    );
  }

  Future<void> _promptPay(
      BuildContext context, Map<String, dynamic> inv, double dueAmt) async {
    final amountCtl = TextEditingController(text: dueAmt.toStringAsFixed(2));
    final refCtl = TextEditingController();
    String method = 'MOBILE_MONEY';
    final formKey = GlobalKey<FormState>();
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Pay Invoice'),
        content: Form(
          key: formKey,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextFormField(
                controller: amountCtl,
                keyboardType:
                    const TextInputType.numberWithOptions(decimal: true),
                decoration: const InputDecoration(labelText: 'Amount (GHS)'),
                validator: (v) {
                  final n = double.tryParse((v ?? '').trim());
                  if (n == null || n <= 0) return 'Enter a valid amount';
                  if (n > dueAmt + 0.01) return 'Cannot exceed outstanding';
                  return null;
                },
              ),
              const SizedBox(height: 8),
              DropdownButtonFormField<String>(
                value: method,
                items: const [
                  DropdownMenuItem(
                      value: 'MOBILE_MONEY', child: Text('Mobile Money')),
                  DropdownMenuItem(
                      value: 'BANK_TRANSFER', child: Text('Bank Transfer')),
                  DropdownMenuItem(value: 'CASH', child: Text('Cash')),
                  DropdownMenuItem(
                      value: 'ONLINE_GATEWAY', child: Text('Online Gateway')),
                  DropdownMenuItem(value: 'OTHER', child: Text('Other')),
                ],
                onChanged: (v) {
                  if (v != null) method = v;
                },
                decoration: const InputDecoration(labelText: 'Method'),
              ),
              const SizedBox(height: 8),
              TextFormField(
                controller: refCtl,
                decoration: const InputDecoration(
                    labelText: 'Reference / Txn ID (optional)'),
              ),
            ],
          ),
        ),
        actions: [
          TextButton(
              onPressed: () => Navigator.of(ctx).pop(false),
              child: const Text('Cancel')),
          FilledButton(
              onPressed: () {
                if (formKey.currentState!.validate())
                  Navigator.of(ctx).pop(true);
              },
              child: const Text('Submit')),
        ],
      ),
    );
    if (ok != true) return;
    final amount = double.parse(amountCtl.text.trim());
    await _submitPayment(inv['id'] as String, amount, method,
        refCtl.text.trim().isEmpty ? null : refCtl.text.trim());
  }

  Future<void> _submitPayment(
      String invoiceId, double amount, String method, String? reference) async {
    try {
      if (_baseUrl == null || _token == null || _schoolId == null)
        throw Exception('Missing auth');
      final res = await http.post(
        Uri.parse(
            '$_baseUrl/api/schools/$_schoolId/parents/me/invoices/$invoiceId/pay'),
        headers: {
          'Authorization': 'Bearer $_token',
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: jsonEncode({
          'amount': amount,
          'method': method,
          if (reference != null) 'reference': reference
        }),
      );
      if (res.statusCode != 200) {
        final body = res.body;
        throw Exception(
            'Failed (${res.statusCode}) ${body.isNotEmpty ? body : ''}');
      }
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Payment submitted for review')));
      }
      await _load();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text('Error: $e')));
      }
    }
  }
}

class _SummaryCard extends StatelessWidget {
  final double total;
  final double paid;
  final double due;
  const _SummaryCard(
      {required this.total, required this.paid, required this.due});

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            _metric('Total', total, Colors.blueGrey),
            _metric('Paid', paid, Colors.green),
            _metric('Due', due, Colors.red),
          ],
        ),
      ),
    );
  }

  Widget _metric(String label, double value, Color color) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: const TextStyle(color: Colors.black54)),
        const SizedBox(height: 4),
        Text('GHS ${value.toStringAsFixed(2)}',
            style: TextStyle(color: color, fontWeight: FontWeight.w700)),
      ],
    );
  }
}

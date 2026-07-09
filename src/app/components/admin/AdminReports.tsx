import { useEffect, useMemo, useState } from 'react';
import { FileText, Download, Search, CalendarRange, BarChart4 } from 'lucide-react';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { listAuditLogs } from '../../lib/admin';
import { Pagination, usePagination } from './Pagination';

export function AdminReports() {
  const [search, setSearch] = useState('');
  const [logs, setLogs] = useState<Awaited<ReturnType<typeof listAuditLogs>>>([]);
  const [loading, setLoading] = useState(true);
  const { page, perPage, setPage, setPerPage, reset, paginate } = usePagination();

  const load = async () => {
    setLoading(true);
    try {
      setLogs(await listAuditLogs());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const filtered = useMemo(() => logs.filter(item => item.action.toLowerCase().includes(search.toLowerCase()) || item.entity_type.toLowerCase().includes(search.toLowerCase())), [logs, search]);

  useEffect(() => { reset(); }, [search]);

  if (loading) {
    return <div className="p-6 text-sm text-gray-500">Loading reports...</div>;
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="grid gap-4 md:grid-cols-4">
        {[
          { label: 'Generated', value: String(logs.length) },
          { label: 'Exports', value: String(logs.length > 0 ? 1 : 0) },
          { label: 'Scheduled', value: '9' },
          { label: 'Failed', value: '0' },
        ].map(item => (
          <Card key={item.label}>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-gray-900">{item.value}</div>
              <div className="text-sm text-gray-500">{item.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_320px] items-start">
        <div className="rounded-2xl border border-gray-200 bg-white">
          <div className="flex flex-col gap-4 border-b border-gray-200 p-4 md:flex-row md:items-center md:justify-between">
            <div className="relative md:max-w-md flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search reports..." className="pl-10" />
            </div>
            <div className="flex flex-wrap gap-2">
              <Select defaultValue="month">
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="day">Today</SelectItem>
                  <SelectItem value="week">This week</SelectItem>
                  <SelectItem value="month">This month</SelectItem>
                </SelectContent>
              </Select>
              <Button className="bg-red-600 hover:bg-red-700">
                <Download className="h-4 w-4" />
                Export
              </Button>
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Report</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Generated</TableHead>
                <TableHead>Owner</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginate(filtered).map(report => (
                <TableRow key={report.id}>
                  <TableCell>
                    <div className="flex items-center gap-2 font-medium text-gray-900">
                      <FileText className="h-4 w-4 text-red-600" />
                      {report.action}
                    </div>
                  </TableCell>
                  <TableCell>{report.entity_type}</TableCell>
                  <TableCell className="text-gray-500">{new Date(report.created_at).toLocaleDateString('en-IN')}</TableCell>
                  <TableCell>{report.ip_address ?? 'Admin'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Pagination total={filtered.length} page={page} perPage={perPage} onPageChange={setPage} onPerPageChange={setPerPage} />
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-gray-200 bg-white p-5">
            <div className="flex items-center gap-2 mb-4">
              <BarChart4 className="h-5 w-5 text-red-600" />
              <h3 className="text-lg font-semibold">Report Builder</h3>
            </div>
            <div className="space-y-3">
              <div className="rounded-xl border border-gray-200 p-4">
                <div className="text-sm font-medium text-gray-900">Traffic</div>
                <p className="text-sm text-gray-500">Sessions, pageviews, source mix.</p>
              </div>
              <div className="rounded-xl border border-gray-200 p-4">
                <div className="text-sm font-medium text-gray-900">Editorial</div>
                <p className="text-sm text-gray-500">Output, review time, author activity.</p>
              </div>
              <div className="rounded-xl border border-gray-200 p-4">
                <div className="text-sm font-medium text-gray-900">Security</div>
                <p className="text-sm text-gray-500">Logins, blocks, and access events.</p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5">
            <div className="flex items-center gap-2 mb-4">
              <CalendarRange className="h-5 w-5 text-red-600" />
              <h3 className="text-lg font-semibold">Scheduled Exports</h3>
            </div>
            <div className="space-y-3">
              {['Daily at 8:00 AM', 'Weekly Monday', 'Monthly 1st day'].map(item => (
                <div key={item} className="flex items-center justify-between rounded-xl border border-gray-200 p-3">
                  <span className="text-sm text-gray-700">{item}</span>
                  <Badge variant="secondary">Active</Badge>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}

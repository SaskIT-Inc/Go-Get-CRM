import React, { useState, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Upload, FileText, CheckCircle, AlertCircle, X } from 'lucide-react';
import { toast } from 'sonner';

function parseCsvText(text) {
  const lines = text.trim().split('\n');
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, '').toLowerCase());
  return lines.slice(1).map(line => {
    const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
    const obj = {};
    headers.forEach((h, i) => { obj[h] = values[i] || ''; });
    return obj;
  });
}

function mapRowToLead(row) {
  return {
    contact_name: row['contact_name'] || row['name'] || row['full_name'] || row['contact'] || 'Unknown',
    email: row['email'] || row['email_address'] || '',
    phone: row['phone'] || row['phone_number'] || row['mobile'] || '',
    company_name: row['company_name'] || row['company'] || row['business'] || '',
    lead_type: row['lead_type'] || 'Individual',
    pipeline_type: 'Cold Lead',
    lead_source: 'CSV Import',
    stage: 'New Lead',
    notes: row['notes'] || row['note'] || '',
    estimated_value: row['estimated_value'] ? Number(row['estimated_value']) : undefined
  };
}

export default function CsvImportModal({ open, onClose }) {
  const queryClient = useQueryClient();
  const fileRef = useRef(null);
  const [preview, setPreview] = useState([]);
  const [fileName, setFileName] = useState('');
  const [error, setError] = useState('');

  const importMutation = useMutation({
    mutationFn: async (leads) => {
      const created = await api.entities.Lead.bulkCreate(leads);
      // Log a csv_import activity for each lead
      const activityPromises = (Array.isArray(created) ? created : []).map(lead =>
        api.entities.Activity.create({
          lead_id: lead.id,
          activity_type: 'csv_import',
          title: 'Lead imported via CSV',
          details: `Imported into Cold Lead pipeline at "New Lead" stage`,
          performed_by: '',
          activity_date: new Date().toISOString()
        })
      );
      await Promise.all(activityPromises);
      return created;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['leads']);
      toast.success(`Successfully imported ${preview.length} leads into Cold Lead pipeline!`);
      handleClose();
    }
  });

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.name.endsWith('.csv')) {
      setError('Please upload a .csv file');
      return;
    }
    setError('');
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (evt) => {
      const rows = parseCsvText(evt.target.result);
      const mapped = rows.map(mapRowToLead).filter(l => l.contact_name && l.contact_name !== 'Unknown' || l.email);
      setPreview(mapped);
      if (mapped.length === 0) setError('No valid leads found. Ensure CSV has at least a "name" or "email" column.');
    };
    reader.readAsText(file);
  };

  const handleClose = () => {
    setPreview([]);
    setFileName('');
    setError('');
    if (fileRef.current) fileRef.current.value = '';
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5 text-blue-600" />
            Import Cold Leads via CSV
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Expected format note */}
          <div className="bg-slate-50 rounded-lg p-3 text-sm text-slate-600">
            <p className="font-semibold mb-1">Expected CSV columns (flexible):</p>
            <code className="text-xs">name/contact_name, email, phone, company_name, notes, estimated_value</code>
            <p className="mt-1 text-xs text-slate-500">All leads will be added to the <strong>Cold Lead</strong> pipeline at the <strong>New Lead</strong> stage.</p>
          </div>

          {/* File picker */}
          <div
            className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-all"
            onClick={() => fileRef.current?.click()}
          >
            <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleFile} />
            {fileName ? (
              <div className="flex items-center justify-center gap-2 text-blue-700">
                <FileText className="w-6 h-6" />
                <span className="font-semibold">{fileName}</span>
              </div>
            ) : (
              <>
                <Upload className="w-10 h-10 text-slate-400 mx-auto mb-2" />
                <p className="text-slate-600 font-medium">Click to upload CSV file</p>
                <p className="text-xs text-slate-400 mt-1">or drag and drop</p>
              </>
            )}
          </div>

          {error && (
            <div className="flex items-center gap-2 text-red-600 text-sm">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          )}

          {/* Preview */}
          {preview.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span className="text-sm font-semibold text-green-700">{preview.length} leads ready to import</span>
              </div>
              <div className="max-h-48 overflow-y-auto border rounded-lg">
                <table className="w-full text-xs">
                  <thead className="bg-slate-100 sticky top-0">
                    <tr>
                      <th className="text-left px-3 py-2 text-slate-600">Name</th>
                      <th className="text-left px-3 py-2 text-slate-600">Email</th>
                      <th className="text-left px-3 py-2 text-slate-600">Company</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.slice(0, 20).map((lead, i) => (
                      <tr key={i} className="border-t hover:bg-slate-50">
                        <td className="px-3 py-1.5">{lead.contact_name}</td>
                        <td className="px-3 py-1.5 text-slate-500">{lead.email}</td>
                        <td className="px-3 py-1.5 text-slate-500">{lead.company_name}</td>
                      </tr>
                    ))}
                    {preview.length > 20 && (
                      <tr><td colSpan={3} className="px-3 py-2 text-center text-slate-400">...and {preview.length - 20} more</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <Button
              className="flex-1"
              disabled={preview.length === 0 || importMutation.isPending}
              onClick={() => importMutation.mutate(preview)}
            >
              {importMutation.isPending ? 'Importing...' : `Import ${preview.length} Leads`}
            </Button>
            <Button variant="outline" onClick={handleClose}>Cancel</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Mail, Loader2, ListPlus } from 'lucide-react';
import { toast } from 'sonner';

function buildTemplate(lead) {
  const firstName = (lead?.contact_name || '').trim().split(/\s+/)[0] || 'there';
  return {
    subject: `Following up${lead?.company_name ? ` — ${lead.company_name}` : ''}`,
    body: `Hi ${firstName},\n\nJust checking in — wanted to follow up on your inquiry and see if you had any questions, or if now's a good time to chat.\n\nHappy to work around your schedule, just let me know what works.\n\nBest regards`,
  };
}

export default function EmailLeadModal({ lead, open, onClose, onSent }) {
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [selectedServiceIds, setSelectedServiceIds] = useState([]);
  const [sending, setSending] = useState(false);

  const { data: services = [] } = useQuery({
    queryKey: ['services'],
    queryFn: () => api.entities.Service.filter({ is_active: true }),
  });

  const { data: packages = [] } = useQuery({
    queryKey: ['packages'],
    queryFn: () => api.entities.Package.filter({ is_active: true }),
  });

  useEffect(() => {
    if (open && lead) {
      const template = buildTemplate(lead);
      setSubject(template.subject);
      setBody(template.body);
      setSelectedServiceIds([]);
    }
  }, [open, lead]);

  const toggleService = (id) => {
    setSelectedServiceIds((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  const insertFullPriceList = () => {
    const serviceLines = services.map((s) => `- ${s.service_name}${s.notes ? `: ${s.notes}` : ''}`);
    const packageLines = packages.map(
      (p) => `- ${p.name} (${p.price}${p.billing_frequency ? `, ${p.billing_frequency}` : ''})${p.description ? `\n  ${p.description.replace(/\n/g, '\n  ')}` : ''}`
    );
    const menu = [
      "Here's our current service menu and pricing:",
      '',
      'Services:',
      ...serviceLines,
      '',
      'Monthly Packages:',
      ...packageLines,
    ].join('\n');
    setBody((prev) => (prev.trim() ? `${prev}\n\n${menu}` : menu));
  };

  const handleSend = async () => {
    if (!lead?.email) {
      toast.error('This lead has no email address on file');
      return;
    }
    if (!subject.trim() || !body.trim()) {
      toast.error('Subject and message are required');
      return;
    }
    const selectedServices = services.filter((s) => selectedServiceIds.includes(s.id));
    const finalBody = selectedServices.length
      ? `${body}\n\nServices we discussed:\n${selectedServices.map((s) => `- ${s.service_name}${s.notes ? ` — ${s.notes}` : ''}`).join('\n')}`
      : body;
    setSending(true);
    try {
      await api.integrations.Core.SendEmail({ to: lead.email, subject, body: finalBody });
      toast.success(`Email sent to ${lead.email}`);
      onSent?.({ subject, services: selectedServices.map((s) => s.service_name) });
      onClose();
    } catch (error) {
      toast.error('Failed to send email: ' + error.message);
    } finally {
      setSending(false);
    }
  };

  if (!lead) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5" />
            Email {lead.contact_name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>To</Label>
            <Input value={lead.email || ''} disabled />
          </div>
          <div className="space-y-2">
            <Label>Subject</Label>
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Message</Label>
              {(services.length > 0 || packages.length > 0) && (
                <Button type="button" size="sm" variant="ghost" className="h-auto py-1 px-2 text-xs gap-1.5" onClick={insertFullPriceList}>
                  <ListPlus className="w-3.5 h-3.5" />
                  Insert full price list
                </Button>
              )}
            </div>
            <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={8} />
          </div>
          {services.length > 0 && (
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Reference Services (optional — appended to the email)
              </Label>
              <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                {services.map((service) => (
                  <button
                    key={service.id}
                    type="button"
                    onClick={() => toggleService(service.id)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                      selectedServiceIds.includes(service.id)
                        ? 'bg-navy text-white border-navy'
                        : 'bg-white text-slate-600 border-slate-300'
                    }`}
                  >
                    {service.service_name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSend} disabled={sending} className="gap-2">
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
            {sending ? 'Sending...' : 'Send Email'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

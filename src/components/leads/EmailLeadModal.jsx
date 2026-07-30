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
import { Mail, Loader2, ListPlus, X } from 'lucide-react';
import { toast } from 'sonner';

function buildTemplate(lead) {
  const firstName = (lead?.contact_name || '').trim().split(/\s+/)[0] || 'there';
  return {
    subject: `Following up${lead?.company_name ? ` — ${lead.company_name}` : ''}`,
    body: `Hi ${firstName},\n\nJust checking in — wanted to follow up on your inquiry and see if you had any questions, or if now's a good time to chat.\n\nHappy to work around your schedule, just let me know what works.\n\nBest regards`,
  };
}

// Single source of truth for the "Reference:" block — used for both the live
// preview shown in the modal and the actual email body on send, so what the
// user sees is exactly what gets sent.
function buildReferenceLines({ packages, selectedPackageIds, services, customBundles }) {
  const lines = [];

  packages
    .filter((pkg) => selectedPackageIds.includes(pkg.id))
    .forEach((pkg) => {
      const priceLabel = [pkg.price, pkg.billing_frequency].filter(Boolean).join(', ');
      lines.push(`- ${pkg.name}${priceLabel ? ` (${priceLabel})` : ''}`);
      if (pkg.description?.trim()) lines.push(`  ${pkg.description.trim()}`);
    });

  customBundles.forEach((bundle) => {
    const bundleServices = services.filter((s) => bundle.serviceIds.includes(s.id));
    const valueLabel = bundle.value ? ` (${bundle.value})` : '';
    if (bundleServices.length === 0) {
      if (!bundle.value) return;
      lines.push(`- Custom Item${valueLabel}`);
      return;
    }
    if (bundleServices.length === 1) {
      const s = bundleServices[0];
      lines.push(`- ${s.service_name}${valueLabel}`);
      if (s.notes?.trim()) lines.push(`  ${s.notes.trim()}`);
      return;
    }
    lines.push(`- Custom Services Package${valueLabel}:`);
    bundleServices.forEach((s) => {
      lines.push(`  • ${s.service_name}${s.notes ? ` — ${s.notes}` : ''}`);
    });
  });

  return lines;
}

export default function EmailLeadModal({ lead, open, onClose, onSent }) {
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [selectedPackageIds, setSelectedPackageIds] = useState([]);
  const [builderOpen, setBuilderOpen] = useState(false);
  const [draftServiceIds, setDraftServiceIds] = useState([]);
  const [draftValue, setDraftValue] = useState('');
  const [customBundles, setCustomBundles] = useState([]);
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
      setSelectedPackageIds([]);
      setBuilderOpen(false);
      setDraftServiceIds([]);
      setDraftValue('');
      setCustomBundles([]);
    }
  }, [open, lead]);

  const togglePackage = (id) => {
    setSelectedPackageIds((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  const toggleDraftServiceId = (id) => {
    setDraftServiceIds((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  const handleSetBundle = () => {
    if (draftServiceIds.length === 0 && !draftValue.trim()) {
      toast.error('Pick at least one service or enter a value first');
      return;
    }
    setCustomBundles((prev) => [
      ...prev,
      { id: `${Date.now()}-${prev.length}`, serviceIds: draftServiceIds, value: draftValue.trim() },
    ]);
    setDraftServiceIds([]);
    setDraftValue('');
  };

  const removeBundle = (id) => {
    setCustomBundles((prev) => prev.filter((b) => b.id !== id));
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

  const referenceLines = buildReferenceLines({ packages, selectedPackageIds, services, customBundles });

  const handleSend = async () => {
    if (!lead?.email) {
      toast.error('This lead has no email address on file');
      return;
    }
    if (!subject.trim() || !body.trim()) {
      toast.error('Subject and message are required');
      return;
    }

    const finalBody = referenceLines.length
      ? `${body.trim()}\n\nReference:\n${referenceLines.join('\n')}`
      : body.trim();

    const selectedPackages = packages.filter((p) => selectedPackageIds.includes(p.id));
    const bundleServiceNames = customBundles.flatMap((bundle) =>
      services.filter((s) => bundle.serviceIds.includes(s.id)).map((s) => s.service_name)
    );

    setSending(true);
    try {
      await api.integrations.Core.SendEmail({ to: lead.email, subject: subject.trim(), body: finalBody });
      toast.success(`Email sent to ${lead.email}`);
      onSent?.({
        subject,
        services: [...selectedPackages.map((p) => p.name), ...bundleServiceNames],
      });
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
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
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

          {(packages.length > 0 || services.length > 0) && (
            <div className="space-y-3">
              <Label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Reference Package &amp; Services (optional — appended to the email)
              </Label>

              <div className="flex flex-wrap gap-2">
                {packages.map((pkg) => (
                  <button
                    key={pkg.id}
                    type="button"
                    onClick={() => togglePackage(pkg.id)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                      selectedPackageIds.includes(pkg.id)
                        ? 'bg-navy text-white border-navy'
                        : 'bg-white text-slate-600 border-slate-300'
                    }`}
                  >
                    {pkg.name}{pkg.price ? ` — ${pkg.price}` : ''}
                  </button>
                ))}
                {services.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setBuilderOpen((prev) => !prev)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                      builderOpen
                        ? 'bg-navy text-white border-navy'
                        : 'bg-white text-slate-600 border-slate-300'
                    }`}
                  >
                    Other Services
                  </button>
                )}
              </div>

              {customBundles.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {customBundles.map((bundle) => {
                    const bundleServices = services.filter((s) => bundle.serviceIds.includes(s.id));
                    const label = bundleServices.length === 1
                      ? bundleServices[0].service_name
                      : bundleServices.length > 1
                        ? `Custom Package (${bundleServices.length} services)`
                        : 'Custom Item';
                    return (
                      <span
                        key={bundle.id}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200"
                      >
                        {label}{bundle.value ? ` — ${bundle.value}` : ''}
                        <button type="button" onClick={() => removeBundle(bundle.id)} className="hover:text-emerald-900">
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    );
                  })}
                </div>
              )}

              {builderOpen && (
                <div className="p-3 rounded-lg border border-slate-200 bg-slate-50 space-y-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Pick the services to include (one or more)</Label>
                    <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                      {services.map((service) => (
                        <button
                          key={service.id}
                          type="button"
                          onClick={() => toggleDraftServiceId(service.id)}
                          className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                            draftServiceIds.includes(service.id)
                              ? 'bg-navy text-white border-navy'
                              : 'bg-white text-slate-600 border-slate-300'
                          }`}
                        >
                          {service.service_name}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-end gap-2">
                    <div className="flex-1 space-y-1.5">
                      <Label className="text-xs">Custom value (optional)</Label>
                      <Input
                        value={draftValue}
                        onChange={(e) => setDraftValue(e.target.value)}
                        placeholder="e.g. $250 or $250/mo"
                        className="h-9 bg-white"
                      />
                    </div>
                    <Button type="button" size="sm" className="h-9" onClick={handleSetBundle}>
                      Set
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Click "Set" to add this to the email below — you can build another custom item or single service right after.
                  </p>
                </div>
              )}

              {referenceLines.length > 0 && (
                <div className="space-y-1">
                  <Label className="text-xs">Live preview — appended to the email as sent</Label>
                  <pre className="text-xs bg-slate-900 text-slate-100 rounded-lg p-3 whitespace-pre-wrap font-mono">
                    {`Reference:\n${referenceLines.join('\n')}`}
                  </pre>
                </div>
              )}
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

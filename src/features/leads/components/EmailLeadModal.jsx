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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Mail, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';
import { SERVICE_OPTIONS, MONTHLY_PACKAGES } from '@/lib/serviceCatalog';

const GOGET_SENDER_EMAIL = 'info@go-get.ca';
const DEFAULT_SIGNATURE_LOCATION = 'Saskatoon, Saskatchewan, Canada';

// A handful of purpose-built starting points instead of one generic
// "checking in" note — picking one from the dropdown replaces Subject +
// Message; the Reference section below is independent of whichever is
// picked, so package/service selections survive a template switch.
function buildEmailTemplates(lead) {
  const firstName = (lead?.contact_name || '').trim().split(/\s+/)[0] || 'there';
  const companyName = lead?.company_name || '';
  const companySuffix = companyName ? ` — ${companyName}` : '';
  const companyInline = companyName ? ` at ${companyName}` : '';

  return [
    {
      key: 'follow_up',
      label: 'Quick Follow-Up',
      subject: `Following up${companySuffix}`,
      body: `Hi ${firstName},\n\nJust checking in — wanted to follow up on your inquiry and see if you had any questions, or if now's a good time to chat.\n\nHappy to work around your schedule, just let me know what works.`,
    },
    {
      key: 'introduce_services',
      label: 'Introduce Our Services',
      subject: `A few ways Go-Get can help${companySuffix}`,
      body: `Hi ${firstName},\n\nThanks for reaching out to Go-Get! Depending on where your business${companyInline} is at, we can help with incorporation, bookkeeping setup, CRA accounts, tax filing, and ongoing compliance — either as one-off services or a monthly package.\n\nI've put together a few options below based on what might be the best fit. Let me know if any of these look right, or if you'd like to hop on a quick call to go over what makes the most sense for you.`,
    },
    {
      key: 'recommend_package',
      label: 'Recommend a Monthly Package',
      subject: `A monthly package that could fit${companySuffix}`,
      body: `Hi ${firstName},\n\nBased on what you're looking for, an ongoing monthly package might be the simplest way to keep your books, tax filings, and compliance on track without having to think about it.\n\nI've included our package options below — happy to walk through the differences and help you pick the right tier on a quick call.`,
    },
    {
      key: 'thank_you',
      label: 'Thank You for Reaching Out',
      subject: `Thanks for reaching out to Go-Get${companySuffix}`,
      body: `Hi ${firstName},\n\nThank you for getting in touch with Go-Get! We're looking forward to learning more about your business and finding the right fit for your bookkeeping, tax, and compliance needs.\n\nI've attached a quick look at our services and packages below — let me know if anything stands out, or if you'd rather just book a time to chat.`,
    },
  ];
}

// Single source of truth for the "Reference:" block — the plain-text version
// used for the live in-modal preview, and buildReferenceHtml() below (same
// selections, HTML output) used for the actual email at send time.
function buildReferenceLines({ selectedPackageNames, packageOverrides, customBundles }) {
  const lines = [];

  MONTHLY_PACKAGES.filter((pkg) => selectedPackageNames.includes(pkg.name)).forEach((pkg) => {
    const priceLabel = packageOverrides[pkg.name]?.trim() || pkg.price;
    lines.push(`- ${pkg.name} (${priceLabel})`);
    pkg.bullets.forEach((b) => lines.push(`  • ${b}`));
  });

  customBundles.forEach((bundle) => {
    const bundleServices = SERVICE_OPTIONS.filter((s) => bundle.serviceNames.includes(s.name));
    const valueLabel = bundle.value ? ` (${bundle.value})` : '';
    if (bundleServices.length === 0) {
      if (!bundle.value) return;
      lines.push(`- Custom Item${valueLabel}`);
      return;
    }
    if (bundleServices.length === 1) {
      const s = bundleServices[0];
      lines.push(`- ${s.name}${valueLabel || ` (${s.fee})`}`);
      if (s.details) lines.push(`  ${s.details}`);
      return;
    }
    lines.push(`- Custom Services Package${valueLabel}:`);
    bundleServices.forEach((s) => {
      lines.push(`  • ${s.name} (${s.fee})${s.details ? ` — ${s.details}` : ''}`);
    });
  });

  return lines;
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// HTML counterpart of buildReferenceLines — real <ul>/<li> markup instead of
// hyphen/bullet text, since the actual email is sent as HTML.
function buildReferenceHtml({ selectedPackageNames, packageOverrides, customBundles }) {
  const items = [];

  MONTHLY_PACKAGES.filter((pkg) => selectedPackageNames.includes(pkg.name)).forEach((pkg) => {
    const priceLabel = packageOverrides[pkg.name]?.trim() || pkg.price;
    items.push(`
      <li style="margin:0 0 12px;">
        <span style="font-weight:700; color:#0f172a;">${escapeHtml(pkg.name)}</span>
        <span style="color:#334155;"> — ${escapeHtml(priceLabel)}</span>
        <ul style="margin:4px 0 0; padding-left:18px; color:#475569;">
          ${pkg.bullets.map((b) => `<li style="margin:0 0 2px;">${escapeHtml(b)}</li>`).join('')}
        </ul>
      </li>`);
  });

  customBundles.forEach((bundle) => {
    const bundleServices = SERVICE_OPTIONS.filter((s) => bundle.serviceNames.includes(s.name));
    const valueLabel = bundle.value ? escapeHtml(bundle.value) : null;
    if (bundleServices.length === 0) {
      if (!bundle.value) return;
      items.push(`<li style="margin:0 0 12px;"><span style="font-weight:700; color:#0f172a;">Custom Item</span> — ${valueLabel}</li>`);
      return;
    }
    if (bundleServices.length === 1) {
      const s = bundleServices[0];
      items.push(`
        <li style="margin:0 0 12px;">
          <span style="font-weight:700; color:#0f172a;">${escapeHtml(s.name)}</span>
          <span style="color:#334155;"> — ${valueLabel || escapeHtml(s.fee)}</span>
          ${s.details ? `<div style="color:#475569; font-size:13px;">${escapeHtml(s.details)}</div>` : ''}
        </li>`);
      return;
    }
    items.push(`
      <li style="margin:0 0 12px;">
        <span style="font-weight:700; color:#0f172a;">Custom Services Package</span>
        ${valueLabel ? `<span style="color:#334155;"> — ${valueLabel}</span>` : ''}
        <ul style="margin:4px 0 0; padding-left:18px; color:#475569;">
          ${bundleServices.map((s) => `<li style="margin:0 0 2px;">${escapeHtml(s.name)} (${escapeHtml(s.fee)})${s.details ? ` — ${escapeHtml(s.details)}` : ''}</li>`).join('')}
        </ul>
      </li>`);
  });

  if (items.length === 0) return '';
  return `
    <p style="margin:20px 0 8px; font-weight:700; color:#0f172a;">Reference</p>
    <ul style="margin:0 0 16px; padding-left:18px;">
      ${items.join('')}
    </ul>`;
}

function textToHtmlParagraphs(text) {
  return text
    .split(/\n\s*\n/)
    .map((para) => para.trim())
    .filter(Boolean)
    .map((para) => `<p style="margin:0 0 16px;">${escapeHtml(para).replace(/\n/g, '<br>')}</p>`)
    .join('\n');
}

function buildSignatureHtml(primaryOffice) {
  const cityLine = primaryOffice?.city
    ? `${primaryOffice.city}${primaryOffice.province ? `, ${primaryOffice.province}` : ''}, Canada`
    : DEFAULT_SIGNATURE_LOCATION;
  return `
    <p style="margin:0 0 4px;">Best regards,</p>
    <p style="margin:0 0 2px; font-weight:700; color:#0f172a;">The Go-Get Team</p>
    <p style="margin:0 0 2px; font-size:13px; color:#64748b;">Go-Get INC.</p>
    <p style="margin:0 0 2px; font-size:13px; color:#64748b;">${escapeHtml(cityLine)}</p>
    <p style="margin:0; font-size:13px; color:#64748b;">
      <a href="mailto:${GOGET_SENDER_EMAIL}" style="color:#1d4ed8;">${GOGET_SENDER_EMAIL}</a> &middot; <a href="https://go-get.ca" style="color:#1d4ed8;">go-get.ca</a>
    </p>`;
}

export default function EmailLeadModal({ lead, open, onClose, onSent }) {
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [templateKey, setTemplateKey] = useState('follow_up');
  const [selectedPackageNames, setSelectedPackageNames] = useState([]);
  const [packageOverrides, setPackageOverrides] = useState({});
  const [builderOpen, setBuilderOpen] = useState(false);
  const [draftServiceNames, setDraftServiceNames] = useState([]);
  const [draftValue, setDraftValue] = useState('');
  const [customBundles, setCustomBundles] = useState([]);
  const [sending, setSending] = useState(false);

  // Best-effort only — Office is gated behind the Settings module, so a
  // non-admin sender simply falls back to the default signature location
  // below rather than losing the ability to send at all.
  const { data: offices = [] } = useQuery({
    queryKey: ['offices'],
    queryFn: () => api.entities.Office.list(),
    retry: false,
  });
  const primaryOffice = offices.find((o) => o.is_primary) || offices[0];

  const templates = lead ? buildEmailTemplates(lead) : [];

  useEffect(() => {
    if (open && lead) {
      const defaultTemplate = buildEmailTemplates(lead)[0];
      setTemplateKey(defaultTemplate.key);
      setSubject(defaultTemplate.subject);
      setBody(defaultTemplate.body);
      setSelectedPackageNames([]);
      setPackageOverrides({});
      setBuilderOpen(false);
      setDraftServiceNames([]);
      setDraftValue('');
      setCustomBundles([]);
    }
  }, [open, lead]);

  const applyTemplate = (key) => {
    const template = templates.find((t) => t.key === key);
    if (!template) return;
    setTemplateKey(key);
    setSubject(template.subject);
    setBody(template.body);
  };

  const togglePackage = (name) => {
    setSelectedPackageNames((prev) =>
      prev.includes(name) ? prev.filter((p) => p !== name) : [...prev, name]
    );
    // Deselecting a package clears any custom price set for it, so it
    // doesn't silently reappear pre-filled if the package is picked again.
    setPackageOverrides((prev) => {
      if (!(name in prev)) return prev;
      const next = { ...prev };
      delete next[name];
      return next;
    });
  };

  const setPackageOverride = (name, value) => {
    setPackageOverrides((prev) => ({ ...prev, [name]: value }));
  };

  const toggleDraftServiceName = (name) => {
    setDraftServiceNames((prev) =>
      prev.includes(name) ? prev.filter((s) => s !== name) : [...prev, name]
    );
  };

  const handleSetBundle = () => {
    if (draftServiceNames.length === 0 && !draftValue.trim()) {
      toast.error('Pick at least one service or enter a value first');
      return;
    }
    setCustomBundles((prev) => [
      ...prev,
      { id: `${Date.now()}-${prev.length}`, serviceNames: draftServiceNames, value: draftValue.trim() },
    ]);
    setDraftServiceNames([]);
    setDraftValue('');
  };

  const removeBundle = (id) => {
    setCustomBundles((prev) => prev.filter((b) => b.id !== id));
  };

  const referenceLines = buildReferenceLines({ selectedPackageNames, packageOverrides, customBundles });

  const handleSend = async () => {
    if (!lead?.email) {
      toast.error('This lead has no email address on file');
      return;
    }
    if (!subject.trim() || !body.trim()) {
      toast.error('Subject and message are required');
      return;
    }

    const referenceHtml = buildReferenceHtml({ selectedPackageNames, packageOverrides, customBundles });
    const finalHtml = `
<div style="font-family:Arial,Helvetica,sans-serif; color:#1e293b; max-width:560px; margin:0 auto;">
  ${textToHtmlParagraphs(body)}
  ${referenceHtml}
  ${buildSignatureHtml(primaryOffice)}
</div>`.trim();

    const bundleServiceLabels = customBundles.flatMap((bundle) =>
      SERVICE_OPTIONS.filter((s) => bundle.serviceNames.includes(s.name)).map((s) => s.name)
    );

    setSending(true);
    try {
      await api.integrations.Core.SendEmail({
        to: lead.email,
        subject: subject.trim(),
        body: finalHtml,
        html: true,
      });
      toast.success(`Email sent to ${lead.email}`);
      onSent?.({
        subject,
        services: [...selectedPackageNames, ...bundleServiceLabels],
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
            <div className="flex items-center justify-between gap-2">
              <Label>Message</Label>
              <Select value={templateKey} onValueChange={applyTemplate}>
                <SelectTrigger className="h-8 w-auto gap-1.5 text-xs border-slate-200">
                  <SelectValue placeholder="Email template" />
                </SelectTrigger>
                <SelectContent align="end">
                  {templates.map((t) => (
                    <SelectItem key={t.key} value={t.key}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={8} />
          </div>

          <div className="space-y-3">
            <Label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Reference Package &amp; Services (optional — appended to the email)
            </Label>

            <div className="flex flex-wrap gap-2">
              {MONTHLY_PACKAGES.map((pkg) => (
                <button
                  key={pkg.name}
                  type="button"
                  onClick={() => togglePackage(pkg.name)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                    selectedPackageNames.includes(pkg.name)
                      ? 'bg-navy text-white border-navy'
                      : 'bg-white text-slate-600 border-slate-300'
                  }`}
                >
                  {pkg.name} — {pkg.price}
                </button>
              ))}
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
            </div>

            {selectedPackageNames.length > 0 && (
              <div className="space-y-2">
                {selectedPackageNames.map((name) => {
                  const pkg = MONTHLY_PACKAGES.find((p) => p.name === name);
                  if (!pkg) return null;
                  return (
                    <div key={name} className="flex items-center gap-2 p-2 rounded-lg border border-slate-200 bg-slate-50">
                      <span className="text-xs font-medium text-slate-600 flex-shrink-0">
                        {pkg.name} <span className="text-slate-400">default {pkg.price}</span>
                      </span>
                      <Input
                        value={packageOverrides[name] || ''}
                        onChange={(e) => setPackageOverride(name, e.target.value)}
                        placeholder={`Custom value (optional) — overrides ${pkg.price}`}
                        className="h-8 text-xs bg-white flex-1"
                      />
                    </div>
                  );
                })}
              </div>
            )}

            {customBundles.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {customBundles.map((bundle) => {
                  const bundleServices = SERVICE_OPTIONS.filter((s) => bundle.serviceNames.includes(s.name));
                  const label = bundleServices.length === 1
                    ? bundleServices[0].name
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
                  <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto">
                    {SERVICE_OPTIONS.map((service) => (
                      <button
                        key={service.name}
                        type="button"
                        onClick={() => toggleDraftServiceName(service.name)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                          draftServiceNames.includes(service.name)
                            ? 'bg-navy text-white border-navy'
                            : 'bg-white text-slate-600 border-slate-300'
                        }`}
                      >
                        {service.name} — {service.fee}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex items-end gap-2">
                  <div className="flex-1 space-y-1.5">
                    <Label className="text-xs">Custom value (optional — overrides the fee shown above)</Label>
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

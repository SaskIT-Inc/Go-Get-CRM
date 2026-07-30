import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Copy, Download } from 'lucide-react';
import { toast } from 'sonner';

const templates = {
  client: [
    {
      id: 'invoice',
      name: 'Invoice Sent',
      subject: 'Invoice #INV-2024-001 - Service Delivery Complete',
      body: `Dear [Client Name],

I hope this message finds you well. We have completed the services as agreed and have prepared your invoice for payment.

**Invoice Details:**
- Invoice Number: INV-2024-001
- Invoice Date: [Date]
- Due Date: [Due Date]
- Amount Due: $[Amount]
- Description: [Service Description]

Please find the attached invoice. You can pay via:
- Bank Transfer: [Account Details]
- Credit Card: [Link]
- E-Transfer: [Email]

If you have any questions about this invoice or need clarification on the services rendered, please don't hesitate to reach out.

Best regards,
[Your Name]
[Title]
[Company Name]
[Contact Information]`
    },
    {
      id: 'estimate',
      name: 'Estimate Proposal',
      subject: 'Service Estimate #EST-2024-001 - [Service Description]',
      body: `Dear [Client Name],

Thank you for reaching out to us. Based on our initial consultation, I've prepared a detailed estimate for the services you require.

**Estimate Summary:**
- Estimate Number: EST-2024-001
- Services: [Service Description]
- Estimated Timeline: [Timeline]
- Total Cost: $[Amount]
- Valid Until: [Expiration Date]

**Included Services:**
- [Service 1]
- [Service 2]
- [Service 3]

**Next Steps:**
Once you approve this estimate, we can proceed with an engagement agreement. Please review the attached document and let me know if you have any questions or would like to discuss any adjustments.

I'm available for a brief call if you'd like to discuss this further.

Best regards,
[Your Name]
[Title]
[Company Name]`
    },
    {
      id: 'retainer',
      name: 'Retainer Agreement',
      subject: 'Retainer Agreement #RET-2024-001 - Monthly Service Package',
      body: `Dear [Client Name],

I'm pleased to present our retainer agreement proposal for ongoing service delivery. This arrangement will provide you with consistent, predictable support throughout the year.

**Retainer Package Details:**
- Monthly Fee: $[Amount]
- Annual Commitment: $[Annual Amount]
- Services Included:
  • [Service 1] - [Frequency]
  • [Service 2] - [Frequency]
  • [Service 3] - [Frequency]
- Start Date: [Date]
- Billing Frequency: [Monthly/Quarterly]

**Key Benefits:**
- Prioritized service delivery
- Dedicated account management
- Flexible adjustment of services as your needs evolve
- Streamlined invoicing and payment

Please review the attached retainer agreement. Once you're ready to proceed, we'll send it over for signature.

Looking forward to partnering with you!

Best regards,
[Your Name]
[Title]
[Company Name]`
    },
    {
      id: 'document-request',
      name: 'Document Request',
      subject: 'Required Documents for [Service] - Please Submit by [Date]',
      body: `Dear [Client Name],

To proceed with [specific service], we need the following documents from you:

**Required Documents:**
1. [Document Type 1] - [Why needed]
2. [Document Type 2] - [Why needed]
3. [Document Type 3] - [Why needed]
4. [Document Type 4] - [Why needed]

**Submission Instructions:**
- Please upload documents here: [Secure Link]
- Or email to: [Email Address]
- Deadline: [Date]

**Preferred Format:**
- PDF or scanned copies (clear, legible)
- File size limit: 10MB per file

If you have any questions about which documents are needed or have difficulty locating any items, please reach out. I'm happy to help clarify.

Thank you for your prompt attention to this matter.

Best regards,
[Your Name]
[Title]
[Company Name]`
    },
    {
      id: 'consultation',
      name: 'Consultation Appointment',
      subject: 'Consultation Scheduled - [Date & Time]',
      body: `Dear [Client Name],

Thank you for scheduling a consultation with us. I'm looking forward to discussing your [service] needs.

**Appointment Details:**
- Date: [Date]
- Time: [Time] [Timezone]
- Duration: 30 minutes
- Format: [In-Person / Video Call / Phone]
- Location/Link: [Details]

**What to Prepare:**
- Current financial documents (if applicable)
- Previous year's records (if applicable)
- List of questions or concerns
- [Any specific documents]

**Joining Instructions:**
If this is a video call, you can access the meeting here: [Link]

Please let me know if you need to reschedule or have any questions before our meeting.

Looking forward to meeting with you!

Best regards,
[Your Name]
[Title]
[Company Name]`
    },
    {
      id: 'followup',
      name: 'Follow-up Meeting',
      subject: 'Follow-up: Next Steps for [Project/Service]',
      body: `Dear [Client Name],

Thank you for taking the time to meet with us last [day]. I appreciated the opportunity to understand your needs better.

**Summary of Our Discussion:**
- Topic: [Main discussion point]
- Action Items:
  • We will: [Action 1]
  • You will: [Action 2]
  • Timeline: [Timeline]

**Next Meeting:**
- Date: [Date]
- Time: [Time]
- Focus: [What we'll discuss]

**In the Meantime:**
If you think of any additional questions or concerns, please feel free to reach out. I'm here to help.

Looking forward to moving forward together!

Best regards,
[Your Name]
[Title]
[Company Name]`
    },
    {
      id: 'task-completion',
      name: 'Service Completion Confirmation',
      subject: 'Service Complete: [Service Name] - Completion Confirmation',
      body: `Dear [Client Name],

Great news! We have successfully completed [specific service/task] for your account.

**Completion Details:**
- Service: [Service Name]
- Completion Date: [Date]
- Invoice Reference: [Invoice #]
- Deliverables: [What was delivered]

**What Was Accomplished:**
- [Accomplishment 1]
- [Accomplishment 2]
- [Accomplishment 3]

**Next Steps:**
[Describe any follow-up actions or next phase of service]

**Additional Support:**
If you need any clarification on what was completed or have follow-up questions, I'm just an email away.

Thank you for your business!

Best regards,
[Your Name]
[Title]
[Company Name]`
    }
  ],
  internal: [
    {
      id: 'filing-approval',
      name: 'Filing Approval Request',
      subject: 'Approval Needed: [Filing Type] for [Client Name]',
      body: `Hi [Team Member Name],

I need your approval on the [filing type] for [client name] before we proceed with submission.

**Filing Details:**
- Client: [Client Name]
- Filing Type: [T2, T4, GST, etc.]
- Tax Year: [Year]
- Status: Ready for Review
- Amount: $[Amount]

**Key Points to Review:**
- [Item 1]
- [Item 2]
- [Item 3]

**Review Deadline:**
Please review and approve by [date] to ensure timely submission to CRA.

The filing is available in the system at: [Link]

Please let me know if you have any questions or need clarification.

Thanks,
[Your Name]`
    },
    {
      id: 'signature-request',
      name: 'Signature Request',
      subject: 'Signature Needed: [Document Type] - [Client Name]',
      body: `Hi [Client Name],

We have prepared [document type - Retainer Agreement/Service Agreement/etc.] for your review and execution.

**Document Details:**
- Document: [Document Name]
- Client: [Client Name]
- Valid Until: [Date]

**Next Steps:**
1. Review the attached document carefully
2. Sign using the secure signing link below
3. Return the signed copy

**Signing Instructions:**
[Electronic Signature Link or Instructions]

If you have any questions about the document or need clarification on any terms, please don't hesitate to reach out.

Once signed, we can proceed with service delivery.

Best regards,
[Your Name]
[Title]
[Company Name]`
    },
    {
      id: 'document-review',
      name: 'Document Review Request',
      subject: 'Document Review Needed: [Document Type] - [Client Name]',
      body: `Hi [Team Member Name],

I need you to review the following documents submitted by [client name]:

**Documents to Review:**
- [Document 1] - [Date Received]
- [Document 2] - [Date Received]
- [Document 3] - [Date Received]

**Review Checklist:**
☐ Documents are complete and legible
☐ Information matches client records
☐ No missing or inconsistent data
☐ Ready for processing

**Deadline:**
Please complete your review by [date].

**Notes:**
[Any specific items to pay attention to]

Once reviewed, please update the document status in the system.

Thanks for your attention to this!

[Your Name]`
    },
    {
      id: 'task-assignment',
      name: 'Task Assignment',
      subject: 'New Task Assigned: [Task Name]',
      body: `Hi [Team Member Name],

I've assigned you a new task that requires your attention:

**Task Details:**
- Title: [Task Name]
- Client: [Client Name]
- Priority: [High/Medium/Low]
- Due Date: [Date]
- Estimated Time: [Hours]

**Description:**
[Detailed description of what needs to be done]

**Success Criteria:**
- [Criterion 1]
- [Criterion 2]
- [Criterion 3]

**Resources:**
- [Link to relevant documents]
- [Link to client file]

Please confirm receipt of this assignment. If you have any questions or need clarification, let me know.

Thanks!

[Your Name]`
    },
    {
      id: 'deadline-alert',
      name: 'Deadline Alert/Reminder',
      subject: 'URGENT: Deadline Reminder - [Service/Filing] Due [Date]',
      body: `Hi Team,

This is a reminder that the following deadline is approaching:

**Deadline Alert:**
- Service: [Service Name]
- Client: [Client Name]
- Due Date: [Date] ([Days] days remaining)
- Status: [Current Status]

**Action Required:**
- [ ] [Action Item 1]
- [ ] [Action Item 2]
- [ ] [Action Item 3]

**Assignment:**
- [Person 1]: [Task]
- [Person 2]: [Task]

Please prioritize this and update your progress daily.

For any blockers or issues, reach out immediately.

Thanks,
[Your Name]`
    },
    {
      id: 'status-update',
      name: 'Project Status Update',
      subject: 'Status Update: [Project/Client] - Week of [Date]',
      body: `Hi Team,

Here's a status update on our ongoing work:

**This Week's Accomplishments:**
- [Completed Item 1]
- [Completed Item 2]
- [Completed Item 3]

**In Progress:**
- [Item 1] - [% Complete]
- [Item 2] - [% Complete]

**Upcoming:**
- [Item to start]
- [Item in queue]

**Blockers/Concerns:**
- [Issue 1]
- [Issue 2]

**Next Week's Focus:**
- [Priority 1]
- [Priority 2]

Please reply with any questions or updates from your end.

Thanks,
[Your Name]`
    }
  ]
};

export default function EmailTemplates() {
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [copied, setCopied] = useState(false);

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadTemplate = (template) => {
    const content = `Subject: ${template.subject}\n\n${template.body}`;
    const element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(content));
    element.setAttribute('download', `${template.id}-template.txt`);
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    toast.success('Template downloaded');
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1400px] mx-auto">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-navy mb-2">Email Templates Library</h1>
        <p className="text-muted-foreground">Ready-to-use email templates for client and team communication</p>
      </div>

      <Tabs defaultValue="client" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="client">Client Communication ({templates.client.length})</TabsTrigger>
          <TabsTrigger value="internal">Internal/Team ({templates.internal.length})</TabsTrigger>
        </TabsList>

        {/* Client Templates */}
        <TabsContent value="client" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates.client.map(template => (
              <Card 
                key={template.id}
                className="cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => setSelectedTemplate(template)}
              >
                <CardHeader>
                  <CardTitle className="text-lg">{template.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                    {template.subject}
                  </p>
                  <Button variant="outline" size="sm" className="w-full">
                    View Template
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Internal Templates */}
        <TabsContent value="internal" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates.internal.map(template => (
              <Card 
                key={template.id}
                className="cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => setSelectedTemplate(template)}
              >
                <CardHeader>
                  <CardTitle className="text-lg">{template.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                    {template.subject}
                  </p>
                  <Button variant="outline" size="sm" className="w-full">
                    View Template
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Template Preview Modal */}
      {selectedTemplate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <CardHeader className="sticky top-0 bg-white border-b">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-2xl">{selectedTemplate.name}</CardTitle>
                  <p className="text-sm text-muted-foreground mt-2">Subject: {selectedTemplate.subject}</p>
                </div>
                <button
                  onClick={() => setSelectedTemplate(null)}
                  className="text-xl font-bold hover:text-red-600"
                >
                  ✕
                </button>
              </div>
            </CardHeader>

            <CardContent className="pt-6">
              <div className="bg-slate-50 p-6 rounded-lg whitespace-pre-wrap font-mono text-sm leading-relaxed border">
                {selectedTemplate.body}
              </div>

              <div className="flex gap-3 mt-6">
                <Button
                  onClick={() => copyToClipboard(selectedTemplate.body)}
                  variant="outline"
                  className="flex-1 gap-2"
                >
                  <Copy className="w-4 h-4" />
                  {copied ? 'Copied!' : 'Copy Content'}
                </Button>
                <Button
                  onClick={() => downloadTemplate(selectedTemplate)}
                  variant="outline"
                  className="flex-1 gap-2"
                >
                  <Download className="w-4 h-4" />
                  Download
                </Button>
              </div>

              <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-900 font-semibold mb-2">💡 Tips for Using This Template:</p>
                <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                  <li>Replace all [bracketed] placeholders with specific information</li>
                  <li>Personalize the tone to match your communication style</li>
                  <li>Add or remove sections as needed for your specific situation</li>
                  <li>Always proofread before sending</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Plus, Search, Target, Mail, Phone, DollarSign, Calendar, CheckCircle2 } from 'lucide-react';
import LeadDetailsModal from '@/features/leads/components/LeadDetailsModal';
import { COLD_STAGES, HOT_STAGES } from '@/lib/leadStages';

// Directory shows Hot and Cold leads together, so its tabs need to cover the
// union of both pipelines' real stages (leadStages.js), not a separate,
// hand-maintained list that drifts out of sync (which is exactly what left
// "Contacted"/"Needs Assessment"/"Negotiation"/"Won"/"Lost" here matching no
// lead's actual stage value). DISPLAY_ORDER is just a preferred ordering —
// any stage in either pipeline still shows up even if it's not listed here,
// so a future change to leadStages.js can't silently drop a tab again.
const STAGE_UNION = Array.from(new Set([...HOT_STAGES, ...COLD_STAGES]));
const DISPLAY_ORDER = [
  'New Lead', 'Mail Sent', '1st Follow-Up', '2nd Follow-Up', 'Replied',
  'Appointment Set', 'Estimate Sent', 'Closed Leads', 'Lost Leads', 'False Leads',
];
const DIRECTORY_STAGES = [
  ...DISPLAY_ORDER.filter((s) => STAGE_UNION.includes(s)),
  ...STAGE_UNION.filter((s) => !DISPLAY_ORDER.includes(s)),
];

// Same palette LeadPipeline.jsx uses for these stages, so a lead reads the
// same color everywhere in the app.
const STAGE_COLORS = {
  'New Lead':        'bg-slate-100 text-slate-700',
  'Mail Sent':       'bg-blue-100 text-blue-700',
  '1st Follow-Up':   'bg-indigo-100 text-indigo-700',
  '2nd Follow-Up':   'bg-violet-100 text-violet-700',
  'Replied':         'bg-green-100 text-green-700',
  'Appointment Set': 'bg-purple-100 text-purple-700',
  'Estimate Sent':   'bg-yellow-100 text-yellow-700',
  'Closed Leads':    'bg-emerald-100 text-emerald-700',
  'Lost Leads':      'bg-red-100 text-red-700',
  'False Leads':     'bg-gray-100 text-gray-500',
};

export default function LeadDirectory() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLead, setSelectedLead] = useState(null);
  const [filterStage, setFilterStage] = useState('all');

  const { data: leads = [] } = useQuery({
    queryKey: ['leads'],
    queryFn: () => api.entities.Lead.list()
  });

  const filteredLeads = leads.filter(lead => {
    const matchesSearch = 
      lead.contact_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.company_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.email?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStage = filterStage === 'all' || lead.stage === filterStage;
    
    return matchesSearch && matchesStage;
  });

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-bold text-navy mb-2">Lead Directory</h1>
          <p className="text-muted-foreground">
            Complete lead database with search and filtering
          </p>
        </div>
        <div className="flex gap-2">
          <Link to={createPageUrl('LeadPipeline')}>
            <Button variant="outline">Pipeline View</Button>
          </Link>
          <Link to={createPageUrl('LeadCapture')}>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              New Lead
            </Button>
          </Link>
        </div>
      </div>

      {/* Search Bar */}
      <div className="mb-6 relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
        <Input
          placeholder="Search leads by name, company, or email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Filter Tabs */}
      <Tabs value={filterStage} onValueChange={setFilterStage} className="mb-6">
        <TabsList className="h-auto flex-wrap justify-start gap-1">
          <TabsTrigger value="all">All ({leads.length})</TabsTrigger>
          {DIRECTORY_STAGES.map((stage) => (
            <TabsTrigger key={stage} value={stage}>
              {stage} ({leads.filter((l) => l.stage === stage).length})
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* Lead Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredLeads.map(lead => (
          <Card 
            key={lead.id} 
            className="border-none shadow-md hover:shadow-lg transition-all cursor-pointer"
            onClick={() => setSelectedLead(lead)}
          >
            <CardContent className="pt-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-full bg-navy/10 flex items-center justify-center">
                    <Target className="w-6 h-6 text-navy" />
                  </div>
                  <div>
                    <h3 className="font-bold text-navy">{lead.contact_name}</h3>
                    {lead.company_name && (
                      <p className="text-sm text-muted-foreground">{lead.company_name}</p>
                    )}
                  </div>
                </div>
                <Badge variant="secondary" className={STAGE_COLORS[lead.stage]}>
                  {lead.stage}
                </Badge>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  <span className="truncate">{lead.email}</span>
                </div>
                {lead.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-muted-foreground" />
                    <span>{lead.phone}</span>
                  </div>
                )}
                {lead.estimated_value > 0 && (
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-green-600" />
                    <span className="font-semibold text-green-600">
                      ${lead.estimated_value?.toFixed(2)}
                    </span>
                  </div>
                )}
                {lead.next_follow_up && (
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <span className="text-xs">
                      Follow-up: {new Date(lead.next_follow_up).toLocaleDateString()}
                    </span>
                  </div>
                )}
              </div>

              <div className="mt-3 pt-3 border-t">
                {lead.last_contact_date ? (
                  <div className="flex items-center gap-2 text-xs text-green-700">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>
                      Contacted: {new Date(lead.last_contact_date).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Mail className="w-3.5 h-3.5" />
                    <span>Not contacted yet</span>
                  </div>
                )}
              </div>

              {lead.services_interested && lead.services_interested.length > 0 && (
                <div className="mt-3 pt-3 border-t">
                  <p className="text-xs text-muted-foreground mb-1">Interested in:</p>
                  <div className="flex flex-wrap gap-1">
                    {lead.services_interested.slice(0, 2).map((service, idx) => (
                      <Badge key={idx} variant="outline" className="text-xs">
                        {service}
                      </Badge>
                    ))}
                    {lead.services_interested.length > 2 && (
                      <Badge variant="outline" className="text-xs">
                        +{lead.services_interested.length - 2} more
                      </Badge>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredLeads.length === 0 && (
        <Card className="border-2 border-dashed">
          <CardContent className="py-12 text-center">
            <Target className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold text-navy mb-2">No Leads Found</h3>
            <p className="text-muted-foreground mb-4">
              {searchTerm ? 'Try a different search term' : 'Start by capturing your first lead'}
            </p>
            <Link to={createPageUrl('LeadCapture')}>
              <Button className="bg-navy hover:bg-navy-light">
                <Plus className="w-4 h-4 mr-2" />
                Capture Lead
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Lead Details Modal */}
      {selectedLead && (
        <LeadDetailsModal
          lead={selectedLead}
          open={!!selectedLead}
          onClose={() => setSelectedLead(null)}
        />
      )}
    </div>
  );
}
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, Search, Upload, Thermometer, Flame, Info } from 'lucide-react';
import LeadCard from '@/features/leads/components/LeadCard';
import LeadColumn from '@/features/leads/components/LeadColumn';
import LeadDetailsModal from '@/features/leads/components/LeadDetailsModal';
import CsvImportModal from '@/features/leads/components/CsvImportModal';
import { toast } from 'sonner';
import { COLD_STAGES, HOT_STAGES } from '@/lib/leadStages';

const STAGE_COLORS = {
  'New Lead':       'bg-slate-100 text-slate-700 border-slate-300',
  'Mail Sent':      'bg-blue-100 text-blue-700 border-blue-300',
  '1st Follow-Up':  'bg-indigo-100 text-indigo-700 border-indigo-300',
  '2nd Follow-Up':  'bg-violet-100 text-violet-700 border-violet-300',
  'Replied':        'bg-green-100 text-green-700 border-green-300',
  'Contacted':      'bg-orange-100 text-orange-700 border-orange-300',
  'Appointment Set': 'bg-purple-100 text-purple-700 border-purple-300',
  'Estimate Sent':  'bg-yellow-100 text-yellow-700 border-yellow-300',
  'Closed Leads':   'bg-emerald-100 text-emerald-700 border-emerald-300',
  'Lost Leads':     'bg-red-100 text-red-700 border-red-300',
  'False Leads':    'bg-gray-100 text-gray-500 border-gray-300'
};

export default function LeadPipeline() {
  const queryClient = useQueryClient();
  const [activePipeline, setActivePipeline] = useState('Hot Lead');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLead, setSelectedLead] = useState(null);
  const [showCsvModal, setShowCsvModal] = useState(false);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => api.auth.me(),
    staleTime: 5 * 60 * 1000
  });

  const { data: leads = [], isLoading } = useQuery({
    queryKey: ['leads'],
    queryFn: () => api.entities.Lead.list('-created_date', 200)
  });

  const updateLeadMutation = useMutation({
    mutationFn: ({ id, data }) => api.entities.Lead.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['leads'] })
  });

  const stages = activePipeline === 'Cold Lead' ? COLD_STAGES : HOT_STAGES;

  const pipelineLeads = leads.filter(lead => {
    const matchesPipeline = (lead.pipeline_type || 'Hot Lead') === activePipeline;
    const matchesSearch =
      lead.contact_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.company_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.email?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesPipeline && matchesSearch;
  });

  const leadsByStage = stages.reduce((acc, stage) => {
    acc[stage] = pipelineLeads.filter(lead => lead.stage === stage);
    return acc;
  }, {});

  const handleDragEnd = (result) => {
    if (!result.destination) return;
    const leadId = result.draggableId;
    const newStage = result.destination.droppableId;
    const lead = leads.find(l => l.id === leadId);
    if (lead && lead.stage !== newStage) {
      const fromStage = lead.stage;
      updateLeadMutation.mutate(
        { id: leadId, data: { stage: newStage } },
        {
          onSuccess: () => {
            toast.success(`Lead moved to "${newStage}"`);
            // Log activity
            api.entities.Activity.create({
              lead_id: leadId,
              activity_type: 'stage_change',
              title: `Moved to "${newStage}"`,
              from_stage: fromStage,
              to_stage: newStage,
              performed_by: user?.email || '',
              activity_date: new Date().toISOString()
            }).then(() => queryClient.invalidateQueries(['activities', leadId]));
          }
        }
      );
    }
  };

  const totalLeads = pipelineLeads.length;
  const closedLeads = leadsByStage['Closed Leads']?.length || 0;
  const totalValue = pipelineLeads.reduce((sum, l) => sum + (l.estimated_value || 0), 0);
  const closedValue = (leadsByStage['Closed Leads'] || []).reduce((sum, l) => sum + (l.estimated_value || 0), 0);

  return (
    <div className="p-6 h-screen flex flex-col max-w-[2400px] mx-auto">

      {/* Header */}
      <div className="mb-5 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold text-navy">Lead Pipeline</h1>
          <p className="text-muted-foreground text-sm">Drag-and-drop leads through stages</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Link to={createPageUrl('LeadDirectory')}>
            <Button variant="outline" size="sm">Directory View</Button>
          </Link>
          <Link to={createPageUrl('ConversionTracking')}>
            <Button variant="outline" size="sm">Analytics</Button>
          </Link>
        </div>
      </div>

      {/* Pipeline Switcher */}
      <div className="flex items-center gap-3 mb-5">
        <button
          onClick={() => setActivePipeline('Hot Lead')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm border-2 transition-all ${
            activePipeline === 'Hot Lead'
              ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white border-orange-500 shadow-lg'
              : 'bg-white text-slate-600 border-slate-200 hover:border-orange-300'
          }`}
        >
          <Flame className="w-4 h-4" />
          Hot Leads
          <Badge className={`text-xs ${activePipeline === 'Hot Lead' ? 'bg-white/20 text-white' : 'bg-orange-100 text-orange-700'}`}>
            {leads.filter(l => (l.pipeline_type || 'Hot Lead') === 'Hot Lead').length}
          </Badge>
        </button>

        <button
          onClick={() => setActivePipeline('Cold Lead')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm border-2 transition-all ${
            activePipeline === 'Cold Lead'
              ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white border-blue-500 shadow-lg'
              : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300'
          }`}
        >
          <Thermometer className="w-4 h-4" />
          Cold Leads
          <Badge className={`text-xs ${activePipeline === 'Cold Lead' ? 'bg-white/20 text-white' : 'bg-blue-100 text-blue-700'}`}>
            {leads.filter(l => l.pipeline_type === 'Cold Lead').length}
          </Badge>
        </button>

        {/* Pipeline description */}
        <div className="ml-2 hidden md:flex items-center gap-1.5 text-xs text-muted-foreground">
          <Info className="w-3.5 h-3.5" />
          {activePipeline === 'Cold Lead'
            ? 'Outsourced email outreach pipeline — import lists, track follow-ups'
            : 'Website inquiry pipeline — direct conversions from your site'}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <Card className="border-none shadow-sm">
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground">Total Leads</p>
            <p className="text-2xl font-bold text-navy">{totalLeads}</p>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm">
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground">Closed</p>
            <p className="text-2xl font-bold text-emerald-600">{closedLeads}</p>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm">
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground">Pipeline Value</p>
            <p className="text-2xl font-bold text-navy">${totalValue.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm">
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground">Closed Value</p>
            <p className="text-2xl font-bold text-emerald-600">${closedValue.toLocaleString()}</p>
          </CardContent>
        </Card>
      </div>

      {/* Search & Actions */}
      <div className="flex gap-3 mb-5 flex-wrap">
        <div className="flex-1 min-w-[200px] relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search leads..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>

        {activePipeline === 'Cold Lead' && (
          <Button variant="outline" className="gap-2" onClick={() => setShowCsvModal(true)}>
            <Upload className="w-4 h-4" />
            Import CSV
          </Button>
        )}

        <Link to={createPageUrl('LeadCapture')}>
          <Button className={`gap-2 ${activePipeline === 'Cold Lead' ? 'bg-gradient-to-r from-blue-500 to-indigo-600' : 'bg-gradient-to-r from-orange-500 to-red-500'}`}>
            <Plus className="w-4 h-4" />
            Add Lead
          </Button>
        </Link>
      </div>

      {/* Kanban Board */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="flex-1 overflow-x-auto pb-4">
          <div className="flex gap-4 h-full min-w-max">
            {stages.map(stage => {
              const stageLeads = leadsByStage[stage] || [];
              const stageValue = stageLeads.reduce((sum, l) => sum + (l.estimated_value || 0), 0);
              const colorClass = STAGE_COLORS[stage] || 'bg-slate-100 text-slate-700 border-slate-300';

              return (
                <div key={stage} className="w-72 flex-shrink-0">
                  <Droppable droppableId={stage}>
                    {(provided, snapshot) => (
                      <div ref={provided.innerRef} {...provided.droppableProps} className="h-full">
                        <LeadColumn
                          stage={stage}
                          count={stageLeads.length}
                          totalValue={stageValue}
                          isOver={snapshot.isDraggingOver}
                          colorClass={colorClass}
                        >
                          {stageLeads.map((lead, index) => (
                            <Draggable key={lead.id} draggableId={lead.id} index={index}>
                              {(provided, snapshot) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                >
                                  <LeadCard
                                    lead={lead}
                                    onClick={() => setSelectedLead(lead)}
                                    isDragging={snapshot.isDragging}
                                  />
                                </div>
                              )}
                            </Draggable>
                          ))}
                          {provided.placeholder}
                        </LeadColumn>
                      </div>
                    )}
                  </Droppable>
                </div>
              );
            })}
          </div>
        </div>
      </DragDropContext>

      {/* Modals */}
      <LeadDetailsModal
        lead={selectedLead}
        open={!!selectedLead}
        onClose={() => setSelectedLead(null)}
      />

      <CsvImportModal
        open={showCsvModal}
        onClose={() => setShowCsvModal(false)}
      />
    </div>
  );
}
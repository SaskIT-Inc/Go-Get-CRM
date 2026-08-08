import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function TaskTemplateSelector({ onSelect, assignedTo }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const { data: templates = [] } = useQuery({
    queryKey: ['taskTemplates'],
    queryFn: () => api.entities.TaskTemplate.list(),
  });

  const filteredTemplates = useMemo(() => {
    let filtered = templates.filter(t => t.is_active);
    
    if (search) {
      filtered = filtered.filter(t => 
        t.task_name.toLowerCase().includes(search.toLowerCase()) ||
        t.role?.toLowerCase().includes(search.toLowerCase())
      );
    }

    return filtered;
  }, [templates, search]);

  // Group by role
  const groupedTemplates = useMemo(() => {
    const groups = {};
    filteredTemplates.forEach(template => {
      const role = template.role || 'Other';
      if (!groups[role]) groups[role] = [];
      groups[role].push(template);
    });
    return groups;
  }, [filteredTemplates]);

  const handleSelect = (template) => {
    onSelect({
      title: template.task_name,
      priority: template.priority || 'Medium',
      estimated_hours: template.estimated_hours,
      description: template.description
    });
    setOpen(false);
    setSearch('');
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="w-full justify-between">
          <span>Select from templates...</span>
          <ChevronDown className="w-4 h-4 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command>
          <CommandInput 
            placeholder="Search templates..." 
            value={search}
            onValueChange={setSearch}
          />
          <CommandEmpty>No templates found.</CommandEmpty>
          
          {Object.entries(groupedTemplates).map(([role, roleTemplates]) => (
            <CommandGroup key={role} heading={role}>
              {roleTemplates.map((template) => (
                <CommandItem
                  key={template.id}
                  value={template.task_name}
                  onSelect={() => handleSelect(template)}
                  className="cursor-pointer"
                >
                  <div className="flex-1">
                    <p className="text-sm font-medium">{template.task_name}</p>
                    {template.priority && (
                      <p className="text-xs text-muted-foreground">
                        Priority: {template.priority}
                      </p>
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          ))}
        </Command>
      </PopoverContent>
    </Popover>
  );
}
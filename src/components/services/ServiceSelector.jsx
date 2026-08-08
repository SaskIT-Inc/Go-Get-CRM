import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Filter, X } from 'lucide-react';
import ServiceCard from './ServiceCard';
import { Badge } from '@/components/ui/badge';

export default function ServiceSelector({ onSelect, selectedService, multiSelect = false, selectedServices = [] }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  const { data: services = [], isLoading } = useQuery({
    queryKey: ['services'],
    queryFn: () => api.entities.Service.filter({ is_active: true })
  });

  const categories = ['all', ...new Set(services.map(s => s.service_category).filter(Boolean))];

  const filteredServices = services.filter(service => {
    const matchesSearch = service.service_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (service.cra_form || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || service.service_category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleSelect = (service) => {
    if (multiSelect) {
      const isSelected = selectedServices?.some(s => s.id === service.id);
      if (isSelected) {
        onSelect(selectedServices.filter(s => s.id !== service.id));
      } else {
        onSelect([...selectedServices, service]);
      }
    } else {
      onSelect(service);
    }
  };

  const isSelected = (service) => {
    if (multiSelect) {
      return selectedServices?.some(s => s.id === service.id);
    }
    return selectedService?.id === service.id;
  };

  return (
    <div className="space-y-6">
      {/* Search & Filter */}
      <div className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            placeholder="Search services or CRA forms..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 transform -translate-y-1/2"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          )}
        </div>

        {/* Category Tabs */}
        <div className="overflow-x-auto">
          <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
            <TabsList className="bg-muted">
              {categories.map(cat => (
                <TabsTrigger key={cat} value={cat} className="text-xs">
                  {cat === 'all' ? 'All Services' : cat}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>

        {/* Selected Count */}
        {multiSelect && selectedServices?.length > 0 && (
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="bg-yellow text-navy">
              {selectedServices.length} service{selectedServices.length !== 1 ? 's' : ''} selected
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onSelect([])}
              className="text-xs"
            >
              Clear all
            </Button>
          </div>
        )}
      </div>

      {/* Services Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="h-64 bg-muted animate-pulse rounded-xl" />
          ))}
        </div>
      ) : filteredServices.length === 0 ? (
        <div className="text-center py-12">
          <Filter className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold text-navy mb-2">No services found</h3>
          <p className="text-muted-foreground">Try adjusting your search or filters</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredServices.map(service => (
            <ServiceCard
              key={service.id}
              service={service}
              onSelect={handleSelect}
              selected={isSelected(service)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
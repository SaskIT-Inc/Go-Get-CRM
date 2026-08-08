import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Sparkles, FileSearch, MessagesSquare, TrendingUp, ShieldCheck } from 'lucide-react';

const UPCOMING = [
  {
    icon: FileSearch,
    title: 'Document Intelligence',
    description: 'Automatic extraction of key figures and deadlines from uploaded client documents.'
  },
  {
    icon: MessagesSquare,
    title: 'Client Reply Drafting',
    description: 'AI-suggested replies for client document comments and email threads.'
  },
  {
    icon: TrendingUp,
    title: 'Filing Risk Prediction',
    description: 'Flags filings likely to miss their deadline based on historical patterns.'
  },
  {
    icon: ShieldCheck,
    title: 'Compliance Copilot',
    description: 'Plain-language explanations of compliance alerts and suggested next steps.'
  }
];

export default function ExploreAI() {
  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto">
      <div className="mb-10 text-center">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center shadow-lg mx-auto mb-4">
          <Sparkles className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-4xl font-bold text-navy mb-2">Explore AI</h1>
        <p className="text-muted-foreground max-w-xl mx-auto">
          A look at the AI-powered features coming to GoGetCRM. Nothing to configure yet — just a preview.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {UPCOMING.map((feature) => (
          <Card key={feature.title} className="border-none shadow-md">
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <div className="p-2.5 rounded-xl bg-primary/10 flex-shrink-0">
                  <feature.icon className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-navy">{feature.title}</h3>
                    <Badge variant="outline" className="text-[10px]">Coming soon</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{feature.description}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

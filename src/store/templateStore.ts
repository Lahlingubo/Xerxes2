import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface TradeTemplate {
  id: string;
  name: string;
  trades: BatchTrade[];
  createdAt: string;
}

export interface BatchTrade {
  id: string;
  direction: 'LONG' | 'SHORT';
  instrument: string;
  riskAmount: number;
  stopLoss: number;
  takeProfit: number;
  moveToBreakEven: boolean;
  breakEvenPips: number;
  notes: string;
}

interface TemplateState {
  templates: TradeTemplate[];
  addTemplate: (template: Omit<TradeTemplate, 'id' | 'createdAt'>) => void;
  updateTemplate: (id: string, template: Partial<TradeTemplate>) => void;
  deleteTemplate: (id: string) => void;
  exportTemplate: (id: string) => string;
  importTemplate: (data: string) => boolean;
}

export const useTemplateStore = create<TemplateState>()(
  persist(
    (set, get) => ({
      templates: [],
      addTemplate: (template) => {
        const newTemplate = {
          ...template,
          id: crypto.randomUUID(),
          createdAt: new Date().toISOString(),
        };
        set((state) => ({
          templates: [...state.templates, newTemplate],
        }));
      },
      updateTemplate: (id, template) => {
        set((state) => ({
          templates: state.templates.map((t) =>
            t.id === id ? { ...t, ...template } : t
          ),
        }));
      },
      deleteTemplate: (id) => {
        set((state) => ({
          templates: state.templates.filter((t) => t.id !== id),
        }));
      },
      exportTemplate: (id) => {
        const template = get().templates.find((t) => t.id === id);
        if (!template) return '';
        return JSON.stringify(template);
      },
      importTemplate: (data) => {
        try {
          const template = JSON.parse(data) as TradeTemplate;
          if (!template.name || !Array.isArray(template.trades)) {
            return false;
          }
          set((state) => ({
            templates: [...state.templates, {
              ...template,
              id: crypto.randomUUID(),
              createdAt: new Date().toISOString(),
            }],
          }));
          return true;
        } catch {
          return false;
        }
      },
    }),
    {
      name: 'trade-templates',
    }
  )
);
import React from 'react';
import { UserCheck, ShieldAlert, Calculator, FileSpreadsheet, Check } from 'lucide-react';
import { WizardStep } from '../types';

interface WizardStepperProps {
  currentStep: WizardStep;
  onSelectStep: (step: WizardStep) => void;
  isStepComplete: (step: WizardStep) => boolean;
}

export const WizardStepper: React.FC<WizardStepperProps> = ({
  currentStep,
  onSelectStep,
  isStepComplete,
}) => {
  const steps: { number: WizardStep; title: string; subtitle: string; icon: React.ReactNode }[] = [
    {
      number: 1,
      title: 'Passo 1',
      subtitle: 'Dados do Cliente',
      icon: <UserCheck className="w-4 h-4" />,
    },
    {
      number: 2,
      title: 'Passo 2',
      subtitle: 'Diagnóstico Pericial',
      icon: <ShieldAlert className="w-4 h-4" />,
    },
    {
      number: 3,
      title: 'Passo 3',
      subtitle: 'Materiais e Custos',
      icon: <Calculator className="w-4 h-4" />,
    },
    {
      number: 4,
      title: 'Passo 4',
      subtitle: 'Resumo Financeiro',
      icon: <FileSpreadsheet className="w-4 h-4" />,
    },
  ];

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-3 sm:p-4 mb-6 shadow-lg no-print">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3">
        {steps.map((step) => {
          const isActive = currentStep === step.number;
          const isCompleted = isStepComplete(step.number);

          return (
            <button
              key={step.number}
              onClick={() => onSelectStep(step.number)}
              className={`relative flex items-center gap-3 p-3 rounded-xl transition text-left cursor-pointer border ${
                isActive
                  ? 'bg-amber-500/15 border-amber-500/50 shadow-md shadow-amber-500/10'
                  : isCompleted
                  ? 'bg-slate-950/60 border-slate-800 hover:border-slate-700 text-slate-300'
                  : 'bg-slate-950/30 border-slate-900 hover:border-slate-800 text-slate-500'
              }`}
            >
              <div
                className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 font-mono font-bold text-xs transition ${
                  isActive
                    ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/30'
                    : isCompleted
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                {isCompleted && !isActive ? <Check className="w-4 h-4 text-emerald-400 stroke-[3]" /> : step.icon}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span
                    className={`text-[11px] font-mono font-semibold tracking-wide uppercase ${
                      isActive ? 'text-amber-400' : isCompleted ? 'text-emerald-400' : 'text-slate-500'
                    }`}
                  >
                    {step.title}
                  </span>
                  {isCompleted && (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
                  )}
                </div>
                <p
                  className={`text-xs font-bold truncate ${
                    isActive ? 'text-white' : 'text-slate-300'
                  }`}
                >
                  {step.subtitle}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

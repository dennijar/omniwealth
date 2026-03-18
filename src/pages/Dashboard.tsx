import React, { useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { NetWorthDashboard } from '../components/NetWorthDashboard';
import { FiatDashboard } from '../components/FiatDashboard';
import { BudgetSection } from '../components/BudgetSection';
import { InsightsDashboard } from '../components/InsightsDashboard';
import { getCurrentMonthYear } from '../utils/format';

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();

  const fiatRef = useRef<HTMLDivElement | null>(null);
  const insightsRef = useRef<HTMLDivElement | null>(null);

  const monthYear = useMemo(() => getCurrentMonthYear(), []);

  return (
    <div className="bg-[#060D1F] text-white">
      <NetWorthDashboard
        onNavigateFiat={() => fiatRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
        onNavigateMarket={() => navigate('/markets')}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-8 space-y-6">
        <BudgetSection monthYear={monthYear} />

        <div ref={fiatRef} className="scroll-mt-24">
          <FiatDashboard />
        </div>

        <div ref={insightsRef} className="scroll-mt-24">
          <InsightsDashboard />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

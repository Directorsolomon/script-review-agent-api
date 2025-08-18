import React from "react";

interface StatsCardsProps {
  stats: {
    total: number;
    queued: number;
    processing: number;
    completed: number;
    failed: number;
    today: number;
    thisWeek: number;
    thisMonth: number;
  };
}

function StatCard({ title, value, subtitle, color = "gray" }: {
  title: string;
  value: number;
  subtitle?: string;
  color?: "gray" | "blue" | "green" | "yellow" | "red";
}) {
  const colorClasses = {
    gray: "bg-gray-50 text-gray-900",
    blue: "bg-blue-50 text-blue-900",
    green: "bg-green-50 text-green-900",
    yellow: "bg-yellow-50 text-yellow-900",
    red: "bg-red-50 text-red-900",
  };

  return (
    <div className={`rounded-lg p-6 ${colorClasses[color]}`}>
      <div className="text-2xl font-bold mb-1">{value.toLocaleString()}</div>
      <div className="text-sm font-medium mb-1">{title}</div>
      {subtitle && <div className="text-xs opacity-75">{subtitle}</div>}
    </div>
  );
}

export default function StatsCards({ stats }: StatsCardsProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4 mb-8">
      <StatCard title="Total" value={stats.total} color="gray" />
      <StatCard title="Pending" value={stats.queued} color="yellow" />
      <StatCard title="Processing" value={stats.processing} color="blue" />
      <StatCard title="Completed" value={stats.completed} color="green" />
      <StatCard title="Failed" value={stats.failed} color="red" />
      <StatCard title="Today" value={stats.today} subtitle="New submissions" />
      <StatCard title="This Week" value={stats.thisWeek} subtitle="Last 7 days" />
      <StatCard title="This Month" value={stats.thisMonth} subtitle="Last 30 days" />
    </div>
  );
}

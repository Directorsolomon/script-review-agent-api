import React from "react";
import Button from "./Button";

interface SubmissionFiltersProps {
  filters: {
    status: string;
    writer_email: string;
    region: string;
    platform: string;
    format: string;
    from_date: string;
    to_date: string;
  };
  onFilterChange: (field: string, value: string) => void;
  onClearFilters: () => void;
}

function Select({ value, onChange, children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      value={value}
      onChange={onChange}
      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm bg-white transition-colors focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-1"
      {...props}
    >
      {children}
    </select>
  );
}

function Input({ ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-1 placeholder:text-gray-400"
      {...props}
    />
  );
}

export default function SubmissionFilters({ filters, onFilterChange, onClearFilters }: SubmissionFiltersProps) {
  const hasActiveFilters = Object.values(filters).some(value => value !== "");

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Filters</h3>
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={onClearFilters}>
            Clear All
          </Button>
        )}
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
          <Select
            value={filters.status}
            onChange={(e) => onFilterChange('status', e.target.value)}
          >
            <option value="">All Statuses</option>
            <option value="queued">Pending</option>
            <option value="processing">Processing</option>
            <option value="completed">Completed</option>
            <option value="failed">Failed</option>
          </Select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Writer Email</label>
          <Input
            type="email"
            value={filters.writer_email}
            onChange={(e) => onFilterChange('writer_email', e.target.value)}
            placeholder="Search by email..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Region</label>
          <Select
            value={filters.region}
            onChange={(e) => onFilterChange('region', e.target.value)}
          >
            <option value="">All Regions</option>
            <option value="NG">Nigeria</option>
            <option value="KE">Kenya</option>
            <option value="GH">Ghana</option>
            <option value="ZA">South Africa</option>
            <option value="GLOBAL">Global</option>
          </Select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Platform</label>
          <Select
            value={filters.platform}
            onChange={(e) => onFilterChange('platform', e.target.value)}
          >
            <option value="">All Platforms</option>
            <option value="YouTube">YouTube</option>
            <option value="Cinema">Cinema</option>
            <option value="VOD">VOD</option>
            <option value="TV">TV</option>
          </Select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Format</label>
          <Select
            value={filters.format}
            onChange={(e) => onFilterChange('format', e.target.value)}
          >
            <option value="">All Formats</option>
            <option value="feature">Feature Film</option>
            <option value="series">Series/Episode</option>
            <option value="youtube_movie">YouTube Movie</option>
          </Select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">From Date</label>
          <Input
            type="date"
            value={filters.from_date}
            onChange={(e) => onFilterChange('from_date', e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">To Date</label>
          <Input
            type="date"
            value={filters.to_date}
            onChange={(e) => onFilterChange('to_date', e.target.value)}
          />
        </div>
      </div>
    </div>
  );
}

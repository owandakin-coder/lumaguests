import { Category, RsvpStatus } from '../types';

interface FilterTabsProps {
  activeCategory?: Category | 'ALL';
  activeStatus?: RsvpStatus | 'ALL';
  onCategoryChange: (category: Category | 'ALL') => void;
  onStatusChange: (status: RsvpStatus | 'ALL') => void;
}

const categories: (Category | 'ALL')[] = ['ALL', 'FAMILY', 'FRIENDS', 'WORK', 'OTHER'];
const statuses: (RsvpStatus | 'ALL')[] = ['ALL', 'CONFIRMED', 'PENDING', 'DECLINED'];

const categoryColors: Record<string, string> = {
  ALL: 'text-charcoal-600',
  FAMILY: 'text-blue-600',
  FRIENDS: 'text-purple-600',
  WORK: 'text-slate-600',
  OTHER: 'text-gray-600',
};

const statusColors: Record<string, string> = {
  ALL: 'text-charcoal-600',
  CONFIRMED: 'text-green-600',
  PENDING: 'text-amber-600',
  DECLINED: 'text-red-600',
};

export const FilterTabs = ({
  activeCategory = 'ALL',
  activeStatus = 'ALL',
  onCategoryChange,
  onStatusChange,
}: FilterTabsProps) => {
  return (
    <div className="space-y-4">
      {/* Category Filter */}
      <div>
        <p className="text-xs font-semibold text-charcoal-600 uppercase tracking-wide mb-3">
          Category
        </p>
        <div className="flex flex-wrap gap-2">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => onCategoryChange(cat)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition ${
                activeCategory === cat
                  ? `bg-charcoal-900 text-white`
                  : `bg-charcoal-100 ${categoryColors[cat]} hover:bg-charcoal-200`
              }`}
            >
              {cat === 'ALL' ? 'All' : cat}
            </button>
          ))}
        </div>
      </div>

      {/* Status Filter */}
      <div>
        <p className="text-xs font-semibold text-charcoal-600 uppercase tracking-wide mb-3">
          RSVP Status
        </p>
        <div className="flex flex-wrap gap-2">
          {statuses.map((status) => (
            <button
              key={status}
              onClick={() => onStatusChange(status)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition ${
                activeStatus === status
                  ? `bg-charcoal-900 text-white`
                  : `bg-charcoal-100 ${statusColors[status]} hover:bg-charcoal-200`
              }`}
            >
              {status === 'ALL' ? 'All' : status}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

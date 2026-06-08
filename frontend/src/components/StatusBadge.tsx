import { HE } from '../constants/he';

interface StatusBadgeProps {
  status: 'CONFIRMED' | 'PENDING' | 'DECLINED';
  size?: 'sm' | 'md';
}

export const StatusBadge = ({ status, size = 'md' }: StatusBadgeProps) => {
  const statusMap = {
    CONFIRMED: {
      text: HE.rsvp.confirmed,
      bg: 'bg-green-100',
      textColor: 'text-green-700',
    },
    PENDING: {
      text: HE.rsvp.pending,
      bg: 'bg-amber-100',
      textColor: 'text-amber-700',
    },
    DECLINED: {
      text: HE.rsvp.declined,
      bg: 'bg-gray-100',
      textColor: 'text-gray-700',
    },
  };

  const config = statusMap[status];
  const sizeClass = size === 'sm' ? 'px-2 py-1 text-xs' : 'px-3 py-2 text-sm';

  return (
    <span className={`inline-block font-medium rounded-full ${config.bg} ${config.textColor} ${sizeClass}`}>
      {config.text}
    </span>
  );
};

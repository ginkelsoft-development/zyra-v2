'use client';

interface AgentAvatarProps {
  name: string;
  role: string;
  color: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export default function AgentAvatar({ name, role, color, size = 'md', className = '' }: AgentAvatarProps) {
  const initials = name
    .split(' ')
    .map(word => word[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-12 h-12 text-sm',
    lg: 'w-16 h-16 text-lg'
  };

  return (
    <div className={`relative ${className}`}>
      {/* Avatar Circle */}
      <div
        className={`${sizeClasses[size]} rounded-full flex items-center justify-center font-bold text-white shadow-lg relative overflow-hidden`}
        style={{ backgroundColor: color }}
      >
        {/* Simple person icon background */}
        <svg className="absolute inset-0 w-full h-full opacity-20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
        </svg>
        {/* Initials on top */}
        <span className="relative z-10">{initials}</span>
      </div>

      {/* Status indicator (optional) */}
      <div
        className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 rounded-full"
        title="Active"
      />
    </div>
  );
}

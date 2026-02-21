const sizes = {
  xs: 'w-6 h-6 text-xs',
  sm: 'w-8 h-8 text-sm',
  md: 'w-10 h-10 text-base',
  lg: 'w-14 h-14 text-lg',
  xl: 'w-20 h-20 text-2xl',
};

export default function Avatar({ src, alt, name, size = 'md', online, className = '' }) {
  const initials = name
    ? name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
    : '?';

  return (
    <div className={`relative inline-flex items-center justify-center rounded-full bg-accent-primary/20 text-accent-primary font-heading font-bold flex-shrink-0 ${sizes[size]} ${className}`}>
      {src ? (
        <img src={src} alt={alt || name} className="w-full h-full rounded-full object-cover" />
      ) : (
        <span>{initials}</span>
      )}
      {typeof online === 'boolean' && (
        <span className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-base ${online ? 'bg-accent-success' : 'bg-txt-muted'}`} />
      )}
    </div>
  );
}

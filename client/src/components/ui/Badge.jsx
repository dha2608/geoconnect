const colorMap = {
  primary: 'bg-accent-primary/15 text-accent-primary border-accent-primary/25',
  secondary: 'bg-accent-secondary/15 text-accent-secondary border-accent-secondary/25',
  success: 'bg-accent-success/15 text-accent-success border-accent-success/25',
  warning: 'bg-accent-warning/15 text-accent-warning border-accent-warning/25',
  danger: 'bg-accent-danger/15 text-accent-danger border-accent-danger/25',
};

export default function Badge({ children, color = 'primary', dot = false, className = '' }) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 text-xs font-medium rounded-full border ${colorMap[color]} ${className}`}>
      {dot && <span className={`w-1.5 h-1.5 rounded-full bg-current`} />}
      {children}
    </span>
  );
}

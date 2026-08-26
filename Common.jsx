export function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-14 px-6">
      {Icon && (
        <div className="w-12 h-12 rounded-full bg-forest-50 flex items-center justify-center mb-3">
          <Icon size={22} className="text-forest-500" />
        </div>
      )}
      <p className="font-display text-forest-900 text-base mb-1">{title}</p>
      {description && <p className="text-sm text-forest-500 max-w-sm mb-4">{description}</p>}
      {action}
    </div>
  );
}

export function PageHeader({ title, description, action }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-6">
      <div>
        <h1 className="font-display text-2xl sm:text-3xl text-forest-950">{title}</h1>
        {description && <p className="text-sm text-forest-500 mt-1">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function Spinner() {
  return (
    <div className="flex items-center justify-center py-16">
      <div className="w-8 h-8 border-[3px] border-forest-200 border-t-forest-600 rounded-full animate-spin" />
    </div>
  );
}

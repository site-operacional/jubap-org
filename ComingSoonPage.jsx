import { PageHeader } from '../../components/Common';

export default function ComingSoonPage({ title, description, icon: Icon }) {
  return (
    <div>
      <PageHeader title={title} description="Módulo planejado para a próxima etapa da plataforma." />
      <div className="card p-10 text-center border-dashed border-2 border-forest-200 bg-forest-50/40">
        {Icon && (
          <div className="w-14 h-14 rounded-full bg-white flex items-center justify-center mx-auto mb-4 shadow-card">
            <Icon size={26} className="text-forest-500" />
          </div>
        )}
        <p className="font-display text-lg text-forest-900 mb-2">Em construção</p>
        <p className="text-sm text-forest-500 max-w-md mx-auto">{description}</p>
      </div>
    </div>
  );
}

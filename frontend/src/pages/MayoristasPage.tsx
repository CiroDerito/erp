import { Eye, Pencil, Plus, RefreshCw } from 'lucide-react';
import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Wholesaler, createResource, updateResource } from '../api/resources';
import { useApiResource } from '../api/useApiResource';
import { Badge, Button, EmptyRow, Modal, PageHeader, TableState } from '../shared/ui';

export function MayoristasPage() {
  const navigate = useNavigate();
  const { data, loading, error, reload } = useApiResource<Wholesaler>('/wholesalers');
  const [open, setOpen] = useState(false);
  const [editingWholesaler, setEditingWholesaler] = useState<Wholesaler | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const isEditing = Boolean(editingWholesaler);

  function openCreateModal() {
    setEditingWholesaler(null);
    setFormError('');
    setOpen(true);
  }

  function openEditModal(wholesaler: Wholesaler) {
    setEditingWholesaler(wholesaler);
    setFormError('');
    setOpen(true);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    setSaving(true);
    setFormError('');
    const form = new FormData(formElement);
    const payload = {
      name: String(form.get('name') ?? ''),
      phone: String(form.get('phone') ?? ''),
      email: String(form.get('email') ?? ''),
      notes: String(form.get('notes') ?? ''),
      isActive: String(form.get('isActive') ?? 'true') === 'true',
    };

    try {
      if (editingWholesaler) {
        await updateResource<Wholesaler, object>(`/wholesalers/${editingWholesaler.id}`, payload);
      } else {
        await createResource<Wholesaler, object>('/wholesalers', payload);
      }
      setOpen(false);
      setEditingWholesaler(null);
      formElement.reset();
      await reload();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'No se pudo guardar el mayorista');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="page-stack">
      <PageHeader title="Mayoristas" action={<Button onClick={openCreateModal}><Plus size={14} /> Nuevo mayorista</Button>} />
      <Modal title={isEditing ? 'Editar mayorista' : 'Nuevo mayorista'} open={open} onClose={() => setOpen(false)}>
        <form className="modal-form" onSubmit={handleSubmit}>
          <label><span className="form-label">Nombre</span><input className="form-input" name="name" required minLength={2} defaultValue={editingWholesaler?.name ?? ''} /></label>
          <label><span className="form-label">Telefono</span><input className="form-input" name="phone" defaultValue={editingWholesaler?.phone ?? ''} /></label>
          <label><span className="form-label">Email</span><input className="form-input" name="email" type="email" defaultValue={editingWholesaler?.email ?? ''} /></label>
          <label><span className="form-label">Notas</span><input className="form-input" name="notes" defaultValue={editingWholesaler?.notes ?? ''} /></label>
          <label>
            <span className="form-label">Estado</span>
            <select className="form-input" name="isActive" defaultValue={String(editingWholesaler?.isActive ?? true)}>
              <option value="true">Activo</option>
              <option value="false">Inactivo</option>
            </select>
          </label>
          <div className="form-help">Inactivo permite conservar el registro sin usarlo en operaciones nuevas.</div>
          {formError ? <div className="form-error">{formError}</div> : null}
          <div className="modal-actions">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Guardando...' : isEditing ? 'Guardar cambios' : 'Guardar mayorista'}</Button>
          </div>
        </form>
      </Modal>
      <div className="table-card">
        <div className="toolbar">
          <Button variant="outline" onClick={() => void reload()}><RefreshCw size={14} /> Actualizar</Button>
        </div>
        <table>
          <thead><tr><th>Nombre</th><th>Telefono</th><th>Email</th><th>Estado</th><th className="actions-col"><span className="sr-only">Acciones</span></th></tr></thead>
          <tbody>
            <TableState loading={loading} error={error} colSpan={5} />
            {!loading && !error && data.length === 0 && <EmptyRow colSpan={5} label="Sin mayoristas cargados" />}
            {!loading && !error && data.map((wholesaler) => (
              <tr key={wholesaler.id}>
                <td className="primary">{wholesaler.name}</td>
                <td>{wholesaler.phone ?? '-'}</td>
                <td>{wholesaler.email ?? '-'}</td>
                <td><Badge tone={wholesaler.isActive ? 'green' : 'red'}>{wholesaler.isActive ? 'Activo' : 'Inactivo'}</Badge></td>
                <td className="actions-col">
                  <Button variant="outline" className="icon-btn" aria-label={`Ver detalle de ${wholesaler.name}`} title="Ver detalle" onClick={() => navigate(`/mayoristas/${wholesaler.id}`)}>
                    <Eye size={14} />
                  </Button>
                  <Button variant="outline" className="icon-btn" aria-label={`Editar ${wholesaler.name}`} title="Editar" onClick={() => openEditModal(wholesaler)}>
                    <Pencil size={14} />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

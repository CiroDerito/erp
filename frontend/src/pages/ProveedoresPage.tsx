import { Pencil, Plus } from 'lucide-react';
import { FormEvent, useState } from 'react';
import { Supplier, createResource, updateResource } from '../api/resources';
import { useApiResource } from '../api/useApiResource';
import { Badge, Button, EmptyRow, Modal, PageHeader, TableState } from '../shared/ui';

export function ProveedoresPage() {
  const { data, loading, error, reload } = useApiResource<Supplier>('/suppliers');
  const [open, setOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const isEditing = Boolean(editingSupplier);

  function openCreateModal() {
    setEditingSupplier(null);
    setFormError('');
    setOpen(true);
  }

  function openEditModal(supplier: Supplier) {
    setEditingSupplier(supplier);
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
      if (editingSupplier) {
        await updateResource<Supplier, object>(`/suppliers/${editingSupplier.id}`, payload);
      } else {
        await createResource<Supplier, object>('/suppliers', payload);
      }
      setOpen(false);
      setEditingSupplier(null);
      formElement.reset();
      await reload();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'No se pudo guardar el proveedor');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="page-stack">
      <PageHeader title="Proveedores" action={<Button onClick={openCreateModal}><Plus size={14} /> Nuevo proveedor</Button>} />
      <Modal title={isEditing ? 'Editar proveedor' : 'Nuevo proveedor'} open={open} onClose={() => setOpen(false)}>
        <form className="modal-form" onSubmit={handleSubmit} key={editingSupplier?.id ?? 'new-supplier'}>
          <label><span className="form-label">Nombre</span><input className="form-input" name="name" required minLength={2} defaultValue={editingSupplier?.name ?? ''} /></label>
          <label><span className="form-label">Telefono</span><input className="form-input" name="phone" defaultValue={editingSupplier?.phone ?? ''} /></label>
          <label><span className="form-label">Email</span><input className="form-input" name="email" type="email" defaultValue={editingSupplier?.email ?? ''} /></label>
          <label><span className="form-label">Notas</span><input className="form-input" name="notes" defaultValue={editingSupplier?.notes ?? ''} /></label>
          <label>
            <span className="form-label">Estado</span>
            <select className="form-input" name="isActive" defaultValue={String(editingSupplier?.isActive ?? true)}>
              <option value="true">Activo</option>
              <option value="false">Inactivo</option>
            </select>
          </label>
          {formError ? <div className="form-error">{formError}</div> : null}
          <div className="modal-actions">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Guardando...' : isEditing ? 'Guardar cambios' : 'Guardar proveedor'}</Button>
          </div>
        </form>
      </Modal>
      <div className="table-card">
        <table>
          <thead><tr><th>Nombre</th><th>Telefono</th><th>Email</th><th>Estado</th><th className="actions-col"><span className="sr-only">Acciones</span></th></tr></thead>
          <tbody>
            <TableState loading={loading} error={error} colSpan={5} />
            {!loading && !error && data.length === 0 && <EmptyRow colSpan={5} label="Sin proveedores cargados" />}
            {!loading && !error && data.map((supplier) => (
              <tr key={supplier.id}>
                <td className="primary">{supplier.name}</td>
                <td>{supplier.phone ?? '-'}</td>
                <td>{supplier.email ?? '-'}</td>
                <td><Badge tone={supplier.isActive ? 'green' : 'red'}>{supplier.isActive ? 'Activo' : 'Inactivo'}</Badge></td>
                <td className="actions-col">
                  <Button variant="outline" className="icon-btn" aria-label={`Editar ${supplier.name}`} title="Editar" onClick={() => openEditModal(supplier)}>
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

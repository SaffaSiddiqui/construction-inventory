import { useState } from 'react'
import { HardHat, Pencil, Plus, Trash2 } from 'lucide-react'
import PageHeader from '../components/PageHeader'
import Empty from '../components/Empty'
import Modal from '../components/Modal'
import ProjectForm from '../components/forms/ProjectForm'
import DepartmentForm from '../components/forms/DepartmentForm'
import { useData } from '../context/Data'
import { runDelete, useFeedback } from '../context/Feedback'
import { deleteDepartment, deleteProject } from '../lib/inventory'

export default function Projects() {
  const { data, loading, error, reload } = useData()
  const { toast, confirm } = useFeedback()
  const [form, setForm] = useState(null) // { kind: 'project' | 'department', record }

  const done = (m) => { setForm(null); toast(m); reload() }

  const removeProject = (p) =>
    runDelete({ confirm, toast, title: `Delete ${p.name}?`, message: 'Its departments are deleted too. Projects with issue records cannot be deleted.', confirmLabel: 'Delete project', action: () => deleteProject(p.id), done: reload })
  const removeDept = (d) =>
    runDelete({ confirm, toast, title: `Delete ${d.name}?`, message: 'Departments with issue records cannot be deleted.', confirmLabel: 'Delete department', action: () => deleteDepartment(d.id), done: reload })

  const issueCount = (id) => data.issues.filter((i) => i.project_id === id).length
  const general = data.departments.filter((d) => !d.project_id)

  return (
    <div className="page page--projects">
      <PageHeader
        title="Projects"
        subtitle="Each project has its own manager and departments. Material is issued to these."
        action={<button className="btn btn--primary" onClick={() => setForm({ kind: 'project', record: null })}><Plus size={18} /> Add project</button>}
      />
      {error && <p className="form-error">Could not load records: {error}</p>}
      {loading ? (
        <p className="loading">Loading projects…</p>
      ) : data.projects.length ? (
        <div className="project-list">
          {data.projects.map((p) => (
            <article className="project" key={p.id}>
              <header>
                <div>
                  <h3>{p.name}</h3>
                  <p>Manager: <strong>{p.manager_name}</strong> · {issueCount(p.id)} issues</p>
                </div>
                <div>
                  <button className="icon-btn" aria-label="Edit project" onClick={() => setForm({ kind: 'project', record: p })}><Pencil size={16} /></button>
                  <button className="icon-btn icon-btn--danger" aria-label="Delete project" onClick={() => removeProject(p)}><Trash2 size={16} /></button>
                </div>
              </header>
              <ul className="chips">
                {data.departments.filter((d) => d.project_id === p.id).map((d) => (
                  <li key={d.id}>
                    {d.name}
                    <button aria-label={`Edit ${d.name}`} onClick={() => setForm({ kind: 'department', record: d })}><Pencil size={13} /></button>
                    <button aria-label={`Delete ${d.name}`} onClick={() => removeDept(d)}><Trash2 size={13} /></button>
                  </li>
                ))}
                <li className="chip-add">
                  <button onClick={() => setForm({ kind: 'department', record: { project_id: p.id } })}><Plus size={14} /> Department</button>
                </li>
              </ul>
            </article>
          ))}
        </div>
      ) : (
        <Empty icon={HardHat} title="No projects yet" text="Add a project and its manager, then add the departments that receive material." />
      )}

      {general.length > 0 && (
        <section className="project project--general">
          <header><div><h3>Departments for all projects</h3><p>These can be chosen for any project.</p></div></header>
          <ul className="chips">
            {general.map((d) => (
              <li key={d.id}>
                {d.name}
                <button aria-label={`Edit ${d.name}`} onClick={() => setForm({ kind: 'department', record: d })}><Pencil size={13} /></button>
                <button aria-label={`Delete ${d.name}`} onClick={() => removeDept(d)}><Trash2 size={13} /></button>
              </li>
            ))}
          </ul>
        </section>
      )}
      <p className="page-foot">
        <button className="btn btn--ghost btn--sm" onClick={() => setForm({ kind: 'department', record: null })}><Plus size={15} /> Add a department for all projects</button>
      </p>

      {form && (
        <Modal title={`${form.record?.id ? 'Edit' : 'Add'} ${form.kind}`} onClose={() => setForm(null)}>
          {form.kind === 'project' ? (
            <ProjectForm initial={form.record} onSaved={done} onCancel={() => setForm(null)} />
          ) : (
            <DepartmentForm initial={form.record} projects={data.projects} onSaved={done} onCancel={() => setForm(null)} />
          )}
        </Modal>
      )}
    </div>
  )
}

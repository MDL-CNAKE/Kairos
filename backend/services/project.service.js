/**
 * @module project.service
 * @description Logica di business per la gestione dei progetti:
 *   CRUD, archivio, memberships, catalogo pubblico, dashboard e segnalazioni.
 */

const Project = require('../models/project.model');
const Task = require('../models/task.model');
const User = require('../models/user.model');
const AppError = require('../utils/app-error.util');

/**
 * @typedef {Object} CatalogFilters
 * @property {string}  [category]   Filtra per categoria.
 * @property {string}  [technology] Filtra per tecnologia.
 * @property {number}  [page=1]
 * @property {number}  [limit=20]
 * @property {string}  [sortBy='createdAt']
 * @property {'asc'|'desc'} [order='desc']
 */

/**
 * @typedef {Object} PaginatedResult
 * @property {Array}  projects
 * @property {number} total
 * @property {number} page
 * @property {number} totalPages
 */

/**
 * Crea un nuovo progetto. Il creatore diventa automaticamente `owner`
 * e viene aggiunto ai membri con ruolo `owner`.
 *
 * @param {string} ownerId - ID dell'utente che crea il progetto.
 * @param {Object} data    - Campi del progetto (title, description, category, …).
 * @returns {Promise<import('../models/project.model').default>}
 */
async function create(ownerId, data) {
  return Project.create({
    ...data,
    owner: ownerId,
    members: [{ user: ownerId, role: 'owner' }],
  });
}

/**
 * Aggiorna i campi del progetto. Usa `Object.assign` per merge parziale.
 *
 * @param {import('../models/project.model').default} project - Documento caricato dal middleware.
 * @param {Object} data - Campi da aggiornare.
 * @returns {Promise<import('../models/project.model').default>}
 */
async function update(project, data) {
  Object.assign(project, data);
  return project.save();
}

/**
 * Archivia o ripristina un progetto.
 *
 * @param {import('../models/project.model').default} project
 * @param {boolean} archived - `true` per archiviare, `false` per ripristinare.
 * @returns {Promise<import('../models/project.model').default>}
 */
async function setArchived(project, archived) {
  project.status = archived ? 'archived' : 'active';
  return project.save();
}

/**
 * Elimina un progetto e tutti i task associati (cascade manuale).
 *
 * @param {string} projectId - ID MongoDB del progetto.
 * @returns {Promise<void>}
 */
async function remove(projectId) {
  await Task.deleteMany({ projectId });
  await Project.findByIdAndDelete(projectId);
}

/**
 * Aggiunge un utente come membro del progetto.
 *
 * @param {import('../models/project.model').default} project
 * @param {string} userId - ID dell'utente da invitare.
 * @returns {Promise<import('../models/project.model').default>}
 * @throws {AppError} 404 se l'utente non esiste.
 * @throws {AppError} 409 se l'utente è già membro.
 */
async function addMember(project, userId) {
  const user = await User.findById(userId);
  if (!user) throw new AppError(404, 'User not found');

  const already = project.members.some((m) => m.user.toString() === userId.toString());
  if (already) throw new AppError(409, 'User is already a member');

  project.members.push({ user: userId, role: 'member' });
  return project.save();
}

/**
 * Rimuove un membro dal progetto.
 * L'owner non può essere rimosso.
 *
 * @param {import('../models/project.model').default} project
 * @param {string} userId - ID dell'utente da rimuovere.
 * @returns {Promise<import('../models/project.model').default>}
 * @throws {AppError} 400 se si tenta di rimuovere l'owner.
 */
async function removeMember(project, userId) {
  if (project.owner.toString() === userId.toString()) {
    throw new AppError(400, 'Cannot remove the project owner');
  }
  project.members = project.members.filter((m) => m.user.toString() !== userId.toString());
  return project.save();
}

/**
 * Restituisce il catalogo dei progetti pubblici, attivi e non nascosti.
 * Supporta filtri per categoria e tecnologia, paginazione e ordinamento.
 *
 * @param {CatalogFilters} [filters]
 * @returns {Promise<PaginatedResult>}
 */
async function catalog(filters = {}) {
  const { category, technology, page = 1, limit = 20, sortBy = 'createdAt', order = 'desc' } = filters;

  const query = { visibility: 'public', status: 'active', isHidden: false };
  if (category)   query.category = category;
  if (technology) query.technologies = technology;

  const sort = { [sortBy]: order === 'asc' ? 1 : -1 };
  const skip = (page - 1) * limit;

  const [projects, total] = await Promise.all([
    Project.find(query).sort(sort).skip(skip).limit(limit).populate('owner', 'username'),
    Project.countDocuments(query),
  ]);

  return { projects, total, page, totalPages: Math.ceil(total / limit) };
}

/**
 * Restituisce i dati della dashboard personale dell'utente:
 * - Progetti creati
 * - Progetti in cui è membro (non owner)
 * - Task assegnati non completati, ordinati per deadline
 *
 * @param {string} userId - ID dell'utente corrente.
 * @returns {Promise<{created: Array, member: Array, assignedTasks: Array}>}
 */
async function dashboard(userId) {
  const [created, member] = await Promise.all([
    Project.find({ owner: userId }).sort({ createdAt: -1 }).populate('members.user', 'username'),
    Project.find({ 'members.user': userId, owner: { $ne: userId } }).sort({ createdAt: -1 }).populate('members.user', 'username'),
  ]);

  const assignedTasks = await Task.find({ assigneeId: userId, status: { $ne: 'done' } })
    .sort({ deadline: 1 })
    .populate('projectId', 'title');

  return { created, member, assignedTasks };
}

/**
 * Incrementa il contatore segnalazioni del progetto.
 * Se raggiunge la soglia di 3, il progetto viene nascosto automaticamente.
 *
 * @param {import('../models/project.model').default} project
 * @param {string} [reason] - Motivo della segnalazione (non persistito sul progetto).
 * @returns {Promise<import('../models/project.model').default>}
 */
async function report(project, reason) {
  project.reportCount = (project.reportCount || 0) + 1;
  if (project.reportCount >= 3) project.isHidden = true;
  return project.save();
}

/**
 * Lista tutti i progetti (admin): include nascosti e archiviati.
 *
 * @param {{page?: number, limit?: number}} [options]
 * @returns {Promise<PaginatedResult>}
 */
async function adminList({ page = 1, limit = 20 } = {}) {
  const skip = (page - 1) * limit;
  const [projects, total] = await Promise.all([
    Project.find().sort({ createdAt: -1 }).skip(skip).limit(limit).populate('owner', 'username email'),
    Project.countDocuments(),
  ]);
  return { projects, total, page, totalPages: Math.ceil(total / limit) };
}

/**
 * Ripristina la visibilità di un progetto nascosto per segnalazioni (admin).
 *
 * @param {import('../models/project.model').default} project
 * @returns {Promise<import('../models/project.model').default>}
 */
async function adminRestore(project) {
  project.isHidden = false;
  project.reportCount = 0;
  return project.save();
}

module.exports = {
  create,
  update,
  setArchived,
  remove,
  addMember,
  removeMember,
  catalog,
  dashboard,
  report,
  adminList,
  adminRestore,
};

require('dotenv').config();
const mongoose = require('mongoose');
const User        = require('./backend/models/user.model');
const Project     = require('./backend/models/project.model');
const Task        = require('./backend/models/task.model');
const Message     = require('./backend/models/message.model');
const RefreshToken = require('./backend/models/refresh-token.model');
const Notification = require('./backend/models/notification.model');
const Comment      = require('./backend/models/comment.model');

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/taskflow';

async function seed() {
  await mongoose.connect(MONGO_URI);
  console.log('Connesso a MongoDB');

  await Promise.all([
    User.deleteMany({}),
    Project.deleteMany({}),
    Task.deleteMany({}),
    Message.deleteMany({}),
    RefreshToken.deleteMany({}),
    Notification.deleteMany({}),
    Comment.deleteMany({}),
  ]);
  console.log('Database pulito');

  const marguerite = await User.create({
    username: 'marguerite',
    email:    'marguerite@taskflow.dev',
    password: 'MiniKiwi123!',
    role:     'admin',
  });

  const matteo = await User.create({
    username: 'matteo',
    email:    'matteo@taskflow.dev',
    password: 'Banana456!',
    role:     'user',
  });

  console.log('Utenti creati: marguerite (admin) | matteo (user)');

  const project = await Project.create({
    title:        'TaskFlow - Motor Group',
    category:     'other',
    description:  'Coordinamento operativo delle attivita tra i reparti di produzione, qualita e supply chain.',
    technologies: ['Node.js', 'Express', 'MongoDB', 'Socket.io'],
    visibility:   'private',
    owner:        marguerite._id,
    members: [
      { user: marguerite._id, role: 'owner' },
      { user: matteo._id,     role: 'member' },
    ],
  });

  console.log('Progetto creato:', project.title);

  const deadline = new Date(Date.now() + 4 * 24 * 60 * 60 * 1000);
  const yesterday = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000);

  const tasks = await Task.create([
    {
      title:       'Configurare modulo di autenticazione',
      description: 'Login, gestione ruoli e sessioni per gli utenti della piattaforma.',
      status:      'done',
      priority:    'high',
      projectId:   project._id,
      createdBy:   marguerite._id,
      assigneeId:  marguerite._id,
      tags:        [{ name: 'Feature', color: '#22c55e' }],
      checklist:   [
        { text: 'Registrazione e login', done: true },
        { text: 'Refresh token', done: true },
        { text: 'Ruoli utente e admin', done: true },
      ],
    },
    {
      title:       'Dashboard monitoraggio veicoli',
      description: 'Vista aggregata per stato, reparto e priorita degli ordini di lavorazione.',
      status:      'done',
      priority:    'high',
      projectId:   project._id,
      createdBy:   marguerite._id,
      assigneeId:  matteo._id,
    },
    {
      title:       'Notifiche real-time tra reparti',
      description: 'Integrazione Socket.io per aggiornamenti istantanei su cambi di stato.',
      status:      'in_progress',
      priority:    'medium',
      deadline,
      tags:        [{ name: 'Feature', color: '#22c55e' }, { name: 'Design', color: '#a855f7' }],
      checklist:   [
        { text: 'Stanze Socket.io per progetto', done: true },
        { text: 'Evento di cambio stato', done: true },
        { text: 'Campanella nel frontend', done: false },
        { text: 'Test end-to-end', done: false },
      ],
      projectId:   project._id,
      createdBy:   marguerite._id,
      assigneeId:  marguerite._id,
    },
    {
      title:       'Test di integrazione API',
      description: 'Suite con Supertest: copertura endpoint autenticazione e gestione task.',
      status:      'in_progress',
      priority:    'medium',
      deadline:    yesterday,
      tags:        [{ name: 'Bug', color: '#ef4444' }],
      checklist:   [
        { text: 'Auth', done: true },
        { text: 'Progetti', done: true },
        { text: 'Task e commenti', done: false },
      ],
      projectId:   project._id,
      createdBy:   marguerite._id,
      assigneeId:  matteo._id,
    },
    {
      title:       'Documentazione tecnica API',
      description: 'Documentare sempre e comunque.',
      tags:        [{ name: 'Docs', color: '#3b82f6' }],
      status:      'todo',
      priority:    'low',
      projectId:   project._id,
      createdBy:   marguerite._id,
      assigneeId:  matteo._id,
    },
    {
      title:       'Deploy su ambiente di staging',
      description: 'Configurare pipeline CI/CD e validare il rilascio con il team QA.',
      status:      'todo',
      priority:    'high',
      deadline,
      projectId:   project._id,
      createdBy:   matteo._id,
      assigneeId:  marguerite._id,
    },
  ]);

  console.log('6 task creati (2 done, 2 in progress, 2 todo)');

  const notifiche = tasks.find(t => t.title.startsWith('Notifiche'));
  const testApi   = tasks.find(t => t.title.startsWith('Test di integrazione'));
  await Comment.create([
    { taskId: notifiche._id, projectId: project._id, userId: matteo._id,     text: 'La campanella la mettiamo in alto a destra?' },
    { taskId: notifiche._id, projectId: project._id, userId: marguerite._id, text: 'Si, con il contatore delle non lette.' },
    { taskId: testApi._id,   projectId: project._id, userId: marguerite._id, text: 'Mancano i test sui commenti, la scadenza era ieri.' },
  ]);

  console.log('3 commenti creati');

  await Message.create([
    { projectId: project._id, userId: marguerite._id, text: 'Ciao Matteo, ho completato il modulo di autenticazione. Puoi procedere con la dashboard.' },
    { projectId: project._id, userId: matteo._id,     text: 'Perfetto. Ho gia impostato la struttura della dashboard veicoli.' },
    { projectId: project._id, userId: marguerite._id, text: 'Ottimo. Ricordati che il rilascio in staging è previsto per lunedì.' },
    { projectId: project._id, userId: matteo._id,     text: 'Confermato. Apro subito il task per il deploy.' },
  ]);

  console.log('4 messaggi chat creati');

  console.log('\n========================================');
  console.log('  SEED COMPLETATO - Credenziali demo:');
  console.log('  marguerite@taskflow.dev  ->  MiniKiwi123!  (admin)');
  console.log('  matteo@taskflow.dev      ->  Banana456!    (user)');
  console.log('  http://localhost:3000');
  console.log('========================================\n');

  await mongoose.disconnect();
}

seed().catch(err => {
  console.error('Errore nel seed:', err.message);
  process.exit(1);
});
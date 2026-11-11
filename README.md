# Kairos

*your flow tracker*

Piattaforma collaborativa di gestione progetti con task board Kanban, chat di progetto e notifiche in tempo reale.
Kairos, in greco, è il momento giusto: l'app aiuta il team a fare la cosa giusta al momento giusto, tra priorità, scadenze e checklist.
Progetto sviluppato per il percorso BID Web Development dell'ITS ICT Piemonte.

## Funzionalità

- **Autenticazione** con JWT, access token a breve durata e refresh token salvati su MongoDB
- **Progetti** pubblici o privati, con categoria, membri, archiviazione e segnalazione
- **Catalogo** dei progetti pubblici filtrabile per categoria e **dashboard** personale
- **Task board** a tre colonne (`todo`, `in_progress`, `done`) con drag & drop animato (SortableJS)
- **Ricerca e filtri** in tempo reale per testo, etichetta, priorità e assegnatario, con ordinamento per colonna
- **Card** con avatar dell'assegnatario, badge di priorità, scadenza evidenziata se vicina o scaduta
- **Dettaglio task** con checklist e barra di progresso, etichette colorate e thread di commenti
- **Chat di progetto** in tempo reale con Socket.io, con storico consultabile via API
- **Notifiche** per assegnazione task, cambio stato, nuovi membri e segnalazioni
- **Area admin** per bloccare utenti e ripristinare progetti nascosti
- **Validazione** di body, query e parametri con Zod e gestione centralizzata degli errori

## Stack

| Livello | Tecnologie |
|---|---|
| Runtime | Node.js 20+ |
| Server | Express 5, Socket.io 4 |
| Database | MongoDB, Mongoose 9 |
| Sicurezza | Passport JWT, bcryptjs, refresh token |
| Validazione | Zod 4 (backend) e controlli campo per campo nei form (frontend) |
| Test | Jest, Supertest |
| Frontend | HTML, CSS, JavaScript vanilla, SortableJS (`public/index.html`) |

## Struttura

```
Kairos/
├── app.js                  # Configurazione Express e registrazione route
├── server.js               # Entry point: MongoDB, HTTP server, Socket.io
├── seed.js                 # Dati di esempio
├── config/                 # Variabili d'ambiente e strategia Passport
├── public/                 # Frontend demo
├── backend/
│   ├── controllers/        # Gestione richieste e risposte
│   ├── services/           # Logica di business
│   ├── models/             # Schemi Mongoose
│   ├── routes/             # Definizione endpoint
│   ├── middleware/         # Auth, permessi di progetto, validazione, errori
│   ├── validators/         # Schemi Zod
│   ├── sockets/            # Eventi Socket.io
│   ├── utils/              # Costanti, errori, helper
│   └── __tests__/          # Test Jest
└── Kairos.postman_collection.json
```

## Avvio rapido

Requisiti: Node.js 20 o superiore e un'istanza MongoDB (locale o Atlas).

```bash
git clone https://github.com/MDL-CNAKE/Kairos.git
cd Kairos
npm install
cp .env.example .env      # poi inserisci i tuoi valori
npm run seed              # opzionale, popola il database con dati di esempio
npm run dev
```

L'app risponde su `http://localhost:3000` (frontend demo) e l'API su `http://localhost:3000/api`.

### Variabili d'ambiente

| Variabile | Descrizione | Default |
|---|---|---|
| `PORT` | Porta del server | `3000` |
| `MONGODB_URI` | Stringa di connessione MongoDB | obbligatoria |
| `JWT_SECRET` | Segreto per firmare i token | obbligatoria |
| `JWT_EXPIRE` | Durata dell'access token | `15m` |
| `REFRESH_TOKEN_EXPIRE_DAYS` | Durata del refresh token in giorni | `7` |

### Utenti di esempio (dopo il seed)

| Utente | Email | Password | Ruolo |
|---|---|---|---|
| marguerite | marguerite@kairos.dev | MiniKiwi123! | admin |
| matteo | matteo@kairos.dev | Banana456! | user |

Sono credenziali di sviluppo, da non usare in produzione.

## API

Tutte le route protette richiedono l'header `Authorization: Bearer <accessToken>`.
La collection completa è in `Kairos.postman_collection.json`.

| Metodo | Endpoint | Descrizione |
|---|---|---|
| POST | `/api/auth/register` | Registrazione |
| POST | `/api/auth/login` | Login, restituisce access e refresh token |
| POST | `/api/auth/refresh` | Nuovo access token |
| POST | `/api/auth/logout` | Revoca il refresh token |
| GET | `/api/auth/me` | Profilo dell'utente autenticato |
| GET | `/api/projects/catalog` | Progetti pubblici, filtro `?category=` |
| GET | `/api/projects/dashboard` | Progetti e task dell'utente |
| POST | `/api/projects` | Crea un progetto |
| GET, PUT, DELETE | `/api/projects/:projectId` | Dettaglio, modifica, eliminazione |
| PATCH | `/api/projects/:projectId/archive` · `/unarchive` | Archivia o ripristina |
| POST, DELETE | `/api/projects/:projectId/members[/:userId]` | Gestione membri |
| POST | `/api/projects/:projectId/report` | Segnala un progetto |
| GET | `/api/projects/:projectId/tasks/board` | Task raggruppati per colonna |
| GET, POST | `/api/projects/:projectId/tasks` | Elenco e creazione task |
| GET, PUT, DELETE | `/api/projects/:projectId/tasks/:taskId` | Dettaglio, modifica (anche `checklist` e `tags`), eliminazione |
| PATCH | `/api/projects/:projectId/tasks/:taskId/status` | Cambio colonna |
| GET, POST | `/api/projects/:projectId/tasks/:taskId/comments` | Commenti del task |
| DELETE | `/api/projects/:projectId/tasks/:taskId/comments/:commentId` | Elimina un commento (autore o admin) |
| GET, POST | `/api/projects/:projectId/chat/messages` | Storico e invio messaggi |
| GET | `/api/notifications` | Notifiche dell'utente |
| PATCH | `/api/notifications/read-all` · `/:notificationId/read` | Segna come lette |
| GET | `/api/admin/users` · `/api/admin/projects` | Elenchi per l'amministratore |
| PATCH | `/api/admin/users/:userId/block` · `/unblock` | Blocca o sblocca un utente |
| PATCH | `/api/admin/projects/:projectId/restore` | Ripristina un progetto nascosto |

### Eventi Socket.io

Le azioni passano tutte dalle API REST, che validano i dati e controllano i permessi; il socket serve solo a ricevere gli aggiornamenti in tempo reale.

| Evento | Direzione | Descrizione |
|---|---|---|
| `project:join` | client → server | Entra nella stanza del progetto (solo membri o admin) |
| `project:leave` | client → server | Esce dalla stanza |
| `message:received` | server → client | Nuovo messaggio nella stanza |
| `notification:new` | server → client | Nuova notifica personale (stanza `user:<id>`) |
| `task:created` · `task:updated` · `task:status_changed` · `task:deleted` | server → client | La board si aggiorna da sola |
| `comment:created` · `comment:deleted` | server → client | Commenti del task in tempo reale |

## Test

```bash
npm test
```

89 test con Jest e Supertest coprono autenticazione, progetti, task (con checklist ed etichette), commenti, chat, notifiche, area admin, permessi delle stanze Socket.io e gestione degli errori. I servizi sono simulati, quindi non serve un database per eseguirli.

### Checklist ed etichette

Si modificano con `PUT /api/projects/:projectId/tasks/:taskId` inviando l'elenco completo:

```json
{
  "checklist": [{ "text": "Schema", "done": true }, { "text": "Route", "done": false }],
  "tags": [{ "name": "Bug", "color": "#ef4444" }]
}
```

Limiti: 50 voci di checklist da 200 caratteri, 10 etichette da 30 caratteri con colore esadecimale e nomi unici, commenti da 1000 caratteri.

## Roadmap

Lo stato dei lavori è tracciato nelle [Issue](../../issues) e nella board del progetto GitHub.

## Autrice

Marguerite El Mbimbey, ITS ICT Piemonte, corso BID Web Development (2025–2027).

## ✅ Riepilogo Roadmap

Tutte le issue previste dalla roadmap sono state completate, commentate e chiuse con successo.

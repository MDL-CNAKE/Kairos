# TaskFlow

Piattaforma collaborativa di gestione progetti con task board Kanban, chat di progetto e notifiche in tempo reale.
Progetto sviluppato per il percorso BID Web Development dell'ITS ICT Piemonte.

## Funzionalità

- **Autenticazione** con JWT, access token a breve durata e refresh token salvati su MongoDB
- **Progetti** pubblici o privati, con categoria, membri, archiviazione e segnalazione
- **Catalogo** dei progetti pubblici filtrabile per categoria e **dashboard** personale
- **Task board** a tre colonne (`todo`, `in_progress`, `done`) con priorità e assegnatario
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
| Validazione | Zod 4 |
| Test | Jest, Supertest |
| Frontend demo | HTML, CSS, JavaScript (`public/index.html`) |

## Struttura

```
TaskFlow/
├── app.js                  # Configurazione Express e registrazione route
├── server.js               # Entry point: MongoDB, HTTP server, Socket.io
├── seed.js                 # Dati di esempio
├── config/                 # Variabili d'ambiente, DB, strategia Passport
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
└── TaskFlow.postman_collection.json
```

## Avvio rapido

Requisiti: Node.js 20 o superiore e un'istanza MongoDB (locale o Atlas).

```bash
git clone <url-del-repository>
cd TaskFlow
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
| marguerite | marguerite@taskflow.dev | Password123! | admin |
| matteo | matteo@taskflow.dev | Password123! | user |

Sono credenziali di sviluppo, da non usare in produzione.

## API

Tutte le route protette richiedono l'header `Authorization: Bearer <accessToken>`.
La collection completa è in `TaskFlow.postman_collection.json`.

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
| GET, PUT, PATCH, DELETE | `/api/projects/:projectId/tasks/:taskId` | Gestione singolo task |
| GET, POST | `/api/projects/:projectId/chat/messages` | Storico e invio messaggi |
| GET | `/api/notifications` | Notifiche dell'utente |
| PATCH | `/api/notifications/read-all` · `/:notificationId/read` | Segna come lette |
| GET | `/api/admin/users` · `/api/admin/projects` | Elenchi per l'amministratore |
| PATCH | `/api/admin/users/:userId/block` · `/unblock` | Blocca o sblocca un utente |
| PATCH | `/api/admin/projects/:projectId/restore` | Ripristina un progetto nascosto |

### Eventi Socket.io

| Evento | Direzione | Descrizione |
|---|---|---|
| `project:join` | client → server | Entra nella stanza del progetto |
| `project:leave` | client → server | Esce dalla stanza |
| `message:send` | client → server | Invia un messaggio in chat |
| `message:received` | server → client | Nuovo messaggio nella stanza |

## Test

```bash
npm test
```

58 test di integrazione con Jest e Supertest coprono autenticazione, progetti, task, chat, notifiche e area admin. I servizi sono simulati, quindi non serve un database per eseguirli.

## Roadmap

Lo stato dei lavori è tracciato nelle [Issue](../../issues) e nella board del progetto GitHub.

## Autrice

Marguerite El Mbimbey, ITS ICT Piemonte, corso BID Web Development (2025–2027).

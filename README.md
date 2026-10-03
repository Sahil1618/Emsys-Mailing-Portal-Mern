# EMSYS Mail Automation Portal

This is a MERN-stack `punch-portal` project.

## Stack

- **MongoDB + Mongoose** — persistent entities, recipients, templates and send logs.
- **MongoDB GridFS** — persistent CSV attachment archive; avoids storing large CSV blobs in normal documents.
- **Express + Node.js** — API, CSV parsing and SMTP email delivery.
- **React + Vite** — dashboard UI.
- **Nodemailer** — SMTP delivery.
- **JWT** — admin session.

## Original functionality carried over

- POS Name based entity matching.
- Shared Scheduling Entity codes can map to different plants.
- Combined CSV files are sliced to the selected POS Name(s).
- Permanently excluded POS Names.
- Multiple named SMTP accounts.
- To/Cc/Bcc recipients.
- Saved subject/body templates with placeholders.
- Day-Ahead filename appended to the subject.
- Email send history.
- Downloadable archived CSVs.
- South-region seed data.
- Admin-protected configuration.

## Run locally

### 1. MongoDB

Run MongoDB locally or create a MongoDB Atlas cluster.

### 2. Server

```bash
cd server
cp .env.example .env
# edit .env
npm install
npm run dev
```

### 3. Client

```bash
cd client
npm install
npm run dev
```

Open `http://localhost:5173`.


Add additional SMTP accounts inside `SMTP_ACCOUNTS_JSON` using the same structure and select the account name under Manage Entities.


The rewrite includes `server/src/migrateSqlite.js`. Copy your old Streamlit `data/portal.db` somewhere accessible and run:

```bash
cd server
npm install
node src/migrateSqlite.js /absolute/path/to/portal.db
```


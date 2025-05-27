# DelimHub - Project Management Tool

DelimHub is a ClickUp-inspired project management tool with team chat, file attachments, calendar integration, and admin-controlled user management.

## Features

- **Dashboard**: Overview of project statistics and recent activities
- **Task Management**: Kanban-style task board with drag-and-drop functionality
- **Team Chat**: Real-time messaging between team members
- **Calendar**: Event scheduling and management
- **File Attachments**: Upload and manage documents and media files
- **User Management**: Admin panel for managing team members

## Installation & Setup

### Prerequisites

- Node.js (v16 or newer)
- PostgreSQL database

### Step 1: Clone the repository

```bash
git clone https://github.com/yourusername/delimhub.git
cd delimhub
```

### Step 2: Install dependencies

```bash
npm install
```

### Step 3: Set up the database

1. Create a PostgreSQL database
2. Set the `DATABASE_URL` environment variable to your PostgreSQL connection string

```bash
export DATABASE_URL="postgresql://username:password@localhost:5432/delimhub"
```

### Step 4: Set up environment variables

Create a `.env` file in the root directory with the following variables:

```
DATABASE_URL=postgresql://username:password@localhost:5432/delimhub
SESSION_SECRET=your_session_secret
JWT_SECRET=your_jwt_secret
```

### Step 5: Initialize the database

```bash
npm run db:push
```

### Step 6: Start the application

```bash
npm run dev
```

The application should now be running on [http://localhost:5000](http://localhost:5000)

## Demo Credentials

You can use these credentials to test the application:

- **Admin User**: 
  - Username: `admin`
  - Password: `admin`

- **Regular User**:
  - Username: `user`
  - Password: `user`

## Technology Stack

- **Frontend**: React, Tailwind CSS, shadcn/ui components
- **Backend**: Node.js, Express
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: JWT-based authentication
- **Real-time Communication**: WebSockets

## Project Structure

- `/client` - Frontend React application
- `/server` - Backend Express server
- `/shared` - Shared types and schemas
- `/uploads` - Directory for uploaded files

## License

This project is licensed under the MIT License.## Hi there 👋

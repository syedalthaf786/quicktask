# Team Task Assignment Feature - Architecture Design

## Overview
Enable team leads to assign tasks to individual team members with tracking capabilities.

## Current State
- Tasks are owned by a single user (`userId`)
- No team/workspace concept exists
- No task assignment to other users

---

## 1. Database Schema Changes

### Option A: Simple Assignment (Quick Implementation)
Add `assigneeId` to existing Task model:

```prisma
model Task {
  id          Int       @id @default(autoincrement())
  title       String
  description String?
  priority    Priority  @default(MEDIUM)
  status      Status    @default(TODO)
  dueDate     DateTime
  completedAt DateTime?
  userId      Int              // Creator/Owner
  user        User             @relation(fields: [userId], references: [id])
  assigneeId  Int?             // Assigned team member
  assignee    User?            @relation("TaskAssignee", fields: [assigneeId], references: [id])
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
}
```

### Option B: Full Team Management (Recommended)
Add Team models for better organization:

```prisma
model Team {
  id          Int       @id @default(autoincrement())
  name        String
  description String?
  ownerId     Int
  owner       User      @relation(fields: [ownerId], references: [id])
  members     TeamMember[]
  tasks       Task[]
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
}

model TeamMember {
  id        Int      @id @default(autoincrement())
  teamId    Int
  team      Team     @relation(fields: [teamId], references: [id], onDelete: Cascade)
  userId    Int
  user      User     @relation(fields: [userId], references: [id])
  role      TeamRole @default(MEMBER)
  joinedAt  DateTime @default(now())

  @@unique([teamId, userId])
}

enum TeamRole {
  OWNER
  ADMIN
  MEMBER
}

model Task {
  id          Int       @id @default(autoincrement())
  title       String
  description String?
  priority    Priority  @default(MEDIUM)
  status      Status    @default(TODO)
  dueDate     DateTime
  completedAt DateTime?
  creatorId   Int
  creator     User      @relation("TaskCreator", fields: [creatorId], references: [id])
  assigneeId  Int?
  assignee    User?     @relation("TaskAssignee", fields: [assigneeId], references: [id])
  teamId      Int?
  team        Team?     @relation(fields: [teamId], references: [id])
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
}

model User {
  id              Int          @id @default(autoincrement())
  name            String
  email           String       @unique
  password        String
  ownedTeams      Team[]       @relation("TeamOwner")
  teamMemberships TeamMember[]
  createdTasks    Task[]       @relation("TaskCreator")
  assignedTasks   Task[]       @relation("TaskAssignee")
  createdAt       DateTime     @default(now())
  updatedAt       DateTime     @updatedAt
}
```

---

## 2. Backend API Endpoints

### Team Management
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/teams` | Create new team |
| GET | `/api/teams` | Get user's teams |
| GET | `/api/teams/:id` | Get team details |
| PUT | `/api/teams/:id` | Update team |
| DELETE | `/api/teams/:id` | Delete team |
| POST | `/api/teams/:id/members` | Add member to team |
| DELETE | `/api/teams/:id/members/:userId` | Remove member |
| GET | `/api/teams/:id/members` | Get team members |

### Task Assignment
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/tasks` | Create task (with optional assignee) |
| PUT | `/api/tasks/:id/assign` | Assign task to member |
| PUT | `/api/tasks/:id/unassign` | Remove assignment |
| GET | `/api/tasks/assigned` | Get tasks assigned to me |
| GET | `/api/tasks/team/:teamId` | Get team tasks |
| GET | `/api/users/:id/assigned-tasks` | Get tasks assigned to specific user |

---

## 3. Frontend Components

### New Pages
```
src/pages/
├── Teams.jsx              # Team list/management
├── TeamDetails.jsx        # Team view with members
├── TeamTasks.jsx          # Team task board
└── AssignTaskModal.jsx    # Reusable assignment modal
```

### Updated Components
```
src/components/
├── TaskCard.jsx           # Show assignee info
├── TaskForm.jsx           # Add assignee dropdown
└── Navbar.jsx             # Add team navigation

src/pages/
├── Tasks.jsx              # Add "My Tasks" / "Team Tasks" tabs
└── Dashboard.jsx          # Show assigned tasks summary
```

### New Services
```javascript
// src/services/teamService.js
export const teamService = {
  createTeam(data)
  getMyTeams()
  getTeamMembers(teamId)
  addMember(teamId, userId, role)
  removeMember(teamId, userId)
}

// src/services/taskService.js additions
export const taskService = {
  assignTask(taskId, assigneeId)
  unassignTask(taskId)
  getAssignedTasks()
  getTeamTasks(teamId)
}
```

---

## 4. UI/UX Design

### Task Card with Assignee
```
┌─────────────────────────────────┐
│ Task Title                      │ ← Edit
├─────────────────────────────────┤
│ High • In Progress              │
├─────────────────────────────────┤
│ Assigned to: John Doe           │ ← Avatar + Name
│ Due: Jan 15, 2025               │
└─────────────────────────────────┘
```

### Task Creation Modal
```
┌─────────────────────────────────────┐
│ Create New Task                     │
├─────────────────────────────────────┤
│ Title *                            │
│ [____________________]              │
│                                     │
│ Description                         │
│ [____________________]              │
│                                     │
│ Priority *  Status *                │
│ [Medium ▼]  [Todo ▼]                │
│                                     │
│ Due Date *                          │
│ [2025-01-15]                        │
│                                     │
│ Assign to Team Member               │ ← NEW
│ [Select member... ▼]                │
│                                     │
│ [Cancel]  [Create Task]             │
└─────────────────────────────────────┘
```

### Team View
```
┌─────────────────────────────────────────┐
│ Engineering Team                   ⚙️   │
├─────────────────────────────────────────┤
│ Members (5)                            │
│ 👤 John Doe (Admin)                    │
│ 👤 Jane Smith (Member)                 │
│ 👤 Bob Wilson (Member)                 │
│ [+ Invite Member]                      │
├─────────────────────────────────────────┤
│ Tasks (12)    My Tasks (3)             │
│ ┌─────────┐ ┌─────────┐                │
│ │ To Do(4)│ │In Prog(3)│                │
│ └─────────┘ └─────────┘                │
│ ┌─────────┐ ┌─────────┐                │
│ │Done(5)  │ │        │                │
│ └─────────┘ └─────────┘                │
└─────────────────────────────────────────┘
```

---

## 5. Implementation Roadmap

### Phase 1: Simple Assignment (MVP)
- [ ] Add `assigneeId` to Task schema
- [ ] Create API endpoints for assignment
- [ ] Add assignee dropdown to task form
- [ ] Display assignee on task cards
- [ ] Add "Assigned to me" filter

### Phase 2: Team Management
- [ ] Create Team, TeamMember models
- [ ] Team CRUD endpoints
- [ ] Team management UI
- [ ] Invite/remove members
- [ ] Team task view

### Phase 3: Advanced Features
- [ ] Task comments/updates
- [ ] Email notifications
- [ ] Task reassignment history
- [ ] Team analytics
- [ ] Drag-drop task board

---

## 6. Security Considerations

1. **Authorization**
   - Only team members can view team tasks
   - Only team admins can assign tasks
   - Only task creator can reassign

2. **Validation**
   - Validate assignee is team member
   - Prevent assigning to non-existent users
   - Check team ownership

3. **Data Isolation**
   - Users can only see their teams
   - Tasks are scoped to teams
   - Personal tasks remain private

---

## 7. Migration Strategy

```sql
-- Add assignee column (Phase 1)
ALTER TABLE "Task" ADD COLUMN "assigneeId" INTEGER;
ALTER TABLE "Task" ADD CONSTRAINT "Task_assigneeId_fkey" 
  FOREIGN KEY ("assigneeId") REFERENCES "User"(id);

-- Create Team tables (Phase 2)
CREATE TABLE "Team" (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  "ownerId" INTEGER NOT NULL,
  "createdAt" TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY ("ownerId") REFERENCES "User"(id)
);

CREATE TABLE "TeamMember" (
  id SERIAL PRIMARY KEY,
  "teamId" INTEGER NOT NULL,
  "userId" INTEGER NOT NULL,
  role TEXT DEFAULT 'MEMBER',
  "joinedAt" TIMESTAMP DEFAULT NOW(),
  UNIQUE("teamId", "userId"),
  FOREIGN KEY ("teamId") REFERENCES "Team"(id) ON DELETE CASCADE,
  FOREIGN KEY ("userId") REFERENCES "User"(id)
);

-- Add team reference to tasks
ALTER TABLE "Task" ADD COLUMN "teamId" INTEGER;
ALTER TABLE "Task" ADD CONSTRAINT "Task_teamId_fkey" 
  FOREIGN KEY ("teamId") REFERENCES "Team"(id);
```

---

## 8. Estimated Effort

| Phase | Components | Complexity |
|-------|------------|------------|
| Phase 1 | Schema, 3 API endpoints, UI updates | Medium |
| Phase 2 | 5 API endpoints, 3 new pages | High |
| Phase 3 | Real-time features, analytics | High |

---

## 9. Next Steps

1. **Confirm Scope** - Start with Phase 1 (Simple Assignment) or Phase 2 (Full Teams)?
2. **User Stories** - Define specific use cases
3. **Design Review** - Approve UI mockups
4. **Implementation** - Switch to Code mode

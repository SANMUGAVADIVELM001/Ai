import mongoose, { Schema } from 'mongoose';
import type { GoalState, LearnerRecord, User } from '../types/index.js';

const userSchema = new Schema<User>(
  {
    id: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true },
    createdAt: { type: Number, required: true },
  },
  { versionKey: false }
);

export const UserModel = mongoose.model<User>('User', userSchema);

interface AuthSessionDoc {
  token: string;
  userId: string;
  createdAt: number;
}

const authSessionSchema = new Schema<AuthSessionDoc>(
  {
    token: { type: String, required: true, unique: true },
    userId: { type: String, required: true },
    createdAt: { type: Number, required: true },
  },
  { versionKey: false }
);

export const AuthSessionModel = mongoose.model<AuthSessionDoc>('AuthSession', authSessionSchema);

const goalStateSchema = new Schema<GoalState>(
  {
    roleId: { type: String, required: true },
    createdAt: { type: Number, required: true },
    lastActiveAt: { type: Number, required: true },
    mastery: { type: Schema.Types.Mixed, required: true, default: {} },
    seenQuestionIds: { type: [String], required: true, default: [] },
    assessments: { type: Schema.Types.Mixed, required: true, default: [] },
    moduleProgress: { type: Schema.Types.Mixed, required: true, default: {} },
  },
  { _id: false }
);

const learnerRecordSchema = new Schema<LearnerRecord>(
  {
    learnerId: { type: String, required: true, unique: true },
    createdAt: { type: Number, required: true },
    lastActiveAt: { type: Number, required: true },
    activeRoleId: { type: String, default: null },
    goals: { type: Map, of: goalStateSchema, required: true, default: {} },
  },
  { versionKey: false }
);

export const LearnerRecordModel = mongoose.model<LearnerRecord>('LearnerRecord', learnerRecordSchema);

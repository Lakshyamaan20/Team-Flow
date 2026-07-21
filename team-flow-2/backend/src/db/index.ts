import initSqlJs, { Database as SqlJsDb } from "sql.js";
import fs from "fs";
import path from "path";

const DB_PATH = path.join(__dirname, "..", "..", "prisma", "teamflow.db");

let db: SqlJsDb;

async function getDb(): Promise<SqlJsDb> {
  if (db) return db;
  const SQL = await initSqlJs();
  if (fs.existsSync(DB_PATH)) {
    const buffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
  }
  db.run("PRAGMA journal_mode=WAL");
  db.run("PRAGMA foreign_keys=ON");
  return db;
}

function save() {
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  fs.writeFileSync(DB_PATH, buffer);
}

export async function initDb() {
  const d = await getDb();
  d.run(`
    CREATE TABLE IF NOT EXISTS Department (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE
    )
  `);
  d.run(`
    CREATE TABLE IF NOT EXISTS User (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      name TEXT NOT NULL,
      avatar TEXT,
      role TEXT NOT NULL DEFAULT 'MEMBER',
      departmentId TEXT,
      hierarchyLevel INT NOT NULL DEFAULT 1,
      permissions TEXT NOT NULL DEFAULT '{}',
      createdAt TEXT NOT NULL DEFAULT (datetime('now')),
      updatedAt TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (departmentId) REFERENCES Department(id)
    )
  `);
  try { d.run("ALTER TABLE User ADD COLUMN hierarchyLevel INT NOT NULL DEFAULT 1"); } catch {}
  try { d.run("ALTER TABLE User ADD COLUMN permissions TEXT NOT NULL DEFAULT '{}'"); } catch {}
  d.run(`
    CREATE TABLE IF NOT EXISTS Project (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      startDate TEXT NOT NULL,
      endDate TEXT,
      status TEXT NOT NULL DEFAULT 'ACTIVE',
      departmentId TEXT,
      createdBy TEXT,
      createdAt TEXT NOT NULL DEFAULT (datetime('now')),
      updatedAt TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (departmentId) REFERENCES Department(id)
    )
  `);
  d.run(`
    CREATE TABLE IF NOT EXISTS Task (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      status TEXT NOT NULL DEFAULT 'TODO',
      priority TEXT NOT NULL DEFAULT 'MEDIUM',
      dueDate TEXT,
      estimatedHours REAL,
      actualHours REAL,
      tags TEXT DEFAULT '',
      assigneeId TEXT,
      createdById TEXT,
      projectId TEXT NOT NULL,
      riskScore REAL,
      riskLevel TEXT,
      reviewScore INTEGER,
      reviewComment TEXT,
      sortOrder INTEGER DEFAULT 0,
      createdAt TEXT NOT NULL DEFAULT (datetime('now')),
      updatedAt TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (assigneeId) REFERENCES User(id),
      FOREIGN KEY (createdById) REFERENCES User(id),
      FOREIGN KEY (projectId) REFERENCES Project(id) ON DELETE CASCADE
    )
  `);
  d.run(`
    CREATE TABLE IF NOT EXISTS Comment (
      id TEXT PRIMARY KEY,
      content TEXT NOT NULL,
      taskId TEXT NOT NULL,
      userId TEXT NOT NULL,
      createdAt TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (taskId) REFERENCES Task(id) ON DELETE CASCADE,
      FOREIGN KEY (userId) REFERENCES User(id)
    )
  `);
  d.run(`
    CREATE TABLE IF NOT EXISTS ActivityLog (
      id TEXT PRIMARY KEY,
      action TEXT NOT NULL,
      details TEXT,
      taskId TEXT NOT NULL,
      userId TEXT NOT NULL,
      createdAt TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (taskId) REFERENCES Task(id) ON DELETE CASCADE,
      FOREIGN KEY (userId) REFERENCES User(id)
    )
  `);
  d.run(`
    CREATE TABLE IF NOT EXISTS Notification (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'INFO',
      read INTEGER NOT NULL DEFAULT 0,
      createdAt TEXT NOT NULL DEFAULT (datetime('now')),
      updatedAt TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (userId) REFERENCES User(id) ON DELETE CASCADE
    )
  `);
  try { d.run("ALTER TABLE Notification ADD COLUMN updatedAt TEXT NOT NULL DEFAULT (datetime('now'))"); } catch {}
  d.run(`
    CREATE TABLE IF NOT EXISTS TaskDependency (
      id TEXT PRIMARY KEY,
      taskId TEXT NOT NULL,
      dependsOnId TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'FS',
      FOREIGN KEY (taskId) REFERENCES Task(id) ON DELETE CASCADE,
      FOREIGN KEY (dependsOnId) REFERENCES Task(id) ON DELETE CASCADE
    )
  `);
  d.run(`
    CREATE TABLE IF NOT EXISTS TimeEntry (
      id TEXT PRIMARY KEY,
      taskId TEXT NOT NULL,
      userId TEXT NOT NULL,
      date TEXT NOT NULL,
      hours REAL NOT NULL,
      description TEXT DEFAULT '',
      createdAt TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (taskId) REFERENCES Task(id) ON DELETE CASCADE,
      FOREIGN KEY (userId) REFERENCES User(id) ON DELETE CASCADE
    )
  `);
  d.run(`
    CREATE TABLE IF NOT EXISTS Attachment (
      id TEXT PRIMARY KEY,
      taskId TEXT NOT NULL,
      userId TEXT NOT NULL,
      fileName TEXT NOT NULL,
      originalName TEXT NOT NULL,
      mimeType TEXT NOT NULL,
      size INTEGER NOT NULL,
      createdAt TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (taskId) REFERENCES Task(id) ON DELETE CASCADE,
      FOREIGN KEY (userId) REFERENCES User(id) ON DELETE CASCADE
    )
  `);
  save();
}

function cuid(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 10);
  return `c${timestamp}${random}`;
}

function whereClause(filters: Record<string, any>, prefix = ""): { sql: string; params: any[] } {
  const conditions: string[] = [];
  const params: any[] = [];
  for (const [key, value] of Object.entries(filters)) {
    if (value === undefined || value === null) continue;
    const col = prefix ? `${prefix}.${key}` : key;
    if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      if (value.not !== undefined) {
        conditions.push(`${col} != ?`);
        params.push(value.not);
      } else if (value.in) {
        const placeholders = value.in.map(() => "?").join(",");
        conditions.push(`${col} IN (${placeholders})`);
        params.push(...value.in);
      } else if (value.gte) {
        conditions.push(`${col} >= ?`);
        params.push(value.gte);
      } else if (value.lte) {
        conditions.push(`${col} <= ?`);
        params.push(value.lte);
      }
    } else {
      conditions.push(`${col} = ?`);
      params.push(value);
    }
  }
  return { sql: conditions.length ? ` WHERE ${conditions.join(" AND ")}` : "", params };
}

function rowToObj(row: any[] | null | undefined, columns: string[]): Record<string, any> | null {
  if (!row) return null;
  const obj: Record<string, any> = {};
  columns.forEach((col, i) => {
    let val = row[i];
    if (col === "read" || col === "sortOrder") {
      val = Number(val) || 0;
    }
    obj[col] = val;
  });
  return obj;
}

function rowsToObj(rows: any[][], columns: string[]): Record<string, any>[] {
  return rows.map((row) => rowToObj(row, columns)!);
}

class TableOps {
  private table: string;
  private columns: string[];

  constructor(table: string, columns: string[]) {
    this.table = table;
    this.columns = columns;
  }

  private async getDb() {
    return getDb();
  }

  async findMany(opts: { where?: Record<string, any>; orderBy?: Record<string, string>; take?: number; include?: Record<string, any> } = {}): Promise<any[]> {
    const d = await this.getDb();
    const w = opts.where ? whereClause(opts.where) : { sql: "", params: [] };
    let orderSql = "";
    if (opts.orderBy) {
      const entries = Object.entries(opts.orderBy);
      if (entries.length) {
        orderSql = ` ORDER BY ${entries.map(([k, v]) => `${k} ${v}`).join(", ")}`;
      }
    }
    let limitSql = "";
    if (opts.take) limitSql = ` LIMIT ${opts.take}`;
    const sql = `SELECT * FROM ${this.table}${w.sql}${orderSql}${limitSql}`;
    const results = d.exec(sql, w.params);
    if (!results.length) return [];
    const { columns, values } = results[0];
    return rowsToObj(values, columns);
  }

  async findUnique(where: Record<string, any>): Promise<any> {
    return this.findFirst({ where });
  }

  async findFirst(opts: { where?: Record<string, any>; orderBy?: Record<string, string> } = {}): Promise<any | null> {
    const d = await this.getDb();
    const w = opts.where ? whereClause(opts.where) : { sql: "", params: [] };
    let orderSql = "";
    if (opts.orderBy) {
      const entries = Object.entries(opts.orderBy);
      if (entries.length) {
        orderSql = ` ORDER BY ${entries.map(([k, v]) => `${k} ${v}`).join(", ")}`;
      }
    }
    const sql = `SELECT * FROM ${this.table}${w.sql}${orderSql} LIMIT 1`;
    const results = d.exec(sql, w.params);
    if (!results.length || !results[0].values.length) return null;
    const { columns, values } = results[0];
    return rowToObj(values[0], columns);
  }

  async create(data: any): Promise<any> {
    const d = await this.getDb();
    const id = data.id || cuid();
    const cols = ["id", ...Object.keys(data).filter((k) => k !== "id")];
    const vals = [id, ...cols.slice(1).map((k) => (data[k] === undefined ? null : data[k]))];
    const placeholders = cols.map(() => "?").join(",");
    const sql = `INSERT INTO ${this.table} (${cols.join(",")}) VALUES (${placeholders})`;
    d.run(sql, vals);
    save();
    return this.findUnique({ id });
  }

  async update(where: Record<string, any>, data: any): Promise<any> {
    const d = await this.getDb();
    const sets = Object.keys(data)
      .filter((k) => data[k] !== undefined)
      .map((k) => `${k} = ?`);
    const vals = Object.keys(data)
      .filter((k) => data[k] !== undefined)
      .map((k) => data[k]);
    const w = whereClause(where);
    const sql = `UPDATE ${this.table} SET ${sets.join(", ")}, updatedAt = datetime('now')${w.sql}`;
    d.run(sql, [...vals, ...w.params]);
    save();
    return this.findFirst(where);
  }

  async updateMany(where: Record<string, any>, data: any): Promise<number> {
    const d = await this.getDb();
    const sets = Object.keys(data)
      .filter((k) => data[k] !== undefined)
      .map((k) => `${k} = ?`);
    const vals = Object.keys(data)
      .filter((k) => data[k] !== undefined)
      .map((k) => data[k]);
    const w = whereClause(where);
    const sql = `UPDATE ${this.table} SET ${sets.join(", ")}, updatedAt = datetime('now')${w.sql}`;
    d.run(sql, [...vals, ...w.params]);
    save();
    return d.getRowsModified();
  }

  async delete(where: Record<string, any>): Promise<any> {
    const existing = await this.findFirst({ where });
    if (!existing) return null;
    const d = await this.getDb();
    const w = whereClause(where);
    const sql = `DELETE FROM ${this.table}${w.sql}`;
    d.run(sql, w.params);
    save();
    return existing;
  }

  async deleteMany(where: Record<string, any>): Promise<number> {
    const d = await this.getDb();
    const w = whereClause(where);
    const sql = `DELETE FROM ${this.table}${w.sql}`;
    d.run(sql, w.params);
    save();
    return d.getRowsModified();
  }

  async count(where?: Record<string, any>): Promise<number> {
    const d = await this.getDb();
    const w = where ? whereClause(where) : { sql: "", params: [] };
    const sql = `SELECT COUNT(*) as cnt FROM ${this.table}${w.sql}`;
    const results = d.exec(sql, w.params);
    if (!results.length || !results[0].values.length) return 0;
    return results[0].values[0][0] as number;
  }

  async raw(sql: string, params?: any[]): Promise<any[]> {
    const d = await this.getDb();
    const results = d.exec(sql, params);
    if (!results.length) return [];
    const { columns, values } = results[0];
    return rowsToObj(values, columns);
  }

  async query(sql: string, params?: any[]): Promise<any> {
    const d = await this.getDb();
    const results = d.exec(sql, params);
    if (!results.length) return [];
    const { columns, values } = results[0];
    return rowsToObj(values, columns);
  }
}

const userCols = ["id", "email", "password", "name", "avatar", "role", "departmentId", "hierarchyLevel", "permissions", "createdAt", "updatedAt"];
const deptCols = ["id", "name"];
const projectCols = ["id", "name", "description", "startDate", "endDate", "status", "departmentId", "createdBy", "createdAt", "updatedAt"];
const taskCols = ["id", "title", "description", "status", "priority", "dueDate", "estimatedHours", "actualHours", "tags", "assigneeId", "createdById", "projectId", "riskScore", "riskLevel", "reviewScore", "reviewComment", "sortOrder", "createdAt", "updatedAt"];
const commentCols = ["id", "content", "taskId", "userId", "createdAt"];
const activityCols = ["id", "action", "details", "taskId", "userId", "createdAt"];
const notifCols = ["id", "userId", "title", "message", "type", "read", "createdAt"];
const timeEntryCols = ["id", "taskId", "userId", "date", "hours", "description", "createdAt"];
const attachmentCols = ["id", "taskId", "userId", "fileName", "originalName", "mimeType", "size", "createdAt"];

export const prisma = {
  user: new TableOps("User", userCols),
  department: new TableOps("Department", deptCols),
  project: new TableOps("Project", projectCols),
  task: new TableOps("Task", taskCols),
  comment: new TableOps("Comment", commentCols),
  activityLog: new TableOps("ActivityLog", activityCols),
  notification: new TableOps("Notification", notifCols),
  timeEntry: new TableOps("TimeEntry", timeEntryCols),
  attachment: new TableOps("Attachment", attachmentCols),
  $queryRaw: async (sql: string, params?: any[]) => {
    const d = await getDb();
    const results = d.exec(sql, params);
    if (!results.length) return [];
    const { columns, values } = results[0];
    return rowsToObj(values, columns);
  },
  $executeRaw: async (sql: string, params?: any[]) => {
    const d = await getDb();
    d.run(sql, params);
    save();
  },
};

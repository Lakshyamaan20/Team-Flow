import net from "net";
import crypto from "crypto";

interface PgConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
}

function md5(data: string): string {
  return crypto.createHash("md5").update(data).digest("hex");
}

export class PgClient {
  private config: PgConfig;
  private socket: net.Socket | null = null;
  private buffer = Buffer.alloc(0);

  constructor(config: PgConfig) {
    this.config = config;
  }

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.socket = net.createConnection(this.config.port, this.config.host, () => {
        this.startup().then(resolve).catch(reject);
      });
      this.socket.on("error", reject);
      this.socket.on("data", (data) => {
        this.buffer = Buffer.concat([this.buffer, data]);
      });
      setTimeout(() => reject(new Error("Connection timeout")), 10000);
    });
  }

  private async startup(): Promise<void> {
    const user = this.config.user;
    const database = this.config.database;
    const params = [`user\0${user}\0database\0${database}\0`];
    const paramStr = params.join("");
    const len = 4 + 4 + Buffer.byteLength(paramStr) + 1;
    const buf = Buffer.alloc(len);
    buf.writeInt32BE(len, 0);
    buf.writeInt32BE(196608, 4);
    buf.write(paramStr, 8);
    this.socket!.write(buf);
    await this.waitForAuth();
  }

  private async waitForAuth(): Promise<void> {
    while (true) {
      await this.recv();
      const type = this.buffer[0];
      const msgLen = this.buffer.readInt32BE(1);
      if (type === 82) {
        const authType = this.buffer.readInt32BE(5);
        if (authType === 0) return;
        if (authType === 3) {
          await this.sendPassword(this.config.password);
          return;
        }
        if (authType === 5) {
          const salt = this.buffer.subarray(9, 13);
          const hash = md5(md5(this.config.password + this.config.user) + salt.toString("hex"));
          const pwd = `md5${hash}`;
          await this.sendPassword(pwd);
          return;
        }
        throw new Error(`Unsupported auth type: ${authType}`);
      }
      if (type === 69) {
        const msg = this.buffer.toString("utf8", 5, msgLen);
        throw new Error(`PostgreSQL error: ${msg}`);
      }
      if (type === 75) continue;
      this.buffer = this.buffer.subarray(msgLen + 1);
    }
  }

  private async sendPassword(password: string): Promise<void> {
    const pwdBuf = Buffer.from(password + "\0", "utf8");
    const len = 4 + 4 + pwdBuf.length;
    const buf = Buffer.alloc(len);
    buf.writeInt32BE(len, 0);
    buf.writeInt32BE(3, 4);
    buf.write(pwdBuf.toString(), 8);
    this.socket!.write(buf);
    await this.waitReady();
  }

  private async waitReady(): Promise<void> {
    while (true) {
      await this.recv();
      const type = this.buffer[0];
      const msgLen = this.buffer.readInt32BE(1);
      if (type === 82) {
        const authType = this.buffer.readInt32BE(5);
        if (authType === 0) return;
        throw new Error(`Auth failed: type ${authType}`);
      }
      if (type === 69) {
        const msg = this.buffer.toString("utf8", 5, msgLen);
        throw new Error(`Auth error: ${msg}`);
      }
      if (type === 75 || type === 90) {
        this.buffer = this.buffer.subarray(msgLen + 1);
        if (type === 90) return;
      }
      this.buffer = this.buffer.subarray(msgLen + 1);
    }
  }

  async query(sql: string): Promise<any[]> {
    const queryBuf = Buffer.from(sql + "\0", "utf8");
    const len = 4 + 1 + queryBuf.length;
    const buf = Buffer.alloc(len);
    buf.writeInt32BE(len, 0);
    buf[4] = 81;
    buf.write(queryBuf.toString(), 5);
    this.socket!.write(buf);
    return this.readQueryResult();
  }

  private async readQueryResult(): Promise<any[]> {
    const rows: any[] = [];
    let columns: string[] = [];
    const colTypes: number[] = [];

    while (true) {
      await this.recv();
      const type = this.buffer[0];
      const msgLen = this.buffer.readInt32BE(1);

      if (type === 84) {
        const numCols = this.buffer.readInt16BE(5);
        let offset = 7;
        for (let i = 0; i < numCols; i++) {
          const nameEnd = this.buffer.indexOf(0, offset);
          columns.push(this.buffer.toString("utf8", offset, nameEnd));
          const tableOid = this.buffer.readInt32BE(nameEnd + 1);
          const attrNum = this.buffer.readInt16BE(nameEnd + 5);
          const typeOid = this.buffer.readInt32BE(nameEnd + 7);
          colTypes.push(typeOid);
          offset = nameEnd + 11;
        }
        this.buffer = this.buffer.subarray(msgLen + 1);
      } else if (type === 68) {
        const numCols = this.buffer.readInt16BE(5);
        let offset = 7;
        const row: Record<string, any> = {};
        for (let i = 0; i < numCols; i++) {
          const colLen = this.buffer.readInt32BE(offset);
          if (colLen === -1) {
            row[columns[i]] = null;
            offset += 4;
          } else {
            row[columns[i]] = this.buffer.toString("utf8", offset + 4, offset + 4 + colLen);
            offset += 4 + colLen;
          }
        }
        rows.push(row);
        this.buffer = this.buffer.subarray(msgLen + 1);
      } else if (type === 67) {
        this.buffer = this.buffer.subarray(msgLen + 1);
      } else if (type === 90) {
        this.buffer = this.buffer.subarray(msgLen + 1);
        return rows;
      } else if (type === 69) {
        const msg = this.buffer.toString("utf8", 5, msgLen);
        this.buffer = this.buffer.subarray(msgLen + 1);
        throw new Error(`Query error: ${msg}`);
      } else if (type === 73 || type === 110) {
        this.buffer = this.buffer.subarray(msgLen + 1);
        continue;
      } else if (type === 83) {
        columns = [];
        this.buffer = this.buffer.subarray(msgLen + 1);
        continue;
      } else {
        this.buffer = this.buffer.subarray(msgLen + 1);
      }
    }
  }

  private recv(): Promise<void> {
    return new Promise((resolve) => {
      const check = () => {
        if (this.buffer.length >= 5) {
          const msgLen = this.buffer.readInt32BE(1);
          if (this.buffer.length >= msgLen + 1) return resolve();
        }
        if (!this.socket) return resolve();
        this.socket.once("data", () => check());
        setTimeout(() => resolve(), 3000);
      };
      check();
    });
  }

  async close(): Promise<void> {
    if (this.socket) {
      const buf = Buffer.alloc(4);
      buf.writeInt32BE(4, 0);
      buf[4] = 88;
      this.socket.write(buf.subarray(0, 5));
      this.socket.destroy();
    }
  }
}

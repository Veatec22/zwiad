import {
  createDuckDBConnection,
  registerCsvTable,
} from '@/features/playground/_shared/duckdb'

type DuckDBConnection = Awaited<ReturnType<typeof createDuckDBConnection>>

let sharedConnection: DuckDBConnection | null = null
let sharedConnectionPromise: Promise<DuckDBConnection> | null = null

interface RegisteredEntry {
  tableName: string
  cleanup: () => Promise<void>
}

const registered = new Map<string, RegisteredEntry>()

export async function getSharedConnection(): Promise<DuckDBConnection> {
  if (sharedConnection) return sharedConnection
  if (sharedConnectionPromise) return sharedConnectionPromise
  sharedConnectionPromise = createDuckDBConnection().then((c) => {
    sharedConnection = c
    return c
  })
  return sharedConnectionPromise
}

export async function ensureDatasetRegistered(args: {
  datasetId: string
  desiredTableName: string
  fileName: string
  bytes: Uint8Array
}) {
  const connection = await getSharedConnection()
  const existing = registered.get(args.datasetId)
  if (existing && existing.tableName === args.desiredTableName) {
    return connection
  }
  if (existing) {
    await existing.cleanup().catch(() => undefined)
    await connection.conn
      .query(`DROP TABLE IF EXISTS "${existing.tableName.replace(/"/g, '""')}"`)
      .catch(() => undefined)
    registered.delete(args.datasetId)
  }
  const reg = await registerCsvTable({
    db: connection.db,
    conn: connection.conn,
    tableName: args.desiredTableName,
    fileName: args.fileName,
    bytes: args.bytes,
  })
  registered.set(args.datasetId, {
    tableName: args.desiredTableName,
    cleanup: reg.cleanup,
  })
  return connection
}

export async function unregisterDataset(datasetId: string) {
  const connection = sharedConnection
  const existing = registered.get(datasetId)
  if (!existing) return
  await existing.cleanup().catch(() => undefined)
  if (connection) {
    await connection.conn
      .query(`DROP TABLE IF EXISTS "${existing.tableName.replace(/"/g, '""')}"`)
      .catch(() => undefined)
  }
  registered.delete(datasetId)
}

export function getRegisteredTableName(datasetId: string) {
  return registered.get(datasetId)?.tableName ?? null
}

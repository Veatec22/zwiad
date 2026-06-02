import * as duckdb from '@duckdb/duckdb-wasm'
import duckdbEhWorker from '@duckdb/duckdb-wasm/dist/duckdb-browser-eh.worker.js?url'
import duckdbWorker from '@duckdb/duckdb-wasm/dist/duckdb-browser-mvp.worker.js?url'
import duckdbEhWasm from '@duckdb/duckdb-wasm/dist/duckdb-eh.wasm?url'
import duckdbWasm from '@duckdb/duckdb-wasm/dist/duckdb-mvp.wasm?url'

const duckdbBundles: duckdb.DuckDBBundles = {
  mvp: {
    mainModule: duckdbWasm,
    mainWorker: duckdbWorker,
  },
  eh: {
    mainModule: duckdbEhWasm,
    mainWorker: duckdbEhWorker,
  },
}

let duckdbInstance: duckdb.AsyncDuckDB | null = null
let duckdbPromise: Promise<duckdb.AsyncDuckDB> | null = null

export function sqlIdent(name: string) {
  return `"${name.replace(/"/g, '""')}"`
}

export function sqlString(value: string) {
  return `'${value.replace(/'/g, "''")}'`
}

function arrowRowToRecord(row: unknown): Record<string, unknown> {
  if (!row || typeof row !== 'object') {
    return {}
  }

  const maybeRow = row as { toJSON?: () => unknown }
  const json = maybeRow.toJSON?.()

  if (!json || typeof json !== 'object') {
    return {}
  }

  return json as Record<string, unknown>
}

export function toJsonSafe(value: unknown): unknown {
  if (typeof value === 'bigint') {
    const max = BigInt(Number.MAX_SAFE_INTEGER)
    const min = BigInt(Number.MIN_SAFE_INTEGER)

    if (value <= max && value >= min) {
      return Number(value)
    }

    return value.toString()
  }

  if (Array.isArray(value)) {
    return value.map((item) => toJsonSafe(item))
  }

  if (value && typeof value === 'object') {
    const output: Record<string, unknown> = {}

    for (const [key, item] of Object.entries(
      value as Record<string, unknown>,
    )) {
      output[key] = toJsonSafe(item)
    }

    return output
  }

  return value
}

export async function getDuckDB() {
  if (duckdbInstance) {
    return duckdbInstance
  }

  if (duckdbPromise) {
    return duckdbPromise
  }

  duckdbPromise = (async () => {
    const bundle = await duckdb.selectBundle(duckdbBundles)

    if (!bundle.mainWorker) {
      throw new Error('DuckDB bundle is missing a worker')
    }

    const worker = new Worker(bundle.mainWorker)
    const logger = new duckdb.ConsoleLogger(duckdb.LogLevel.ERROR)
    const db = new duckdb.AsyncDuckDB(logger, worker)

    await db.instantiate(bundle.mainModule, bundle.pthreadWorker)
    duckdbInstance = db

    return db
  })()

  return duckdbPromise
}

export async function createDuckDBConnection() {
  const db = await getDuckDB()
  const conn = await db.connect()

  return { db, conn }
}

export async function registerCsvTable(args: {
  db: duckdb.AsyncDuckDB
  conn: duckdb.AsyncDuckDBConnection
  tableName: string
  fileName: string
  bytes: Uint8Array
}) {
  const vfsFileName = `${args.tableName}_${Date.now()}.csv`

  await args.db.dropFile(vfsFileName).catch(() => undefined)
  // Clone bytes — duckdb-wasm may transfer the buffer into the worker,
  // which would detach the caller's Uint8Array on a subsequent re-register.
  const bytesCopy = new Uint8Array(args.bytes.byteLength)
  bytesCopy.set(args.bytes)
  await args.db.registerFileBuffer(vfsFileName, bytesCopy)
  await args.conn.query(`DROP TABLE IF EXISTS ${sqlIdent(args.tableName)}`)
  await args.conn.query(`DROP VIEW IF EXISTS ${sqlIdent(args.tableName)}`)
  await args.conn.query(
    `CREATE TABLE ${sqlIdent(args.tableName)} AS SELECT * FROM read_csv_auto(${sqlString(
      vfsFileName,
    )}, HEADER=true, SAMPLE_SIZE=-1)`,
  )

  return {
    cleanup: async () => {
      await args.db.dropFile(vfsFileName).catch(() => undefined)
    },
  }
}

export async function queryToRows(
  conn: duckdb.AsyncDuckDBConnection,
  sql: string,
) {
  const result = await conn.query(sql)

  return result
    .toArray()
    .map((row) => arrowRowToRecord(row))
    .map((row) => toJsonSafe(row) as Record<string, unknown>)
}

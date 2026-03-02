/**
 * api-query-builder.ts
 * Supabase-compatible query chain that routes through the Docker PostgreSQL API.
 * When a custom JWT exists, supabase.from('table') returns an ApiQueryBuilder
 * instead of hitting Supabase cloud. All existing .select().eq().order() chains
 * work identically — zero changes needed in page code.
 */

import { apiFetch } from './api'

// =====================================================================
// Types
// =====================================================================

interface Filter {
  type: string
  column?: string
  op?: string
  value?: any
}

interface OrderClause {
  column: string
  ascending: boolean
}

interface QueryResult {
  data: any
  error: any
  count: number | null
}

// =====================================================================
// ApiQueryBuilder — mirrors Supabase's PostgrestQueryBuilder
// =====================================================================

export class ApiQueryBuilder {
  private _table: string
  private _operation: string = 'select'
  private _select: string = '*'
  private _filters: Filter[] = []
  private _order: OrderClause[] = []
  private _limit: number | null = null
  private _range: { from: number; to: number } | null = null
  private _single: boolean = false
  private _maybeSingle: boolean = false
  private _count: string | null = null
  private _data: any = null
  private _onConflict: string | null = null
  private _returning: boolean = true
  private _headOnly: boolean = false

  constructor(table: string) {
    this._table = table
  }

  // --- Operations ---

  select(columns?: string, options?: { count?: string; head?: boolean }) {
    if (this._operation !== 'select' && columns !== undefined) {
      // Called after insert/update/delete/upsert — means "return data"
      this._select = columns || '*'
      this._returning = true
    } else {
      this._operation = 'select'
      if (columns !== undefined) this._select = columns
    }
    if (options?.count) this._count = options.count
    if (options?.head) this._headOnly = true
    return this
  }

  insert(data: any) {
    this._operation = 'insert'
    this._data = Array.isArray(data) ? data : [data]
    this._returning = false // default: no return unless .select() is chained
    return this
  }

  update(data: any) {
    this._operation = 'update'
    this._data = data
    this._returning = false
    return this
  }

  delete() {
    this._operation = 'delete'
    this._returning = false
    return this
  }

  upsert(data: any, options?: { onConflict?: string }) {
    this._operation = 'upsert'
    this._data = Array.isArray(data) ? data : [data]
    if (options?.onConflict) this._onConflict = options.onConflict
    this._returning = false
    return this
  }

  // --- Filters ---

  eq(column: string, value: any) {
    this._filters.push({ type: 'eq', column, value })
    return this
  }

  neq(column: string, value: any) {
    this._filters.push({ type: 'neq', column, value })
    return this
  }

  gt(column: string, value: any) {
    this._filters.push({ type: 'gt', column, value })
    return this
  }

  gte(column: string, value: any) {
    this._filters.push({ type: 'gte', column, value })
    return this
  }

  lt(column: string, value: any) {
    this._filters.push({ type: 'lt', column, value })
    return this
  }

  lte(column: string, value: any) {
    this._filters.push({ type: 'lte', column, value })
    return this
  }

  in(column: string, values: any[]) {
    this._filters.push({ type: 'in', column, value: values })
    return this
  }

  is(column: string, value: any) {
    this._filters.push({ type: 'is', column, value })
    return this
  }

  not(column: string, op: string, value: any) {
    this._filters.push({ type: 'not', column, op, value })
    return this
  }

  or(conditionStr: string) {
    this._filters.push({ type: 'or', value: conditionStr })
    return this
  }

  ilike(column: string, value: string) {
    this._filters.push({ type: 'ilike', column, value })
    return this
  }

  like(column: string, value: string) {
    this._filters.push({ type: 'like', column, value })
    return this
  }

  // --- Modifiers ---

  order(column: string, options?: { ascending?: boolean; nullsFirst?: boolean }) {
    this._order.push({ column, ascending: options?.ascending !== false })
    return this
  }

  limit(n: number) {
    this._limit = n
    return this
  }

  range(from: number, to: number) {
    this._range = { from, to }
    return this
  }

  single() {
    this._single = true
    return this
  }

  maybeSingle() {
    this._maybeSingle = true
    return this
  }

  // --- Thenable interface (makes `await` work) ---

  then(resolve: (value: QueryResult) => any, reject?: (reason: any) => any) {
    return this._execute().then(resolve, reject)
  }

  catch(fn: (reason: any) => any) {
    return this._execute().catch(fn)
  }

  // --- Execute ---

  private async _execute(): Promise<QueryResult> {
    try {
      const body: any = {
        table: this._table,
        operation: this._operation,
        select: this._select,
        filters: this._filters,
        order: this._order.length > 0 ? this._order : undefined,
        single: this._single || undefined,
        maybeSingle: this._maybeSingle || undefined,
        count: this._count || undefined,
        returning: this._returning,
      }

      if (this._limit != null) body.limit = this._limit
      if (this._range) body.range = this._range
      if (this._data != null) body.data = this._data
      if (this._onConflict) body.onConflict = this._onConflict

      const response = await apiFetch('/api/query', {
        method: 'POST',
        body: JSON.stringify(body),
      })

      const result = await response.json()

      if (!response.ok) {
        return { data: null, error: result.error || 'Request failed', count: null }
      }

      return {
        data: result.data,
        error: result.error || null,
        count: result.count ?? null,
      }
    } catch (err: any) {
      console.error(`[ApiQuery] Error on ${this._table}:`, err.message)
      return { data: null, error: err.message, count: null }
    }
  }
}

// =====================================================================
// ApiRpcBuilder — mirrors Supabase's .rpc() call
// =====================================================================

export class ApiRpcBuilder {
  private _name: string
  private _params: any

  constructor(name: string, params?: any) {
    this._name = name
    this._params = params || {}
  }

  then(resolve: (value: QueryResult) => any, reject?: (reason: any) => any) {
    return this._execute().then(resolve, reject)
  }

  catch(fn: (reason: any) => any) {
    return this._execute().catch(fn)
  }

  // RPC results can also be chained with .single()/.maybeSingle() in Supabase
  single() { return this }
  maybeSingle() { return this }
  select() { return this }

  private async _execute(): Promise<QueryResult> {
    try {
      const response = await apiFetch(`/api/rpc/${this._name}`, {
        method: 'POST',
        body: JSON.stringify(this._params),
      })

      const result = await response.json()

      if (!response.ok) {
        return { data: null, error: result.error || 'RPC failed', count: null }
      }

      return { data: result.data, error: result.error || null, count: null }
    } catch (err: any) {
      console.error(`[ApiRpc] Error on ${this._name}:`, err.message)
      return { data: null, error: err.message, count: null }
    }
  }
}

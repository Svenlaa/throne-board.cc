export type ViewMode = 'gifter' | 'creator'

export const BOARD_CONFIG = [
  { title: 'All Time', slug: 'leaderboardAllTime' },
  { title: 'Last Month', slug: 'leaderboardLastMonth' },
  { title: 'Last Week', slug: 'leaderboardLastWeek' },
] as const

export type BoardSlug = (typeof BOARD_CONFIG)[number]['slug']

export interface LeaderboardEntry {
  gifterUsername: string
  totalAmountSpentUSD: number
}

export interface LeaderboardResponse {
  leaderboardAllTime: LeaderboardEntry[]
  leaderboardLastMonth: LeaderboardEntry[]
  leaderboardLastWeek: LeaderboardEntry[]
}

export interface CreatorProfile {
  id: string
  displayName: string
  username: string
}

export interface BoardSummary {
  earnings: number
  contribution: {
    percentage: number
    amount: number
  }
}

export type CreatorBoardSummaries = Record<BoardSlug, BoardSummary>

export interface CreatorStats extends CreatorProfile {
  data: LeaderboardResponse
  boards: CreatorBoardSummaries
}

export interface ThroneStatsFound {
  kind: 'found'
  username: string
  userId: string
  requestedMode: ViewMode
  mode: ViewMode
  creators: CreatorStats[]
}

export interface ThroneStatsNotFound {
  kind: 'not-found'
  username: string
}

export type ThroneStatsResult = ThroneStatsFound | ThroneStatsNotFound

const FIRESTORE_RESOURCE_BASE = 'projects/onlywish-9d17b/databases/(default)/documents'
const FIRESTORE_BASE = `https://firestore.googleapis.com/v1/${FIRESTORE_RESOURCE_BASE}`
const LEADERBOARD_BASE = 'https://api-leaderboard-ijywe5kgva-uc.a.run.app/v1/leaderboard'

const fetchJson = async <T>(url: string, init?: RequestInit): Promise<T> => {
  const response = await fetch(url, init)
  if (!response.ok) {
    throw new Error(`Request failed (${response.status}) for ${url}`)
  }

  return (await response.json()) as T
}

const toBoardEntries = (entries: unknown): LeaderboardEntry[] => {
  if (!Array.isArray(entries)) {
    return []
  }

  return entries
    .filter((item) => item && typeof item === 'object')
    .map((item) => {
      const entry = item as Partial<LeaderboardEntry>

      return {
        gifterUsername: typeof entry.gifterUsername === 'string' ? entry.gifterUsername : '',
        totalAmountSpentUSD:
          typeof entry.totalAmountSpentUSD === 'number' && Number.isFinite(entry.totalAmountSpentUSD)
            ? entry.totalAmountSpentUSD
            : 0,
      }
    })
}

const getCreatorLeaderboard = async (creatorId: string): Promise<LeaderboardResponse> => {
  const data = await fetchJson<Record<string, unknown>>(`${LEADERBOARD_BASE}/${creatorId}`)

  return {
    leaderboardAllTime: toBoardEntries(data.leaderboardAllTime),
    leaderboardLastMonth: toBoardEntries(data.leaderboardLastMonth),
    leaderboardLastWeek: toBoardEntries(data.leaderboardLastWeek),
  }
}

const getUserId = async (username: string): Promise<string | null> => {
  type RunQueryResponse = Array<{
    document?: {
      name?: string
    }
  }>

  const rows = await fetchJson<RunQueryResponse>(`${FIRESTORE_BASE}:runQuery`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      structuredQuery: {
        from: [{ collectionId: 'creators' }],
        where: {
          fieldFilter: {
            field: { fieldPath: 'username' },
            op: 'EQUAL',
            value: { stringValue: username },
          },
        },
      },
    }),
  })

  const name = rows[0]?.document?.name
  if (!name) {
    return null
  }

  return name.split('/').pop() ?? null
}

const getFollowedCreators = async (userId: string): Promise<string[]> => {
  type FollowingResponse = {
    documents?: Array<{
      fields?: {
        followedUserId?: {
          stringValue?: string
        }
      }
    }>
  }

  const data = await fetchJson<FollowingResponse>(`${FIRESTORE_BASE}/creators/${userId}/following`)

  return (
    data.documents
      ?.map((doc) => doc.fields?.followedUserId?.stringValue)
      .filter((value): value is string => Boolean(value)) ?? []
  )
}

const getUsersByIds = async (userIds: string[]): Promise<CreatorProfile[]> => {
  if (userIds.length === 0) {
    return []
  }

  type BatchGetResponse = Array<{
    found?: {
      name?: string
      fields?: {
        displayName?: {
          stringValue?: string
        }
        username?: {
          stringValue?: string
        }
      }
    }
  }>

  const rows = await fetchJson<BatchGetResponse>(`${FIRESTORE_BASE}:batchGet`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      documents: userIds.map((id) => `${FIRESTORE_RESOURCE_BASE}/creators/${id}`),
    }),
  })

  return rows
    .filter((row) => Boolean(row.found))
    .map((row) => {
      const found = row.found!

      return {
        id: found.name?.split('/').pop() ?? '',
        displayName: found.fields?.displayName?.stringValue ?? 'no name',
        username: found.fields?.username?.stringValue ?? '',
      }
    })
    .filter((profile) => profile.id.length > 0)
}

const calculateFromLeaderboard = (leaderboard: LeaderboardEntry[], username: string): BoardSummary => {
  const totalCents = leaderboard.reduce((sum, item) => sum + item.totalAmountSpentUSD, 0)
  const normalizedUsername = username.toLowerCase()
  const me = leaderboard.find((item) => item.gifterUsername.toLowerCase() === normalizedUsername)

  return {
    earnings: totalCents / 100,
    contribution: {
      percentage: me && totalCents > 0 ? me.totalAmountSpentUSD / totalCents : 0,
      amount: me ? me.totalAmountSpentUSD / 100 : 0,
    },
  }
}

export const getThroneStats = async (
  username: string,
  requestedMode: ViewMode,
): Promise<ThroneStatsResult> => {
  const userId = await getUserId(username)
  if (!userId) {
    return {
      kind: 'not-found',
      username,
    }
  }

  let effectiveMode = requestedMode
  let creatorIds: string[] = [userId]

  if (effectiveMode === 'gifter') {
    const followed = await getFollowedCreators(userId)

    if (followed.length === 0) {
      effectiveMode = 'creator'
    } else {
      creatorIds = followed
    }
  }

  const profiles = await getUsersByIds(creatorIds)

  const creators = await Promise.all(
    profiles.map(async (profile) => {
      const data = await getCreatorLeaderboard(profile.id)

      const boards: CreatorBoardSummaries = {
        leaderboardAllTime: calculateFromLeaderboard(data.leaderboardAllTime, username),
        leaderboardLastMonth: calculateFromLeaderboard(data.leaderboardLastMonth, username),
        leaderboardLastWeek: calculateFromLeaderboard(data.leaderboardLastWeek, username),
      }

      return {
        ...profile,
        data,
        boards,
      }
    }),
  )

  creators.sort((a, b) => b.boards.leaderboardAllTime.earnings - a.boards.leaderboardAllTime.earnings)

  return {
    kind: 'found',
    username,
    userId,
    requestedMode,
    mode: effectiveMode,
    creators,
  }
}

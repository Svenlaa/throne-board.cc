import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { BOARD_CONFIG, getThroneStats } from './lib/throne'
import type { FormEvent } from 'react'
import type { BoardSlug, CreatorStats, ThroneStatsFound, ViewMode } from './lib/throne'

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
})

const parseSearchParams = () => {
  const params = new URLSearchParams(window.location.search)
  const username = params.get('name')?.trim() ?? ''
  const requestedMode: ViewMode = params.get('mode') === 'creator' ? 'creator' : 'gifter'

  return {
    username,
    requestedMode,
  }
}

const hasNoContributionRows = (creators: CreatorStats[]) =>
  BOARD_CONFIG.every(({ slug }) => creators.every((creator) => creator.boards[slug].contribution.amount <= 0))

const formatCurrency = (amount: number) => currencyFormatter.format(amount)

const buildCreatorModeUrl = (username: string) => `?name=${encodeURIComponent(username)}&mode=creator`

const App = () => {
  const [{ username, requestedMode }] = useState(parseSearchParams)
  const [inputName, setInputName] = useState(username)

  const statsQuery = useQuery({
    queryKey: ['throne-stats', username, requestedMode],
    queryFn: () => getThroneStats(username, requestedMode),
    enabled: username.length > 0,
    staleTime: 5 * 60 * 1000,
  })

  const result = statsQuery.data

  useEffect(() => {
    if (!result || result.kind !== 'found' || result.mode !== 'gifter' || username.length === 0) {
      return
    }

    if (hasNoContributionRows(result.creators)) {
      window.location.search = buildCreatorModeUrl(username)
    }
  }, [result, username])

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const cleaned = inputName.trim()
    if (!cleaned) {
      return
    }

    window.location.search = `?name=${encodeURIComponent(cleaned)}`
  }

  const searchSucceeded = username.length > 0 && result?.kind === 'found'

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900">
      <main className="mx-auto w-full max-w-6xl p-4 md:p-8">
        <header className="mb-8 rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
          <h1 className="inline text-3xl font-bold tracking-tight text-stone-950 md:text-4xl">
            <a className="no-underline hover:underline" href="https://github.com/Svenlaa/throne-board.cc">
              Throne Board
            </a>
          </h1>
          <span className="ml-3 font-mono text-sm text-stone-600">fan-made and unofficial</span>
        </header>

        <section className="mb-8 rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
          {username.length === 0 && (
            <p className="text-stone-700">Enter your Throne username below to load stats.</p>
          )}

          {statsQuery.isPending && username.length > 0 && (
            <p className="text-stone-700">Loading stats for @{username}...</p>
          )}

          {statsQuery.isError && (
            <p className="text-red-700">Could not load data. Please try again in a moment.</p>
          )}

          {result?.kind === 'not-found' && <p className="text-red-700">Could not find user.</p>}

          {result?.kind === 'found' && result.mode === 'gifter' && (
            <GifterView creators={result.creators} username={result.username} />
          )}

          {result?.kind === 'found' && result.mode === 'creator' && <CreatorView result={result} />}
        </section>

        <section className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
          <form className="flex flex-col gap-3 sm:flex-row sm:items-end" onSubmit={onSubmit}>
            <label className="flex-1 text-sm font-medium text-stone-700" htmlFor="name">
              Enter {searchSucceeded ? 'a different' : 'your'} throne username
              <input
                className="mt-1 block w-full rounded-md border border-stone-300 px-3 py-2 text-base outline-none ring-stone-400 transition focus:ring-2"
                id="name"
                name="name"
                onChange={(event) => setInputName(event.target.value)}
                type="text"
                value={inputName}
              />
            </label>
            <button
              className="inline-flex items-center justify-center rounded-md bg-stone-900 px-4 py-2 font-medium text-white transition hover:bg-stone-700"
              type="submit"
            >
              Submit
            </button>
          </form>
        </section>
      </main>
    </div>
  )
}

const GifterView = ({ creators, username }: { creators: CreatorStats[]; username: string }) => {
  const totalEarnings = creators.reduce((sum, creator) => sum + creator.boards.leaderboardAllTime.earnings, 0)

  if (totalEarnings === 0) {
    return <p className="text-stone-700">Nothing at all.</p>
  }

  return (
    <div className="space-y-8">
      <p className="text-stone-700">
        Gifter stats for{' '}
        <a className="font-medium" href={`https://throne.com/${username}`} rel="noreferrer" target="_blank">
          @{username}
        </a>
      </p>

      {BOARD_CONFIG.map(({ title, slug }) => {
        const withContribution = creators.filter((creator) => creator.boards[slug].contribution.amount > 0)

        if (withContribution.length === 0) {
          return null
        }

        return <CreatorContributionTable key={slug} creators={withContribution} slug={slug} title={title} />
      })}

      <a className="text-sm font-medium" href={buildCreatorModeUrl(username)}>
        Switch to creator mode
      </a>
    </div>
  )
}

const CreatorContributionTable = ({
  title,
  slug,
  creators,
}: {
  title: string
  slug: BoardSlug
  creators: CreatorStats[]
}) => (
  <div className="overflow-hidden rounded-lg border border-stone-200">
    <h2 className="border-b border-stone-200 bg-stone-100 px-4 py-3 text-lg font-semibold text-stone-900">{title}</h2>
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] border-collapse text-left text-sm">
        <thead>
          <tr className="bg-stone-100 text-stone-700">
            <th className="px-4 py-3 font-semibold">Creator</th>
            <th className="px-4 py-3 font-semibold">Total Earnings (USD)</th>
            <th className="px-4 py-3 font-semibold">Your Contribution</th>
          </tr>
        </thead>
        <tbody>
          {creators.map((creator) => (
            <tr key={creator.id} className="border-t border-stone-200 align-top hover:bg-stone-50">
              <td className="px-4 py-3">
                <a href={`https://throne.com/${creator.username}`} rel="noreferrer" target="_blank">
                  {creator.displayName}
                </a>{' '}
                <a className="text-xs text-stone-600" href={buildCreatorModeUrl(creator.username)}>
                  @{creator.username}
                </a>
              </td>
              <td className="px-4 py-3">{formatCurrency(creator.boards[slug].earnings)}</td>
              <td className="px-4 py-3">
                {formatCurrency(creator.boards[slug].contribution.amount)} (
                {(creator.boards[slug].contribution.percentage * 100).toFixed(1)}%)
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
)

const CreatorView = ({ result }: { result: ThroneStatsFound }) => {
  const creator = result.creators[0]

  if (!creator || creator.boards.leaderboardAllTime.earnings <= 0) {
    return <p className="text-stone-700">Nothing at all.</p>
  }

  return (
    <div className="space-y-8">
      <p className="text-stone-700">
        Creator stats for{' '}
        <a className="font-medium" href={`https://throne.com/${creator.username}`} rel="noreferrer" target="_blank">
          {creator.displayName}
        </a>
      </p>

      {BOARD_CONFIG.map(({ title, slug }) => {
        const gifters = [...creator.data[slug]]
          .sort((a, b) => b.totalAmountSpentUSD - a.totalAmountSpentUSD)
          .slice(0, 10)

        if (gifters.length === 0) {
          return null
        }

        const totalSpent = gifters.reduce((sum, gifter) => sum + gifter.totalAmountSpentUSD, 0) / 100

        return (
          <div className="overflow-hidden rounded-lg border border-stone-200" key={slug}>
            <h2 className="border-b border-stone-200 bg-stone-100 px-4 py-3 text-lg font-semibold text-stone-900">
              {title} ({formatCurrency(totalSpent)})
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] border-collapse text-left text-sm">
                <thead>
                  <tr className="bg-stone-100 text-stone-700">
                    <th className="px-4 py-3 font-semibold">Gifter</th>
                    <th className="px-4 py-3 font-semibold">Amount (USD)</th>
                    <th className="px-4 py-3 font-semibold">Percentage</th>
                  </tr>
                </thead>
                <tbody>
                  {gifters.map((gifter) => (
                    <tr
                      className="border-t border-stone-200 align-top hover:bg-stone-50"
                      key={`${slug}-${gifter.gifterUsername}`}
                    >
                      <td className="px-4 py-3">{gifter.gifterUsername}</td>
                      <td className="px-4 py-3">{formatCurrency(gifter.totalAmountSpentUSD / 100)}</td>
                      <td className="px-4 py-3">
                        {creator.boards[slug].earnings > 0
                          ? `${(((gifter.totalAmountSpentUSD / 100) / creator.boards[slug].earnings) * 100).toFixed(1)}%`
                          : '0.0%'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default App

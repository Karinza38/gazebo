import { act, renderHook } from '@testing-library/react-hooks'
import { rest } from 'msw'
import { setupServer } from 'msw/node'
import { QueryClient, QueryClientProvider } from 'react-query'
import { MemoryRouter, Route } from 'react-router-dom'

import { useUpdateRepo } from './hooks'

const repoDetails = {
  can_edit: true,
  can_view: true,
  latest_commit: {
    report: {
      files: [
        {
          name: 'src/App.js',
          totals: {
            files: 0,
            lines: 13,
            hits: 13,
            misses: 0,
            partials: 0,
            coverage: 100.0,
            branches: 0,
            methods: 10,
            sessions: 0,
            complexity: 0.0,
            complexity_total: 0.0,
            complexity_ratio: 0,
            diff: null,
          },
        },
      ],
      uploadToken: 'random',
    },
  },
}

const server = setupServer()

beforeAll(() => server.listen())
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

const queryClient = new QueryClient()
const wrapper = ({ children }) => (
  <MemoryRouter initialEntries={['/gh/codecov/gazebo']}>
    <Route path="/:provider/:owner/:repo">
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </Route>
  </MemoryRouter>
)

describe('useUpdateRepo', () => {
  let hookData

  function setup({ provider, owner, repo }) {
    server.use(
      rest.patch(
        `internal/${provider}/${owner}/repos/${repo}/`,
        (req, res, ctx) => {
          return res(ctx.status(200), ctx.json(repoDetails))
        }
      )
    )
    hookData = renderHook(() => useUpdateRepo({ provider, owner, repo }), {
      wrapper,
    })
  }

  describe('when called', () => {
    beforeEach(() => {
      setup({ provider: 'github', owner: 'codecov', repo: 'gazebo' })
    })

    it('returns isLoading false', () => {
      expect(hookData.result.current.isLoading).toBeFalsy()
    })

    describe('when calling the mutation', () => {
      const data = { branch: 'dummy' }
      beforeEach(() => {
        hookData.result.current.mutate(data)
        return hookData.waitFor(() => hookData.result.current.status !== 'idle')
      })

      it('returns isLoading true', () => {
        expect(hookData.result.current.isLoading).toBeTruthy()
      })
    })

    describe('When success', () => {
      beforeEach(async () => {
        return act(async () => {
          hookData.result.current.mutate({})
          await hookData.waitFor(() => hookData.result.current.isLoading)
          await hookData.waitFor(() => !hookData.result.current.isLoading)
        })
      })

      it('returns isSuccess true', () => {
        expect(hookData.result.current.isSuccess).toBeTruthy()
      })
    })
  })
})

import { rest } from 'msw'
import { setupServer } from 'msw/node'
import { renderHook, act } from '@testing-library/react-hooks'
import { MemoryRouter, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from 'react-query'

import { useUser, useUpdateProfile, useMyContexts } from './hooks'

const user = {
  username: 'TerrySmithDC',
  email: 'terry@terry.com',
  name: 'terry',
  avatarUrl: 'photo',
}

const queryClient = new QueryClient()
const wrapper = ({ children }) => (
  <MemoryRouter initialEntries={['/gh']}>
    <Route path="/:provider">
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </Route>
  </MemoryRouter>
)

const server = setupServer()

beforeAll(() => server.listen())
beforeEach(() => {
  server.resetHandlers()
  queryClient.clear()
})
afterAll(() => server.close())

describe('useUser', () => {
  let hookData

  function setup() {
    server.use(
      rest.get(`/internal/profile`, (req, res, ctx) => {
        return res(ctx.status(200), ctx.json(user))
      })
    )
    hookData = renderHook(() => useUser(), { wrapper })
  }

  describe('when called', () => {
    beforeEach(() => {
      setup()
    })

    it('returns isLoading', () => {
      expect(hookData.result.current.isLoading).toBeTruthy()
    })
  })

  describe('when data is loaded', () => {
    beforeEach(() => {
      setup()
      return hookData.waitFor(() => hookData.result.current.isSuccess)
    })

    it('returns the user', () => {
      expect(hookData.result.current.data).toEqual(user)
    })
  })
})

describe('useUpdateProfile', () => {
  let hookData

  function setup() {
    server.use(
      rest.patch(`/internal/profile`, (req, res, ctx) => {
        const newUser = {
          ...user,
          ...req.body,
        }
        return res(ctx.status(200), ctx.json(newUser))
      })
    )
    hookData = renderHook(() => useUpdateProfile({ provider: 'gh' }), {
      wrapper,
    })
  }

  describe('when called', () => {
    beforeEach(() => {
      setup()
    })

    it('is not loading yet', () => {
      expect(hookData.result.current.isLoading).toBeFalsy()
    })

    describe('when calling the mutation', () => {
      const newData = {
        email: 'newemail@test.com',
        name: 'new name',
      }
      beforeEach(() => {
        return act(async () => {
          hookData.result.current.mutate(newData)
          await hookData.waitFor(() => hookData.result.current.isLoading)
          await hookData.waitFor(() => !hookData.result.current.isLoading)
        })
      })

      it('returns success', () => {
        expect(hookData.result.current.isSuccess).toBeTruthy()
      })

      it('updates the local cache', () => {
        expect(queryClient.getQueryData(['currentUser', 'gh'])).toMatchObject({
          ...user,
          ...newData,
        })
      })
    })
  })
})

describe('useMyContexts', () => {
  let hookData

  function setup(dataReturned) {
    server.use(
      rest.post(`/graphql/gh`, (req, res, ctx) => {
        return res(
          ctx.status(200),
          ctx.json({
            data: dataReturned,
          })
        )
      })
    )
    hookData = renderHook(() => useMyContexts(), { wrapper })
  }

  describe('when called and user is unauthenticated', () => {
    beforeEach(() => {
      setup({
        me: null,
      })
    })

    it('returns isLoading', () => {
      expect(hookData.result.current.isLoading).toBeTruthy()
    })

    describe('when data is loaded', () => {
      beforeEach(() => {
        return hookData.waitFor(() => hookData.result.current.isSuccess)
      })

      it('returns null', () => {
        expect(hookData.result.current.data).toEqual(null)
      })
    })
  })

  describe('when called and user is authenticated', () => {
    const org1 = {
      username: 'codecov',
      avatarUrl: '',
    }
    const org2 = {
      username: 'codecov',
      avatarUrl: '',
    }
    beforeEach(() => {
      setup({
        me: {
          owner: user,
          myOrganizations: {
            edges: [{ node: org1 }, { node: org2 }],
          },
        },
      })
      return hookData.waitFor(() => hookData.result.current.isSuccess)
    })

    it('returns the user and their orgs', () => {
      expect(hookData.result.current.data).toEqual({
        currentUser: user,
        myOrganizations: [org1, org2],
      })
    })
  })
})

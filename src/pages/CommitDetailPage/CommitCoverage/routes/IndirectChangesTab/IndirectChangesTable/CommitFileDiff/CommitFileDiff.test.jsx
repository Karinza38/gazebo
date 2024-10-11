import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import { graphql, HttpResponse } from 'msw2'
import { setupServer } from 'msw2/node'
import { MemoryRouter, Route } from 'react-router-dom'

import CommitFileDiff from './CommitFileDiff'

const mocks = vi.hoisted(() => ({
  useFlags: vi.fn(),
  useScrollToLine: vi.fn(),
  withProfiler: (component) => component,
  captureMessage: vi.fn(),
}))

vi.mock('ui/CodeRenderer/hooks', () => {
  const actual = vi.importActual('ui/CodeRenderer/hooks')
  return {
    ...actual,
    useScrollToLine: mocks.useScrollToLine,
  }
})

vi.mock('shared/featureFlags', () => ({
  useFlags: mocks.useFlags,
}))

vi.mock('@sentry/react', () => {
  const originalModule = vi.importActual('@sentry/react')
  return {
    ...originalModule,
    withProfiler: mocks.withProfiler,
    captureMessage: mocks.captureMessage,
  }
})

window.requestAnimationFrame = (cb) => {
  cb(1)
  return 1
}
window.cancelAnimationFrame = () => {}

const scrollToMock = vi.fn()
window.scrollTo = scrollToMock
window.scrollY = 100

class ResizeObserverMock {
  callback = (x) => null

  constructor(callback) {
    this.callback = callback
  }

  observe() {
    this.callback([
      {
        contentRect: { width: 100 },
        target: {
          getAttribute: () => ({ scrollWidth: 100 }),
          getBoundingClientRect: () => ({ top: 100 }),
        },
      },
    ])
  }
  unobserve() {
    // do nothing
  }
  disconnect() {
    // do nothing
  }
}
global.window.ResizeObserver = ResizeObserverMock

const baseMock = (impactedFile) => ({
  owner: {
    repository: {
      __typename: 'Repository',
      commit: {
        compareWithParent: {
          __typename: 'Comparison',
          impactedFile: {
            ...impactedFile,
          },
        },
      },
    },
  },
})

const mockImpactedFile = {
  isCriticalFile: false,
  headName: 'flag1/file.js',
  hashedPath: 'hashedFilePath',
  isNewFile: false,
  isRenamedFile: false,
  isDeletedFile: false,
  baseCoverage: {
    coverage: 100,
  },
  headCoverage: {
    coverage: 100,
  },
  patchCoverage: {
    coverage: 100,
  },
  changeCoverage: 0,
  segments: {
    results: [
      {
        header: '-0,0 +1,45',
        hasUnintendedChanges: false,
        lines: [
          {
            baseNumber: null,
            headNumber: '1',
            baseCoverage: null,
            headCoverage: 'H',
            content: '+export default class Calculator {',
            coverageInfo: {
              hitCount: null,
              hitUploadIds: null,
            },
          },
          {
            baseNumber: null,
            headNumber: '2',
            baseCoverage: null,
            headCoverage: 'H',
            content: '+  private value = 0;',
            coverageInfo: {
              hitCount: 5,
              hitUploadIds: [0, 1, 2, 3, 4],
            },
          },
          {
            baseNumber: null,
            headNumber: '3',
            baseCoverage: null,
            headCoverage: 'H',
            content: '+  private calcMode = ""',
            coverageInfo: {
              hitCount: null,
              hitUploadIds: null,
            },
          },
        ],
      },
    ],
  },
}

const mockOverview = (bundleAnalysisEnabled = false) => {
  return {
    owner: {
      isCurrentUserActivated: true,
      repository: {
        __typename: 'Repository',
        private: false,
        defaultBranch: 'main',
        oldestCommitAt: '2022-10-10T11:59:59',
        coverageEnabled: true,
        bundleAnalysisEnabled,
        languages: ['javascript'],
        testAnalyticsEnabled: false,
      },
    },
  }
}

const server = setupServer()
const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
})

const wrapper = ({ children }) => (
  <QueryClientProvider client={queryClient}>
    <MemoryRouter
      initialEntries={[
        '/gh/codecov/gazebo/commit/123sha/folder/subfolder/file.js',
      ]}
    >
      <Route path="/:provider/:owner/:repo/commit/:commit">{children}</Route>
    </MemoryRouter>
  </QueryClientProvider>
)

beforeAll(() => server.listen())
afterEach(() => {
  queryClient.clear()
  server.resetHandlers()
})
afterAll(() => server.close())

describe('CommitFileDiff', () => {
  function setup(
    {
      impactedFile = mockImpactedFile,
      bundleAnalysisEnabled = false,
      featureFlag = false,
    } = {
      impactedFile: mockImpactedFile,
      bundleAnalysisEnabled: false,
      featureFlag: false,
    }
  ) {
    mocks.useScrollToLine.mockImplementation(() => ({
      lineRef: () => {},
      handleClick: jest.fn(),
      targeted: false,
    }))

    mocks.useFlags.mockImplementation(() => ({
      virtualDiffRenderer: featureFlag,
    }))

    server.use(
      graphql.query('ImpactedFileComparedWithParent', (info) => {
        return HttpResponse.json({ data: baseMock(impactedFile) })
      }),
      graphql.query('GetRepoOverview', (info) => {
        return HttpResponse.json({ data: mockOverview(bundleAnalysisEnabled) })
      })
    )
  }

  describe('when rendered', () => {
    it('renders the line changes header', async () => {
      setup()
      render(<CommitFileDiff path={'flag1/file.js'} />, { wrapper })

      const changeHeader = await screen.findByText('-0,0 +1,45')
      expect(changeHeader).toBeInTheDocument()
    })

    describe('when only coverage is enabled', () => {
      it('renders the commit redirect url', async () => {
        setup()
        render(<CommitFileDiff path={'flag1/file.js'} />, { wrapper })

        const viewFullFileText = await screen.findByText(/View full file/)
        expect(viewFullFileText).toBeInTheDocument()
        expect(viewFullFileText).toHaveAttribute(
          'href',
          '/gh/codecov/gazebo/commit/123sha/blob/flag1/file.js'
        )
      })
    })

    describe('when both coverage and bundle are enabled', () => {
      it('renders the commit redirect url with query string', async () => {
        setup({ bundleAnalysisEnabled: true })
        render(<CommitFileDiff path={'flag1/file.js'} />, { wrapper })

        const viewFullFileText = await screen.findByText(/View full file/)
        expect(viewFullFileText).toBeInTheDocument()
        expect(viewFullFileText).toHaveAttribute(
          'href',
          '/gh/codecov/gazebo/commit/123sha/blob/flag1/file.js?dropdown=coverage'
        )
      })
    })
  })

  describe('a new file', () => {
    beforeEach(() => {
      const impactedFile = {
        ...mockImpactedFile,
        isNewFile: true,
      }
      setup({ impactedFile })
    })

    it('renders a new file label', async () => {
      render(<CommitFileDiff path={'flag1/file.js'} />, { wrapper })

      const newText = await screen.findByText(/New/i)
      expect(newText).toBeInTheDocument()
    })
  })

  describe('a renamed file', () => {
    beforeEach(() => {
      const impactedFile = {
        ...mockImpactedFile,
        isRenamedFile: true,
      }
      setup({ impactedFile })
    })
    it('renders a renamed file label', async () => {
      render(<CommitFileDiff path={'flag1/file.js'} />, { wrapper })

      const renamed = await screen.findByText(/Renamed/i)
      expect(renamed).toBeInTheDocument()
    })
  })

  describe('a deleted file', () => {
    beforeEach(() => {
      const impactedFile = {
        ...mockImpactedFile,
        isDeletedFile: true,
      }
      setup({ impactedFile })
    })
    it('renders a deleted file label', async () => {
      render(<CommitFileDiff path={'flag1/file.js'} />, { wrapper })

      const deleted = await screen.findByText(/Deleted/i)
      expect(deleted).toBeInTheDocument()
    })
  })

  describe('a critical file', () => {
    beforeEach(() => {
      const impactedFile = {
        ...mockImpactedFile,
        isCriticalFile: true,
      }
      setup({ impactedFile })
    })
    it('renders a critical file label', async () => {
      render(<CommitFileDiff path={'flag1/file.js'} />, { wrapper })

      const criticalFile = await screen.findByText(/Critical File/i)
      expect(criticalFile).toBeInTheDocument()
    })
  })

  describe('when there is no data', () => {
    let consoleSpy

    beforeAll(() => {
      consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    })

    afterAll(() => {
      consoleSpy.mockRestore()
    })

    it('renders a error display message', async () => {
      setup({ impactedFile: null })
      render(<CommitFileDiff path={'random/path'} />, { wrapper })

      const criticalFile = await screen.findByText(
        /There was a problem getting the source code from your provider. Unable to show line by line coverage/i
      )
      expect(criticalFile).toBeInTheDocument()
    })
  })

  describe('code renderer', () => {
    describe('feature flag is true', () => {
      it('renders the text area', async () => {
        setup({ featureFlag: true })
        render(<CommitFileDiff path={'flag1/file.js'} />, { wrapper })

        const textArea = await screen.findByTestId(
          'virtual-file-renderer-text-area'
        )
        expect(textArea).toBeInTheDocument()

        const calculator = await within(textArea).findByText(/Calculator/)
        expect(calculator).toBeInTheDocument()

        const value = await within(textArea).findByText(/value/)
        expect(value).toBeInTheDocument()

        const calcMode = await within(textArea).findByText(/calcMode/)
        expect(calcMode).toBeInTheDocument()
      })

      it('renders the lines of a segment', async () => {
        setup({ featureFlag: true })
        render(<CommitFileDiff path={'flag1/file.js'} />, { wrapper })

        const codeDisplayOverlay = await screen.findByTestId(
          'virtual-file-renderer-overlay'
        )

        const calculator =
          await within(codeDisplayOverlay).findByText(/Calculator/)
        expect(calculator).toBeInTheDocument()

        const value = await within(codeDisplayOverlay).findByText(/value/)
        expect(value).toBeInTheDocument()

        const calcMode = await within(codeDisplayOverlay).findByText(/calcMode/)
        expect(calcMode).toBeInTheDocument()
      })

      describe('rendering hit icon', () => {
        describe('there are no ignored ids', () => {
          it('renders hit count icon', async () => {
            setup({ featureFlag: true })
            render(<CommitFileDiff path={'flag1/file.js'} />, { wrapper })

            const hitCount = await screen.findByText('5')
            expect(hitCount).toBeInTheDocument()
          })
        })

        describe('there are ignored ids', () => {
          beforeEach(() => {
            queryClient.setQueryData(['IgnoredUploadIds'], [0])
          })

          it('renders hit count icon', async () => {
            setup({ featureFlag: true })
            render(<CommitFileDiff path={'flag1/file.js'} />, { wrapper })

            const hitCount = await screen.findByText('4')
            expect(hitCount).toBeInTheDocument()
          })
        })
      })

      describe('when segment is an empty array', () => {
        const impactedFile = {
          ...mockImpactedFile,
          isCriticalFile: false,
          headName: 'flag1/file.js',
          segments: {
            results: [],
          },
        }

        it('does not render information on the code renderer', async () => {
          setup({ impactedFile, featureFlag: true })
          render(<CommitFileDiff path={'flag1/file.js'} />, { wrapper })

          await waitFor(() => queryClient.isFetching)
          await waitFor(() => !queryClient.isFetching)

          const unexpectedChange = screen.queryByText(/Unexpected Changes/i)
          expect(unexpectedChange).not.toBeInTheDocument()

          const diffLine = screen.queryByText('fv-diff-line')
          expect(diffLine).not.toBeInTheDocument()
        })
      })
    })

    describe('feature flag is false', () => {
      it('renders the lines of a segment', async () => {
        setup()
        render(<CommitFileDiff path={'flag1/file.js'} />, { wrapper })

        const calculator = await screen.findByText(/Calculator/)
        expect(calculator).toBeInTheDocument()

        const value = await screen.findByText(/value/)
        expect(value).toBeInTheDocument()

        const calcMode = await screen.findByText(/calcMode/)
        expect(calcMode).toBeInTheDocument()
      })

      describe('rendering hit icon', () => {
        describe('there are no ignored ids', () => {
          it('renders hit count icon', async () => {
            setup()
            render(<CommitFileDiff path={'flag1/file.js'} />, { wrapper })

            const hitCount = await screen.findByText('5')
            expect(hitCount).toBeInTheDocument()
          })
        })

        describe('there are ignored ids', () => {
          beforeEach(() => {
            queryClient.setQueryData(['IgnoredUploadIds'], [0])
          })

          it('renders hit count icon', async () => {
            setup()
            render(<CommitFileDiff path={'flag1/file.js'} />, { wrapper })

            const hitCount = await screen.findByText('4')
            expect(hitCount).toBeInTheDocument()
          })
        })
      })

      describe('when segment is an empty array', () => {
        const impactedFile = {
          ...mockImpactedFile,
          isCriticalFile: false,
          headName: 'flag1/file.js',
          segments: {
            results: [],
          },
        }

        it('does not render information on the code renderer', async () => {
          setup({ impactedFile })
          render(<CommitFileDiff path={'flag1/file.js'} />, { wrapper })

          await waitFor(() => queryClient.isFetching)
          await waitFor(() => !queryClient.isFetching)

          const unexpectedChange = screen.queryByText(/Unexpected Changes/i)
          expect(unexpectedChange).not.toBeInTheDocument()

          const diffLine = screen.queryByText('fv-diff-line')
          expect(diffLine).not.toBeInTheDocument()
        })
      })
    })
  })
})

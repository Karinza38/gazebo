import {
  useState,
  createContext,
  useContext,
  useCallback,
  useMemo,
} from 'react'
import { useParams } from 'react-router-dom'

import { useRepo } from 'services/repo'

const RepoBreadcrumbContext = createContext([])
const RepoBreadcrumbSettersContext = createContext({
  addBreadcrumb: (data) => undefined,
})
RepoBreadcrumbContext.displayName = 'RepoBreadcrumbContext'

export function RepoBreadcrumbProvider({ children }) {
  const { owner, repo, provider } = useParams()
  const { data } = useRepo({
    provider,
    owner,
    repo,
  })

  const base = useMemo(
    () => [
      { pageName: 'owner', text: owner },
      {
        pageName: 'repo',
        text: (
          <div className="flex gap-1 items-center">
            {repo}
            {data?.repo?.private && (
              <span className="flex-initial border border-ds-gray-tertiary rounded text-xs text-ds-gray-senary font-light px-1">
                Private
              </span>
            )}
          </div>
        ),
      },
    ],
    [data?.repo?.private, owner, repo]
  )

  const [breadcrumbs, setBreadcrumbs] = useState(base)

  const addBreadcrumb = useCallback(
    (crumbs = []) => {
      setBreadcrumbs(() => {
        const breadCrumbUpdate = [...base]
        breadCrumbUpdate.push(...crumbs)
        return breadCrumbUpdate
      })
    },
    [base]
  )

  const breadcrumbSetters = useMemo(() => ({ addBreadcrumb }), [addBreadcrumb])

  return (
    <RepoBreadcrumbContext.Provider value={breadcrumbs}>
      <RepoBreadcrumbSettersContext.Provider value={breadcrumbSetters}>
        {children}
      </RepoBreadcrumbSettersContext.Provider>
    </RepoBreadcrumbContext.Provider>
  )
}

export function useCrumbs() {
  return useContext(RepoBreadcrumbContext)
}

export function useSetCrumbs() {
  return useContext(RepoBreadcrumbSettersContext).addBreadcrumb
}

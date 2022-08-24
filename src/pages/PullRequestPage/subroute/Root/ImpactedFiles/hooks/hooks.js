import isEqual from 'lodash/isEqual'
import { useCallback, useState } from 'react'
import { useParams } from 'react-router-dom'

import { useImpactedFilesComparison } from 'services/pull'

const orderingDirection = Object.freeze({
  desc: 'DESC',
  asc: 'ASC',
})

const orderingParameter = Object.freeze({
  name: 'HEAD_NAME',
  change: 'CHANGE_COVERAGE',
})

function getFilters({ sortBy }) {
  return {
    ordering: {
      direction: sortBy?.desc ? orderingDirection.desc : orderingDirection.asc,
      parameter: orderingParameter[sortBy?.id],
    },
  }
}

export function useImpactedFilesTable({ options }) {
  const { provider, owner, repo, pullId } = useParams()
  const [sortBy, setSortBy] = useState([])
  const filters = getFilters({ sortBy: sortBy[0] })

  const { data, isLoading } = useImpactedFilesComparison({
    provider,
    owner,
    repo,
    pullId,
    filters,
    ...options,
  })

  const handleSort = useCallback(
    (tableSortBy) => {
      if (!isEqual(sortBy, tableSortBy)) {
        setSortBy(tableSortBy)
      }
    },
    [sortBy]
  )

  return { data, isLoading, handleSort }
}

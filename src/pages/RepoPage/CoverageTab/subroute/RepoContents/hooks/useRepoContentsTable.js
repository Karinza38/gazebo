import isEqual from 'lodash/isEqual'
import { useCallback, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'

import { useLocationParams } from 'services/navigation'
import { useRepoContents, useRepoOverview } from 'services/repo'
import { SortingDirection } from 'ui/Table/constants'

import CoverageEntry from '../TableEntries/CoverageEntry'
import DirEntry from '../TableEntries/DirEntry'
import FileEntry from '../TableEntries/FileEntry'

function createTableData({ tableData, branch, path, isSearching, filters }) {
  return tableData?.length > 0
    ? tableData.map(
        ({
          name,
          percentCovered,
          __typename,
          path: filePath,
          isCriticalFile,
          misses,
          partials,
          hits,
          lines,
        }) => ({
          name:
            __typename === 'PathContentDir' ? (
              <DirEntry
                branch={branch}
                name={name}
                path={path}
                filters={filters}
              />
            ) : (
              <FileEntry
                branch={branch}
                filePath={filePath}
                isCriticalFile={isCriticalFile}
                isSearching={isSearching}
                name={name}
                path={path}
              />
            ),
          lines: <>{lines}</>,
          misses: <>{misses}</>,
          hits: <>{hits}</>,
          partials: <>{partials}</>,
          coverage: <CoverageEntry percentCovered={percentCovered} />,
        })
      )
    : []
}

const headers = [
  {
    id: 'name',
    header: 'Files',
    accessorKey: 'name',
    cell: (info) => info.getValue(),
    width: 'w-9/12 min-w-min',
  },
  {
    id: 'lines',
    header: 'Tracked lines',
    accessorKey: 'lines',
    cell: (info) => info.getValue(),
    width: 'w-1/6',
  },
  {
    id: 'hits',
    header: 'Covered',
    accessorKey: 'hits',
    cell: (info) => info.getValue(),
    width: 'w-1/12 min-w-min',
  },
  {
    id: 'partials',
    header: 'Partial',
    accessorKey: 'partials',
    cell: (info) => info.getValue(),
    width: 'w-1/12 min-w-min',
  },
  {
    id: 'misses',
    header: 'Missed',
    accessorKey: 'misses',
    cell: (info) => info.getValue(),
    width: 'w-1/12 min-w-min',
  },
  {
    id: 'coverage',
    header: (
      <span className="flex flex-row-reverse grow text-right">
        file coverage %
      </span>
    ),
    accessorKey: 'coverage',
    cell: (info) => info.getValue(),
    width: 'w-3/12 min-w-min',
  },
]

const defaultQueryParams = {
  search: '',
}

const sortingParameter = Object.freeze({
  name: 'NAME',
  coverage: 'COVERAGE',
  hits: 'HITS',
  misses: 'MISSES',
  partials: 'PARTIALS',
  lines: 'LINES',
})

const getQueryFilters = ({ params, sortBy }) => {
  return {
    ...(params?.search && { searchValue: params.search }),
    ...(sortBy && {
      ordering: {
        direction: sortBy?.desc ? SortingDirection.DESC : SortingDirection.ASC,
        parameter: sortingParameter[sortBy?.id],
      },
    }),
  }
}

function useRepoContentsTable() {
  const { provider, owner, repo, path, branch } = useParams()
  const { params } = useLocationParams(defaultQueryParams)

  const [sortBy, setSortBy] = useState([])

  const { data: repoOverview, isLoadingRepo } = useRepoOverview({
    provider,
    repo,
    owner,
  })
  const { defaultBranch } = repoOverview
  const isSearching = Boolean(params?.search)

  const { data: repoContents, isLoading } = useRepoContents({
    provider,
    owner,
    repo,
    branch: branch || defaultBranch,
    path: path || '',
    filters: getQueryFilters({ params, sortBy: sortBy[0] }),
    suspense: false,
  })

  const data = useMemo(
    () =>
      createTableData({
        tableData: repoContents,
        branch: branch || defaultBranch,
        path,
        isSearching,
        filters: getQueryFilters({ params, sortBy: sortBy[0] }),
      }),
    [repoContents, branch, defaultBranch, path, isSearching, params, sortBy]
  )

  const handleSort = useCallback(
    (tableSortBy) => {
      if (!isEqual(sortBy, tableSortBy)) {
        setSortBy(tableSortBy)
      }
    },
    [sortBy]
  )

  return {
    data,
    headers,
    handleSort,
    isLoading: isLoadingRepo || isLoading,
    isSearching,
  }
}

export default useRepoContentsTable

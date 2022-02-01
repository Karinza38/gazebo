import { useEffect } from 'react'
import { useParams } from 'react-router'
import { useCommits } from 'services/commits'

function useRedirect() {
  const { provider, owner, repo } = useParams()

  return {
    hardRedirect: () => {
      window.location.pathname = `/${provider}/${owner}/${repo}`
    },
  }
}

export function useRedirectToVueOverview({
  noAccessOpenSource,
  missingUploadToken,
}) {
  const { hardRedirect } = useRedirect()
  const { provider, owner, repo } = useParams()
  const { data: commits } = useCommits({ provider, owner, repo })

  useEffect(() => {
    // Let vue handle deactivated repos
    if (Array.isArray(commits) && commits?.length > 0) {
      hardRedirect()
    }
    // Open source repo not yet set up cannot be set up by a user not part of the org (dont expose token)
    if (noAccessOpenSource) {
      hardRedirect()
    }
    // Hopefully not hitting this in prod but just incase
    if (missingUploadToken) {
      hardRedirect()
    }
  }, [hardRedirect, noAccessOpenSource, missingUploadToken, commits])
}

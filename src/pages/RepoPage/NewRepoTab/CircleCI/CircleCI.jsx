import { useParams } from 'react-router-dom'

import patchAndProject from 'assets/repoConfig/patch-and-project.svg'
import { useRepo } from 'services/repo'
import { useOnboardingTracking } from 'services/user'
import { providerToInternalProvider } from 'shared/utils/provider'
import A from 'ui/A'
import CopyClipboard from 'ui/CopyClipboard'

const orbsString = 'orbs:\n codecov/codecov@3.2.4'

function CircleCI() {
  const { provider, owner, repo } = useParams()
  const providerName = providerToInternalProvider(provider)
  const { data } = useRepo({ provider, owner, repo })
  const { copiedCIToken } = useOnboardingTracking()

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <div>
          <h2 className="text-base font-semibold">
            Step 1: add repository token to{' '}
            <A
              to={{
                pageName: 'circleCIEnvVars',
                options: { provider: providerName },
              }}
            />
          </h2>
          <p className="text-base">
            Environment variables in CircleCI can be found in project&apos;s
            settings.
          </p>
        </div>
        <pre className="flex items-center gap-2 overflow-auto rounded-md border-2 border-ds-gray-secondary bg-ds-gray-primary px-4 py-2 font-mono">
          CODECOV_TOKEN={data?.repository?.uploadToken}
          <CopyClipboard
            string={data?.repository?.uploadToken}
            onClick={() => copiedCIToken(data?.repository?.uploadToken)}
          />
        </pre>
      </div>
      <div className="flex flex-col gap-3">
        <div className="text-base">
          <h2 className="font-semibold">
            Step 2: add Codecov orb to CircleCI{' '}
            <A
              to={{
                pageName: 'circleCIyaml',
                options: { branch: data?.repository?.defaultBranch },
              }}
            />
          </h2>
          <p>
            Add the following to your .circleci/config.yaml and push changes to
            repository.
          </p>
        </div>
        <div className="flex items-start justify-between overflow-auto whitespace-pre-line rounded-md border-2 border-ds-gray-secondary bg-ds-gray-primary px-4 py-2 font-mono">
          <pre>
            orbs:
            <br />
            &nbsp;&nbsp;codecov/codecov@3.2.4
          </pre>
          <CopyClipboard string={orbsString} />
        </div>
        <small>
          For more, see Codecov specific{' '}
          <A to={{ pageName: 'circleCIOrbs' }} isExternal />
        </small>
      </div>
      <div>
        <p>
          After you committed your changes and ran the repo&apos;s CI/CD
          pipeline. In your pull request, you should see two status checks and
          PR comment.
        </p>
        <img
          alt="codecov patch and project"
          src={patchAndProject}
          className="my-3 md:px-5"
          loading="lazy"
        />
        <p>
          Once merged to the default branch, subsequent pull requests will have
          checks and report comment. Additionally, you&apos;ll find your repo
          coverage dashboard here.
        </p>
        <p className="mt-6 border-l-2 border-ds-gray-secondary pl-4">
          <span className="font-semibold">How was your setup experience?</span>{' '}
          Let us know in{' '}
          <A to={{ pageName: 'repoConfigFeedback' }} isExternal>
            this issue
          </A>
        </p>
      </div>
    </div>
  )
}

export default CircleCI

import { useParams } from 'react-router-dom'

import MyContextSwitcher from 'layouts/MyContextSwitcher'
import { useShouldRenderTabs } from 'services/useShouldRenderTabs'
import TabNavigation from 'ui/TabNavigation'

function Header() {
  const { owner } = useParams()
  const shouldRenderTabs = useShouldRenderTabs()

  return (
    <>
      <MyContextSwitcher pageName="accountAdmin" activeContext={owner} />
      <div className="mt-4 mb-8">
        <TabNavigation
          tabs={[
            { pageName: 'owner', children: 'Repos' },
            { pageName: 'analytics', children: 'Analytics' },
            ...(shouldRenderTabs ? [{ pageName: 'membersTab' }, { pageName: 'planTab' }] : []),
            {
              pageName: 'accountAdmin',
              children: 'Settings',
            },
          ]}
        />
      </div>
    </>
  )
}

export default Header

import { useState } from 'react';

import PhoneShell from './components/layout/PhoneShell';
import DynamicIsland from './components/layout/DynamicIsland';
import StatusBar from './components/layout/StatusBar';
import TopNav from './components/layout/TopNav';
import BottomNav from './components/layout/BottomNav';

import ExploreScreen from './screens/ExploreScreen';
import NewsScreen from './screens/NewsScreen';
import ForumScreen from './screens/ForumScreen';
import SearchScreen from './screens/SearchScreen';
import MySpaceScreen from './screens/MySpaceScreen';

const SCREENS = {
  explore: ExploreScreen,
  news:    NewsScreen,
  forums:  ForumScreen,
  search:  SearchScreen,
  myspace: MySpaceScreen,
};

export default function App() {
  const [activeTab, setActiveTab] = useState('explore');
  const ActiveScreen = SCREENS[activeTab];

  return (
    <PhoneShell>
      <DynamicIsland />
      <StatusBar />
      <TopNav />
      <ActiveScreen />
      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
    </PhoneShell>
  );
}

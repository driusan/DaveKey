import {PaginatedPostList} from './PaginationMenu';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import {reuseableActionsStack} from './actionsStack';

const Stack = createNativeStackNavigator();

export function BookmarksPage({navigation, route}) {
  return (
    <Stack.Navigator screenOptions={{}}>
      <Stack.Screen name="Bookmarks Page" component={RealBookmarksPage} />
      {reuseableActionsStack()}
    </Stack.Navigator>
  );

}
function RealBookmarksPage({navigation, route}) {
    return <PaginatedPostList 
            endpoint="i/favorites"
            extractNote={ (json) => json.note }
            emptyMsg={"Nothing bookmarked"}
        />;
}

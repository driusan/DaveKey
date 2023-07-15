import {PaginatedPostList} from './PaginationMenu';

export function BookmarksPage({navigation, route}) {
    return <PaginatedPostList 
            endpoint="i/favorites"
            extractNote={ (json) => json.note }
            emptyMsg={"Nothing bookmarked"}
        />;
}

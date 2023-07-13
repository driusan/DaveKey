import { useState, useEffect, useContext } from 'react';
import {AccountContext } from './Account';

export function useAPI() {
  const account = useContext(AccountContext);
  return { 
    call: account.api,
  };
}
export function useAPIPaginator(endpoint, params) {
  const api = useAPI();
  const [data, setData] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshNo, setRefreshNo] = useState(0);

  const loadMore = (since, until) => {
      if (!api) {
          return;
      }
      const newParams = {...params};
      if (until) {
          newParams['untilId'] = until;
      }
      if (since) {
          newParams['sinceId'] = since;
      }
      console.log('loading more', newParams);
      api.call(endpoint, newParams)
        .then( (json) => {
          if (json.error) {
              throw new Error(json);
          }
          if (until !== null) {
              setData([...data, ...json]);
          } else if (since !== null) {
              setData([...json, ...data]);
          } else {
              setData([...json]);
          }

          setRefreshing(false);
          return Promise.resolve(data);
      }).catch( (e) => {
          setRefreshing(false);
          console.error('error loading ', refreshNo);
          console.error(e)
      });
  }
  useEffect( () => {
      loadMore(null, null);
  }, [endpoint, refreshNo]);

  return {
      data: data,
      isRefreshing: refreshing,
      refresh: () => {
          setRefreshNo(refreshNo+1);
      },
      moreBefore: () => {
        if (data) {
            console.log('More beforing');
              // return loadMore(data[0].id, null);
              return loadMore(null, data[0].id);
        }
        console.log('More before nothing');
        return Promise.resolve(null);
      },
      moreAfter: () => {
        if (data) {
          console.log(data[data.length-1].id);
          return loadMore(null, data[data.length-1].id);
        }
        return Promise.resolve(null);
      }
  };
}

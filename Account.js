import {useState,useEffect, createContext } from 'react';
import * as SecureStore from 'expo-secure-store';

export const AccountContext = createContext(null);

export function useCalckeyAccount() {
  const [accessToken, setAccessToken] = useState(null);
  const [instance, setInstance] = useState('');
  const [accountInfo, setAccountInfo] = useState(null);
  useEffect(() => {
      SecureStore.getItemAsync('i').then( (val) => {
          setAccessToken(val);
      });
      SecureStore.getItemAsync('instance').then( (val) => {
          setInstance(val);
      });
  }, []);
  useEffect(() => {
      // Fetch profile info after login
      if (!accessToken || !instance) {
          return;
      }
      const url = 'https://' + instance + "/api/i";
      fetch(url,
      {
          method: 'POST',
          headers: {
              Accept: 'application/json',
              'Content-Type': 'application/json',
          },
          credentials: "omit",
          body: JSON.stringify({i: accessToken})
      }).then(
        async (resp) => {
            const text = await resp.text();
            try {
                return JSON.parse(text);
            } catch (e) {
                throw new Error("Response code for " + url + " was " + resp.status + " could not parse " + text);
            }
        }
      ).then( (json) => {
          if (json.error) {
              throw new Error(json);
          }
          setAccountInfo(json);
          console.log('Loaded', url);
      }).catch( (e) => {
          console.error('error loading ', url);
          console.error(e)
      });
  }, [instance, accessToken]);
  return {
      i: accessToken,
      instance: instance,
      accountInfo: accountInfo,
      mentionName: () => {
          if (!accountInfo) {
              return '';
          }
          return '@' + accountInfo.username + '@' + instance;
      },
      login: (i, instance) => {
          setInstance(instance);
          setAccessToken(i);
          SecureStore.setItemAsync('i', i);
          SecureStore.setItemAsync('instance', instance);
      },
      logout: () => {
          setAccessToken(null);
          setInstance('');
          SecureStore.deleteItemAsync('i');
          SecureStore.deleteItemAsync('instance');
      },
      api: (endpoint, params) => {
        if (!instance) {
            return new Promise( () => {});
            // throw new Error('No instance');
        }
        const url = 'https://' + instance + '/api/' + endpoint;
        const newParams = {
            i: accessToken, 
            ...params,
        };
        console.log('api', url);
        return fetch(url, {
          method: 'POST',
          headers: {
              Accept: 'application/json',
              'Content-Type': 'application/json',
          },
          credentials: "omit",
          body: JSON.stringify(newParams)
        }).then(
            async (resp) => {
                if (resp.status == 204) {
                    return {};
                }
                const text = await resp.text();
                try {
                    const json = JSON.parse(text);
                    if (!resp.ok) {
                        throw new Error('Received status code ' + resp.status + ' for ' + endpoint + ': ' + (json ? json.error : text));
                    }
                    return json;
                } catch (e) {
                    throw new Error('Received status code ' + resp.status + ' for ' + endpoint + ': ' + text);
                }
            }
        ).then(
            (json) => {
                if (json.error) {
                    throw new Error(json.error);
                }
                return json;
        });
    }
  };
}
